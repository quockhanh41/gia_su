# 🔧 Troubleshooting: SMTP Connection Timeout trên Render

## 🚨 Vấn Đề

Khi deploy lên Render.com, bạn gặp lỗi:

```
Lỗi gửi email: Error: Connection timeout
code: 'ETIMEDOUT',
command: 'CONN'
```

## 📋 Nguyên Nhân

Render.com **BLOCK port 465 (SMTP SSL)** trên free tier để tránh spam. Đây là chính sách của hầu hết các free hosting platforms.

## ✅ Giải Pháp 1: Dùng Port 587 (TLS) - ĐÃ TRIỂN KHAI

### Đã cập nhật trong server.js:

```javascript
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,              // ✅ TLS port (không bị block)
  secure: false,          // ✅ false = TLS
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false,
  },
  connectionTimeout: 60000, // ✅ 60 giây
  greetingTimeout: 30000,
  socketTimeout: 60000,
  pool: true,              // ✅ Reuse connections
  maxConnections: 5,
  logger: false,
  debug: false,
});
```

### Retry Logic:

Hàm `sendEmail()` giờ có retry với exponential backoff:
- 3 lần thử
- Verify SMTP connection trước khi gửi
- Tự động retry nếu timeout
- Delay tăng dần: 2s → 4s → 8s

## ✅ Giải Pháp 2: Kiểm Tra Environment Variables

### Trên Render Dashboard:

1. Vào **Dashboard** → Chọn service `gia-su-app`
2. Tab **Environment** → Kiểm tra 3 biến:

```env
EMAIL_USER = ssquockhanh@gmail.com
EMAIL_PASS = xxxx xxxx xxxx xxxx (16 ký tự)
GOOGLE_MAPS_API_KEY = AIza...
```

⚠️ **QUAN TRỌNG**: 
- `EMAIL_PASS` phải là **Gmail App Password** (16 ký tự), KHÔNG phải password thường
- Lấy tại: https://myaccount.google.com/apppasswords
- Không có khoảng trắng thừa

### Test Environment Variables:

Thêm endpoint test vào `server.js`:

```javascript
app.get("/test-email", async (req, res) => {
  console.log("EMAIL_USER:", process.env.EMAIL_USER ? "✓ Set" : "✗ Not set");
  console.log("EMAIL_PASS:", process.env.EMAIL_PASS ? "✓ Set" : "✗ Not set");
  
  try {
    await transporter.verify();
    res.json({ 
      status: "success", 
      message: "SMTP connection OK ✓",
      user: process.env.EMAIL_USER
    });
  } catch (error) {
    res.status(500).json({ 
      status: "error", 
      message: error.message,
      code: error.code
    });
  }
});
```

Sau đó test: `https://your-app.onrender.com/test-email`

## ✅ Giải Pháp 3: Enable Debug Logs

### Bật logging để debug:

Trong `server.js`, tìm:

```javascript
logger: false,
debug: false,
```

Sửa thành:

```javascript
logger: true,
debug: true,
```

### Xem logs trên Render:

1. Dashboard → Service → Tab **Logs**
2. Tìm dòng:
   - `SMTP connection verified ✓` = Thành công
   - `Lỗi gửi email (lần 1/3)` = Đang retry
   - `Connection timeout` = Vẫn lỗi

## ✅ Giải Pháp 4: Alternative - SendGrid (Nếu vẫn timeout)

SendGrid có free tier **100 emails/ngày** và không bị block trên Render.

### Bước 1: Đăng ký SendGrid

1. Truy cập: https://signup.sendgrid.com
2. Đăng ký free plan
3. Verify email
4. Tạo API Key: Settings → API Keys → Create API Key

### Bước 2: Cài đặt package

```bash
npm install @sendgrid/mail
```

### Bước 3: Cập nhật server.js

```javascript
// Thêm ở đầu file
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Thay thế hàm sendEmail
async function sendEmail(content, email, retries = 3) {
  const msg = {
    to: email,
    from: process.env.EMAIL_USER, // Must be verified sender
    subject: 'Tìm thấy lớp phù hợp!',
    text: content,
  };

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await sgMail.send(msg);
      console.log(`Email đã gửi đến ${email} qua SendGrid`);
      return true;
    } catch (error) {
      console.error(`Lỗi SendGrid (lần ${attempt}/${retries}):`, error.message);
      if (attempt < retries) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      } else {
        return false;
      }
    }
  }
}
```

### Bước 4: Thêm Environment Variable

Trên Render Dashboard:
- Key: `SENDGRID_API_KEY`
- Value: `SG.xxxx...` (từ SendGrid dashboard)

### Bước 5: Verify Sender

1. Vào SendGrid → Settings → Sender Authentication
2. Verify email `ssquockhanh@gmail.com` (hoặc domain)
3. Check email và click link xác nhận

## ✅ Giải Pháp 5: Mailgun (Alternative khác)

Free tier: **100 emails/ngày** (validation-only không giới hạn)

### Setup:

```bash
npm install mailgun.js form-data
```

```javascript
const formData = require('form-data');
const Mailgun = require('mailgun.js');
const mailgun = new Mailgun(formData);
const mg = mailgun.client({
  username: 'api',
  key: process.env.MAILGUN_API_KEY
});

async function sendEmail(content, email) {
  try {
    const msg = await mg.messages.create('sandbox-xxx.mailgun.org', {
      from: `Gia Su <mailgun@sandbox-xxx.mailgun.org>`,
      to: email,
      subject: 'Tìm thấy lớp phù hợp!',
      text: content
    });
    console.log('Email sent via Mailgun:', msg.id);
    return true;
  } catch (error) {
    console.error('Mailgun error:', error);
    return false;
  }
}
```

## 🔍 Checklist Debug

- [ ] Port 587 (không phải 465)
- [ ] `secure: false` với TLS
- [ ] Gmail App Password (16 ký tự)
- [ ] Environment variables đã set đúng
- [ ] `connectionTimeout: 60000` (60 giây)
- [ ] Retry logic đã implement
- [ ] Test `/test-email` endpoint
- [ ] Check Render logs
- [ ] Nếu vẫn lỗi → Chuyển sang SendGrid/Mailgun

## 📊 So Sánh Solutions

| Method | Free Tier | Pros | Cons |
|--------|-----------|------|------|
| **Gmail SMTP + Port 587** | 500/ngày | Đơn giản, quen thuộc | Có thể timeout trên Render |
| **SendGrid** | 100/ngày | Reliable, dashboard tốt | Cần verify sender |
| **Mailgun** | 100/ngày | Có sandbox domain | Hơi phức tạp setup |

## 🎯 Khuyến Nghị

1. **Thử port 587 trước** (đã implement)
2. Check environment variables
3. Test với `/test-email` endpoint
4. Nếu vẫn timeout sau 3-4 deploys → **Chuyển sang SendGrid**

SendGrid reliable hơn cho production và không bị các hosting platforms block.

## 📝 Quick Fix Commands

```bash
# 1. Pull latest code với fix
git pull origin main

# 2. Redeploy trên Render (auto)
# Hoặc manual: Dashboard → Manual Deploy

# 3. Test SMTP connection
curl https://your-app.onrender.com/test-email

# 4. Check logs
# Dashboard → Logs → Tìm "SMTP connection verified"

# 5. Nếu vẫn lỗi, install SendGrid
npm install @sendgrid/mail
git add package.json package-lock.json
git commit -m "Add SendGrid as email provider"
git push origin main
```

## 🆘 Vẫn Lỗi?

### Option A: Temporary disable email

Comment out sendEmail calls trong `server.js` để app chạy bình thường:

```javascript
if (mathClass.length > 0) {
  // await sendEmail(mathClass.join("\n\n"), "quockhanh4104.kn@gmail.com");
  console.log("Found", mathClass.length, "math classes (email disabled)");
}
```

### Option B: Switch to SendGrid immediately

Follow "Giải Pháp 4" ở trên.

### Option C: Use Render.com support

Free plans có limited support, nhưng có thể ticket về SMTP:
https://render.com/docs/troubleshooting-deploys

---

**Recommended**: Sau khi apply fix port 587, wait 5 phút và check logs. Nếu thấy "SMTP connection verified ✓" = success!
