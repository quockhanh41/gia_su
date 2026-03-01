# Checklist Deploy

## ✅ Cần làm trước khi deploy:

### 1. File .gitignore
```
node_modules/
.env
.DS_Store
```

### 2. Environment Variables cần set trên platform:
- EMAIL_USER=ssquockhanh@gmail.com
- EMAIL_PASS=xwquttdexsiqsqnx
- GOOGLE_MAPS_API_KEY=your_api_key_here

### 3. Kiểm tra package.json
- ✅ Có script "start": "node server.js"
- ✅ Tất cả dependencies đã được list

### 4. Code đã sửa:
- ✅ PORT dùng process.env.PORT || 3000

### 5. Test local:
```bash
npm install
npm start
# Kiểm tra http://localhost:3000
```

## 🚀 Platform Recommendations:

### Railway.app (Khuyên dùng)
- ✅ Không sleep
- ✅ Dễ dùng nhất
- ✅ 500 giờ/tháng free
- 👉 https://railway.app

### Render.com
- ⚠️ Sleep sau 15 phút
- ✅ Unlimited hours
- Cần ping định kỳ để không sleep
- 👉 https://render.com

### Fly.io
- ✅ Không sleep
- ✅ 3 VMs free
- Cần cài CLI
- 👉 https://fly.io

## 📝 Sau khi deploy:

1. Kiểm tra logs xem app có chạy OK không
2. Test endpoint /classes để xem có data không
3. Đợi 3 phút xem có crawl data và gửi email không
4. Monitor trong 1 ngày đầu

## 🔧 Troubleshooting:

### App crash ngay sau khi start:
- Kiểm tra logs
- Đảm bảo tất cả env vars đã được set
- Test lại local trước

### Không nhận được email:
- Kiểm tra EMAIL_USER và EMAIL_PASS
- Gmail có thể block, cần enable "Less secure app access"
- Hoặc dùng App Password thay vì password thường

### Memory/CPU limit:
- Free tier có giới hạn
- Giảm interval từ 3 phút lên 5-10 phút
- Tắt logging không cần thiết
