# Hướng Dẫn Deploy Lên Render.com và Cấu Hình Auto-Ping

## Bước 1: Chuẩn Bị

### 1.1. Lấy Google Maps API Key
1. Truy cập https://console.cloud.google.com/google/maps-apis
2. Tạo project mới hoặc chọn project có sẵn
3. Bật **Distance Matrix API**
4. Tạo API Key (API & Services → Credentials → Create Credentials)
5. Hạn chế API key (tùy chọn):
   - Application restrictions: HTTP referrers
   - API restrictions: Distance Matrix API

### 1.2. Lấy Gmail App Password
1. Truy cập https://myaccount.google.com/apppasswords
2. Tạo App Password cho ứng dụng "Mail"
3. Lưu lại password 16 ký tự

### 1.3. Cập nhật file .env (LOCAL TESTING)
```env
EMAIL_USER=ssquockhanh@gmail.com
EMAIL_PASS=your_16_character_app_password
GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```

⚠️ **QUAN TRỌNG**: File .env chỉ dùng để test local. KHÔNG commit file này lên GitHub!

## Bước 2: Push Code Lên GitHub

```bash
# Khởi tạo git repository
git init

# Kiểm tra .gitignore đã có .env chưa
cat .gitignore

# Add và commit code
git add .
git commit -m "Initial commit - Gia su app"

# Tạo repository mới trên GitHub (https://github.com/new)
# Sau đó link và push
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/gia_su.git
git push -u origin main
```

## Bước 3: Deploy Lên Render.com

### 3.1. Tạo Web Service
1. Truy cập https://render.com và đăng nhập bằng GitHub
2. Click **"New +"** → **"Web Service"**
3. Connect GitHub repository `gia_su`
4. Cấu hình:
   - **Name**: `gia-su-app` (hoặc tên bạn muốn)
   - **Region**: Singapore (gần VN nhất)
   - **Branch**: `main`
   - **Root Directory**: để trống
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start` (hoặc `node server.js`)
   - **Plan**: Free

### 3.2. Cấu Hình Environment Variables
Trong phần **Environment** → **Add Environment Variable**, thêm 3 biến:

| Key | Value |
|-----|-------|
| `EMAIL_USER` | `ssquockhanh@gmail.com` |
| `EMAIL_PASS` | `your_16_character_app_password` |
| `GOOGLE_MAPS_API_KEY` | `your_google_maps_api_key` |

⚠️ **CHÚ Ý**: Đảm bảo không có khoảng trắng thừa ở đầu/cuối values!

### 3.3. Deploy
1. Click **"Create Web Service"**
2. Đợi 3-5 phút để build và deploy
3. Kiểm tra logs nếu có lỗi
4. URL của bạn sẽ là: `https://gia-su-app.onrender.com`

## Bước 4: Cấu Hình Auto-Ping (Giữ App Luôn Hoạt Động)

Render free tier sẽ **SLEEP SAU 15 PHÚT** không hoạt động. Để tránh điều này, cần ping app mỗi 10 phút.

### Option 1: Cron-job.org (Khuyến nghị) ⭐

#### 4.1. Đăng ký Cron-job.org
1. Truy cập https://cron-job.org/en/signup/
2. Điền thông tin:
   - **Email**: email của bạn
   - **Username**: tên đăng nhập
   - **Password**: mật khẩu mạnh
3. Click **"Sign up"**
4. Xác nhận email (check inbox hoặc spam folder)

#### 4.2. Tạo Cron Job
1. Sau khi đăng nhập, click **"Cronjobs"** trên menu
2. Click **"Create cronjob"**
3. Cấu hình chi tiết:

**Tab "General":**
- **Title**: `Keep Gia Su App Alive`
- **Address**: `https://gia-su-app.onrender.com/health`
  - Thay `gia-su-app` bằng tên app thực tế của bạn trên Render

**Tab "Schedule":**
- Chọn **"Every 10 minutes"**
- Hoặc custom: `*/10 * * * *` (mỗi 10 phút)
- Timezone: **(GMT+07:00) Bangkok, Hanoi, Jakarta**

**Tab "Advanced" (tùy chọn):**
- **Request method**: GET
- **Request timeout**: 30 seconds
- **Redirects**: Follow redirects
- **Expected HTTP status code**: 200

4. Click **"Create cronjob"**

#### 4.3. Xác Nhận Hoạt Động
- Sau khi tạo, bạn sẽ thấy cronjob trong danh sách
- Icon màu xanh = đang active
- Click vào cronjob để xem **"Execution history"**
- Chờ 10 phút và kiểm tra lần chạy đầu tiên

#### 4.4. Kết quả
✅ **App sẽ không bao giờ sleep**  
✅ **Ping mỗi 10 phút** (có thể giảm xuống 5 phút nếu muốn)  
✅ **Xem lịch sử requests** trong dashboard  
✅ **Email thông báo** nếu ping thất bại  

### Option 2: UptimeRobot (Thay thế)

Nếu muốn monitoring chuyên nghiệp hơn:

1. Truy cập https://uptimerobot.com
2. Đăng ký tài khoản miễn phí
3. Click **"+ Add New Monitor"**
4. Cấu hình:
   - **Monitor Type**: HTTP(s)
   - **Friendly Name**: `Gia Su App`
   - **URL**: `https://gia-su-app.onrender.com/health`
   - **Monitoring Interval**: **5 minutes**
5. Click **"Create Monitor"**

**Ưu điểm UptimeRobot:**
- Ping nhanh hơn (5 phút)
- Dashboard đẹp hơn
- Uptime statistics
- Alert qua email/SMS/Slack

**Nhược điểm:**
- Free plan chỉ có 50 monitors

## Bước 5: Kiểm Tra

### 5.1. Test Health Check
```bash
curl https://gia-su-app.onrender.com/health
```

Kết quả mong đợi:
```json
{
  "status": "ok",
  "timestamp": "2026-03-01T10:30:00.000Z",
  "uptime": 123.456,
  "classesCount": 10
}
```

### 5.2. Test Frontend
Truy cập: `https://gia-su-app.onrender.com`

### 5.3. Kiểm tra Logs trên Render
1. Vào Dashboard → `gia-su-app` → **Logs**
2. Kiểm tra:
   - `Server chạy trên http://localhost:XXXX`
   - `Đang crawl dữ liệu...`
   - `Đã tìm thấy X lớp học mới`

## Bước 6: Monitoring

### Kiểm tra email có gửi không
- Đợi 3-5 phút để hệ thống crawl và gửi email
- Check inbox của:
  - quockhanh4104.kn@gmail.com (Toán 6-7, IT)
  - lylai2001@gmail.com (Anh 1-8)
  - yenngan23092006@gmail.com (Custom classes với distance)

### Kiểm tra Cron-job.org Dashboard
- Vào https://cron-job.org → **Cronjobs**
- Xem **Execution history** của job
- Kiểm tra **Last execution**: phải thành công (màu xanh)
- **Next execution**: thời gian chạy tiếp theo
- **Success rate**: nên là 100%

## Troubleshooting

### Lỗi 1: App không start
**Nguyên nhân**: Environment variables chưa đúng
**Giải pháp**: 
- Kiểm tra lại 3 biến: EMAIL_USER, EMAIL_PASS, GOOGLE_MAPS_API_KEY
- Xem Logs trên Render để tìm lỗi cụ thể

### Lỗi 2: Không gửi được email
**Nguyên nhân**: Gmail App Password sai hoặc hết hạn
**Giải pháp**:
- Tạo lại App Password
- Cập nhật lại `EMAIL_PASS` trên Render
- Redeploy app

### Lỗi 3: Distance calculation không hoạt động
**Nguyên nhân**: Google Maps API Key chưa enable Distance Matrix API
**Giải pháp**:
- Vào Google Cloud Console
- Bật Distance Matrix API
- Đợi 1-2 phút để API active

### Lỗi 4: App vẫn sleep
**Nguyên nhân**: Cron-job.org chưa setup đúng hoặc chưa active
**Giải pháp**:
- Vào https://cron-job.org → Cronjobs
- Kiểm tra status của cronjob (phải có icon màu xanh)
- Đảm bảo URL là `https://gia-su-app.onrender.com/health` (đúng tên app)
- Schedule là `*/10 * * * *` (mỗi 10 phút)
- Click "Edit" → Tab "Schedule" → đảm bảo checkbox **"Enable"** được chọn

## Chi Phí

| Dịch Vụ | Free Tier | Giới Hạn |
|---------|-----------|----------|
| **Render.com** | ✅ Free | 750 giờ/tháng, sleep sau 15 phút inactive |
| **Cron-job.org** | ✅ Free | Unlimited cronjobs, ping tối thiểu mỗi 1 phút |
| **Google Maps** | ✅ $200 credit/tháng | 40,000 requests miễn phí |
| **Gmail SMTP** | ✅ Free | 500 emails/ngày |

→ **HOÀN TOÀN MIỄN PHÍ** với setup này!

## Cập Nhật Code

Sau khi sửa code local:
```bash
git add .
git commit -m "Update: mô tả thay đổi"
git push origin main
```

Render sẽ tự động detect và redeploy trong 2-3 phút.

## URL Quan Trọng

- **App URL**: https://gia-su-app.onrender.com
- **Health Check**: https://gia-su-app.onrender.com/health
- **Render Dashboard**: https://dashboard.render.com
- **Cron-job.org Dashboard**: https://cron-job.org/en/members/jobs/

---

## Tóm Tắt Commands

```bash
# 1. Setup local
npm install

# 2. Git setup
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/gia_su.git
git push -u origin main

# 3. Deploy trên Render.com (web UI)
# 4. Setup Cron-job.org ping mỗi 10 phút
#    - URL: https://gia-su-app.onrender.com/health
#    - Schedule: */10 * * * * (every 10 minutes)
# 5. Test
curl https://gia-su-app.onrender.com/health
```

**Xong!** App của bạn sẽ chạy 24/7 và không bao giờ sleep! 🚀
