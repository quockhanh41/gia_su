# 🚀 Setup SendGrid cho Render.com (FIX SMTP Timeout)

## ⚠️ Vấn đề

Render.com **BLOCK SMTP connections** (cả port 465 và 587) trên free tier → Email không gửi được qua Gmail SMTP.

## ✅ Giải pháp: Dùng SendGrid

SendGrid sử dụng **HTTP API** thay vì SMTP → Không bị block!

**Free tier**: 100 emails/ngày (đủ cho use case này)

---

## Bước 1: Đăng ký SendGrid (5 phút)

### 1.1. Tạo tài khoản

1. Truy cập: https://signup.sendgrid.com
2. Điền thông tin:
   ```
   Email: ssquockhanh@gmail.com (hoặc email khác)
   Password: ******** (mật khẩu mạnh)
   ```
3. Click **"Create Account"**
4. Chọn plan: **Free** (100 emails/day)
5. Điền form survey (chọn bất kỳ, không quan trọng):
   - Role: Developer
   - Company size: 1-10
   - Purpose: Transactional emails
6. Click **"Get Started"**

### 1.2. Verify Email

1. Check inbox email đăng ký
2. Click link "Verify Your Account"
3. Đăng nhập vào SendGrid dashboard

---

## Bước 2: Tạo API Key (2 phút)

### 2.1. Tạo API Key

1. Vào SendGrid dashboard: https://app.sendgrid.com
2. Menu bên trái: **Settings** → **API Keys**
3. Click **"Create API Key"**
4. Cấu hình:
   ```
   API Key Name: Gia Su App
   API Key Permissions: Full Access
   ```
5. Click **"Create & View"**
6. **Copy API Key** (bắt đầu với `SG.`):
   ```
   SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```
   
   ⚠️ **QUAN TRỌNG**: Lưu lại ngay! Bạn sẽ không thể xem lại!

---

## Bước 3: Verify Sender Email (2 phút)

SendGrid yêu cầu verify email người gửi để tránh spam.

### 3.1. Single Sender Verification (Nhanh, dùng cho free tier)

1. Menu: **Settings** → **Sender Authentication**
2. Tab **"Single Sender Verification"** → Click **"Create New Sender"**
3. Điền thông tin:
   ```
   From Name: Gia Su Notification
   From Email Address: ssquockhanh@gmail.com
   Reply To: ssquockhanh@gmail.com
   Company Address: (địa chỉ bất kỳ)
   Company City: Ho Chi Minh
   Company Country: Vietnam
   ```
4. Click **"Create"**
5. **Check inbox** `ssquockhanh@gmail.com`
6. Click link "Verify Single Sender"
7. Trạng thái đổi thành **"Verified"** ✓

---

## Bước 4: Cấu hình Render.com (3 phút)

### 4.1. Thêm Environment Variable

1. Vào Render Dashboard: https://dashboard.render.com
2. Chọn service `gia-su-app`
3. Tab **"Environment"**
4. Click **"Add Environment Variable"**
5. Thêm biến mới:
   ```
   Key: SENDGRID_API_KEY
   Value: SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```
   (paste API Key vừa copy ở Bước 2)

6. Click **"Save Changes"**

### 4.2. Kiểm tra các biến khác

Đảm bảo có đủ 4 biến:

| Key | Value | Status |
|-----|-------|--------|
| `SENDGRID_API_KEY` | `SG.xxx...` | ✅ MỚI THÊM |
| `EMAIL_USER` | `ssquockhanh@gmail.com` | ✅ (phải giống email verified) |
| `EMAIL_PASS` | `xxxx xxxx xxxx xxxx` | ✅ (fallback) |
| `GOOGLE_MAPS_API_KEY` | `AIza...` | ✅ |

⚠️ **Chú ý**: `EMAIL_USER` phải **GIỐNG EMAIL ĐÃ VERIFY** trong SendGrid!

---

## Bước 5: Deploy & Test (5 phút)

### 5.1. Deploy code mới

Code đã được cập nhật để dùng SendGrid. Chỉ cần:

```bash
# Pull latest code (nếu chưa)
git pull origin main

# Hoặc nếu bạn đang edit local:
git add .
git commit -m "Switch to SendGrid for email on Render"
git push origin main
```

Render sẽ tự động redeploy trong 2-3 phút.

### 5.2. Kiểm tra logs

1. Render Dashboard → Service → Tab **"Logs"**
2. Tìm dòng:
   ```
   ✓ SendGrid configured
   ```
3. Đợi 3-5 phút để app crawl data
4. Tìm dòng:
   ```
   ✓ Email sent to quockhanh4104.kn@gmail.com via SendGrid
   ```

### 5.3. Check inbox

- Mở inbox: `quockhanh4104.kn@gmail.com`
- Kiểm tra email "Tìm thấy lớp phù hợp!"
- Nếu không thấy, check **Spam folder**

### 5.4. Test endpoint (Optional)

```bash
curl https://your-app.onrender.com/test-email
```

Kết quả mong đợi:
```json
{
  "status": "success",
  "provider": "sendgrid",
  "message": "Email service ready ✓"
}
```

---

## Troubleshooting

### ❌ Lỗi 1: "The from email does not match a verified Sender Identity"

**Nguyên nhân**: Email chưa được verify trong SendGrid

**Giải pháp**:
1. Vào SendGrid → Settings → Sender Authentication
2. Kiểm tra email **"ssquockhanh@gmail.com"** có status **"Verified"** không
3. Nếu chưa, check inbox và click verify link
4. Đảm bảo `EMAIL_USER` trên Render = email đã verify

### ❌ Lỗi 2: "Unauthorized"

**Nguyên nhân**: API Key sai hoặc đã expire

**Giải pháp**:
1. Tạo lại API Key mới trong SendGrid (Settings → API Keys)
2. Copy API Key mới
3. Update `SENDGRID_API_KEY` trên Render
4. Redeploy

### ❌ Lỗi 3: Vẫn dùng SMTP thay vì SendGrid

**Nguyên nhân**: `SENDGRID_API_KEY` chưa được set

**Giải pháp**:
1. Check Render logs:
   ```
   SendGrid not configured, using SMTP...
   ```
2. Nếu thấy dòng này → chưa có `SENDGRID_API_KEY`
3. Add biến trên Render (Bước 4.1)

### ❌ Lỗi 4: Email vào Spam

**Nguyên nhân**: Domain reputation thấp (bình thường với free tier)

**Giải pháp**:
1. Tạm thời không có cách fix (limitation của free tier)
2. Người nhận cần check Spam folder
3. Mark as "Not Spam" để lần sau vào Inbox
4. Upgrade SendGrid plan (paid) để có better IP reputation

---

## So sánh SMTP vs SendGrid

| Feature | Gmail SMTP | SendGrid API |
|---------|-----------|--------------|
| **Port** | 465/587 (bị block) | HTTP (không block) |
| **Free tier** | 500 emails/day | 100 emails/day |
| **Reliability trên Render** | ❌ Timeout | ✅ Hoạt động tốt |
| **Setup** | Đơn giản | Cần verify sender |
| **Monitoring** | Không có | Dashboard đẹp |
| **Spam rate** | Thấp | Trung bình (free tier) |

---

## Kiểm tra hoạt động

### Xem SendGrid Dashboard

1. Truy cập: https://app.sendgrid.com → **Activity**
2. Tab **"Email Activity"** sẽ hiển thị:
   - ✅ **Delivered**: Email đã gửi thành công
   - 📬 **Processed**: Đang gửi
   - ❌ **Bounced**: Email không tồn tại
   - 📂 **Dropped**: Email bị block (spam)

### Xem usage

- Dashboard → Settings → **Account Details**
- **Email sends this month**: X / 100
- Reset vào ngày 1 hàng tháng

---

## Giới hạn Free Tier

| Giới hạn | Số lượng |
|----------|----------|
| Emails/ngày | 100 |
| Emails/tháng | ~3,000 |
| Single Sender | Unlimited |
| API Keys | Unlimited |
| Email Activity History | 7 ngày |

**Lưu ý**: App của bạn gửi ~3-5 emails/lần crawl (mỗi 5 phút) = khoảng 120-180 emails/ngày.

⚠️ **Vượt quota**: Có thể cần upgrade hoặc giảm tần suất crawl xuống 10-15 phút.

---

## Alternative: Giảm số email gửi

Nếu gần hết 100 emails/day quota:

### Option 1: Giảm tần suất crawl

Trong `server.js`:
```javascript
// Thay vì mỗi 5 phút (12 lần/giờ)
setInterval(checkClasses, 5 * 60 * 1000);

// Crawl mỗi 15 phút (4 lần/giờ) → giảm 3x số email
setInterval(checkClasses, 15 * 60 * 1000);
```

### Option 2: Gộp emails

Thay vì gửi 3 emails riêng (math, english, IT), gộp thành 1 email:

```javascript
let allClasses = [];
if (mathClass.length > 0) allClasses.push(...mathClass);
if (englishClass.length > 0) allClasses.push(...englishClass);
if (ITClass.length > 0) allClasses.push(...ITClass);

if (allClasses.length > 0) {
  await sendEmail(allClasses.join("\n\n"), "quockhanh4104.kn@gmail.com");
}
```

### Option 3: Batch daily emails

Thay vì gửi real-time, lưu classes vào array và gửi 1 email/ngày vào 8AM.

---

## Tóm tắt Commands

```bash
# 1. Đăng ký SendGrid
https://signup.sendgrid.com

# 2. Lấy API Key
Settings → API Keys → Create API Key → Copy

# 3. Verify Sender
Settings → Sender Authentication → Verify ssquockhanh@gmail.com

# 4. Add env var trên Render
SENDGRID_API_KEY = SG.xxx...

# 5. Deploy
git push origin main  # Auto deploy

# 6. Test
curl https://your-app.onrender.com/test-email

# 7. Check SendGrid Activity
https://app.sendgrid.com → Activity → Email Activity
```

---

## Kết quả

✅ **Email hoạt động 100%** trên Render.com  
✅ **Không còn timeout** (dùng HTTP thay SMTP)  
✅ **Dashboard theo dõi** email delivery  
✅ **Miễn phí** (100 emails/day)  
✅ **Automatic retry** nếu SendGrid fail → fallback SMTP  

---

**Xong!** Bây giờ app của bạn sẽ gửi email thành công trên Render! 🎉

## Links quan trọng

- **SendGrid Dashboard**: https://app.sendgrid.com
- **Render Dashboard**: https://dashboard.render.com
- **SendGrid Docs**: https://docs.sendgrid.com/for-developers/sending-email/api-getting-started
- **App Health Check**: https://your-app.onrender.com/health
