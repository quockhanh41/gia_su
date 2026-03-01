# 🚀 Hướng Dẫn Setup Cron-job.org (10 phút)

## Tại sao cần Cron-job.org?

Render.com free tier sẽ **sleep sau 15 phút** không có traffic. Cron-job.org sẽ ping app của bạn mỗi 10 phút để giữ nó luôn hoạt động 24/7.

---

## Bước 1: Đăng ký Cron-job.org (2 phút)

1. **Truy cập**: https://cron-job.org/en/signup/

2. **Điền form đăng ký**:
   ```
   Email: your-email@gmail.com
   Username: your-username
   Password: ********** (mật khẩu mạnh)
   ```

3. **Click "Sign up"**

4. **Kiểm tra email** → Click link xác nhận
   - Nếu không thấy, check **Spam folder**

---

## Bước 2: Tạo Cron Job (3 phút)

### 2.1. Đăng nhập và tạo job

1. Đăng nhập vào https://cron-job.org
2. Click menu **"Cronjobs"** (bên trái)
3. Click nút **"Create cronjob"** (màu xanh)

### 2.2. Cấu hình Tab "General"

```
Title: Keep Gia Su App Alive
```

**URL/Address**:
```
https://YOUR-APP-NAME.onrender.com/health
```

⚠️ **QUAN TRỌNG**: Thay `YOUR-APP-NAME` bằng tên thực tế của app trên Render!

Ví dụ:
- Nếu app của bạn là `https://gia-su-khanh.onrender.com`
- Thì URL sẽ là: `https://gia-su-khanh.onrender.com/health`

### 2.3. Cấu hình Tab "Schedule"

**Chọn preset**:
- Click dropdown "Every X minutes"
- Chọn: **"Every 10 minutes"**

Hoặc **Custom schedule** (nâng cao):
```
*/10 * * * *
```

**Giải thích cron expression**:
```
*/10  *  *  *  *
 │    │  │  │  │
 │    │  │  │  └─ Day of week (0-6, Sunday=0)
 │    │  │  └──── Month (1-12)
 │    │  └─────── Day of month (1-31)
 │    └────────── Hour (0-23)
 └─────────────── Minute (*/10 = every 10 minutes)
```

**Timezone**:
- Chọn: **(GMT+07:00) Bangkok, Hanoi, Jakarta**

### 2.4. Cấu hình Tab "Advanced" (Tùy chọn)

```
Request method: GET
Request timeout: 30 seconds
Redirects: Follow redirects
Expected HTTP status code: 200
```

### 2.5. Lưu và kích hoạt

1. Click nút **"Create cronjob"** (dưới cùng)
2. Đảm bảo cronjob có **icon màu xanh** (active)
   - Nếu màu xám = disabled → Click "Enable"

---

## Bước 3: Kiểm tra hoạt động (5 phút)

### 3.1. Xem execution history

1. Trong danh sách Cronjobs, click vào job `Keep Gia Su App Alive`
2. Tab **"Execution history"** sẽ hiển thị:
   - **Last execution**: Thời gian chạy gần nhất
   - **Status**: ✅ Success (200 OK) hoặc ❌ Failed
   - **Response time**: Thời gian phản hồi (ms)

3. **Chờ 10 phút** để xem lần chạy đầu tiên

### 3.2. Test thủ công

**Option A: Dùng curl**
```bash
curl https://YOUR-APP-NAME.onrender.com/health
```

**Kết quả mong đợi**:
```json
{
  "status": "ok",
  "timestamp": "2026-03-01T10:30:00.000Z",
  "uptime": 123.456,
  "classesCount": 10
}
```

**Option B: Dùng trình duyệt**
- Truy cập: `https://YOUR-APP-NAME.onrender.com/health`
- Phải thấy JSON response như trên

### 3.3. Test Cronjob thủ công

1. Trong Cron-job.org dashboard
2. Click job `Keep Gia Su App Alive`
3. Click nút **"Execute now"** (test ngay)
4. Xem kết quả trong **Execution history**

---

## Bước 4: Monitoring (Tùy chọn)

### 4.1. Email notifications

1. Click vào cronjob
2. Tab **"Notifications"**
3. Chọn:
   - ✅ **"Send email if execution fails"**
   - ✅ **"Send email if execution returns to success"**

### 4.2. Webhook notifications (Nâng cao)

Nếu muốn gửi thông báo đến Discord/Slack:
1. Tab "Notifications" → "Webhooks"
2. Thêm webhook URL của Discord/Slack

---

## Troubleshooting

### ❌ Lỗi 1: Cronjob failed (Status code 503)

**Nguyên nhân**: App đang sleep hoặc chưa deploy xong

**Giải pháp**:
1. Mở trình duyệt, truy cập: `https://YOUR-APP-NAME.onrender.com/health`
2. Chờ 30-60 giây để app wake up
3. Refresh lại
4. Nếu thấy JSON response → OK
5. Cronjob lần sau sẽ thành công

### ❌ Lỗi 2: URL not found (404)

**Nguyên nhân**: URL sai hoặc thiếu `/health`

**Giải pháp**:
1. Kiểm tra URL trên Render Dashboard
2. Format đúng: `https://YOUR-APP-NAME.onrender.com/health`
3. Edit cronjob → Tab "General" → Sửa lại Address

### ❌ Lỗi 3: Timeout (Execution timeout)

**Nguyên nhân**: Server phản hồi chậm

**Giải pháp**:
1. Tăng timeout: Edit cronjob → Tab "Advanced"
2. Request timeout: **60 seconds**
3. Save

### ❌ Lỗi 4: Cronjob không chạy

**Nguyên nhân**: Disabled hoặc schedule sai

**Giải pháp**:
1. Kiểm tra icon cronjob phải là **màu xanh**
2. Click "Edit" → Tab "Schedule"
3. Đảm bảo checkbox **"Enable"** được chọn
4. Verify schedule: `*/10 * * * *`

---

## FAQ

### Q1: Tôi có thể ping nhanh hơn 10 phút không?

**Có!** Cron-job.org free plan cho phép schedule tối thiểu **mỗi 1 phút**:

```
Schedule: */1 * * * * (every minute)
```

Nhưng **không khuyến khích** vì:
- Lãng phí resources
- 10 phút là đủ để giữ app không sleep (Render timeout = 15 phút)

### Q2: Tôi có thể thêm nhiều URL không?

**Có!** Tạo thêm cronjobs cho các endpoints khác:
- `https://YOUR-APP-NAME.onrender.com/classes`
- `https://YOUR-APP-NAME.onrender.com/`

### Q3: Cron-job.org có giới hạn gì không?

**Free plan**: Unlimited cronjobs! 🎉

**Pro plan** ($4.95/tháng):
- Schedule tối thiểu: mỗi 30 giây
- Priority execution
- More log history

### Q4: Tôi có cần pay không?

**KHÔNG!** Free plan là đủ cho use case này.

---

## Tóm Tắt Nhanh ⚡

```bash
# 1. Đăng ký
https://cron-job.org/en/signup/

# 2. Tạo cronjob
Title: Keep Gia Su App Alive
URL: https://YOUR-APP-NAME.onrender.com/health
Schedule: Every 10 minutes (*/10 * * * *)
Timezone: GMT+07:00 Bangkok, Hanoi

# 3. Enable và test
Click "Create cronjob" → Đợi 10 phút → Check execution history

# 4. Verify
curl https://YOUR-APP-NAME.onrender.com/health
```

---

## Kết quả cuối cùng ✨

✅ **App không bao giờ sleep**  
✅ **Ping tự động mỗi 10 phút**  
✅ **Email thông báo nếu lỗi**  
✅ **Hoàn toàn miễn phí**  
✅ **Không cần quản lý gì thêm**  

---

**Done!** Bây giờ app của bạn sẽ chạy 24/7 mà không lo bị sleep! 🚀

## URL Dashboard

- **Cron-job.org**: https://cron-job.org/en/members/jobs/
- **Render Dashboard**: https://dashboard.render.com
- **Your App**: https://YOUR-APP-NAME.onrender.com
- **Health Check**: https://YOUR-APP-NAME.onrender.com/health
