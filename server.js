const express = require("express");
const axios = require("axios");
const nodemailer = require("nodemailer");
const cors = require("cors");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());

const SHEET_URL = "https://docs.google.com/spreadsheets/u/0/d/e/2PACX-1vSmU6kCer_KFEQzc-HYRLjMEFgO0B2FM3iSa3aXGwqNSQxYhQGJBmzu76Tilx2_jCYIO4k9EpVqOvr1/pubhtml/sheet?headers=false&gid=0";

// Cấu hình email sender
const transporter = nodemailer.createTransport({
    service: "gmail", auth: {
        user: "cineseats@gmail.com", // Thay bằng email của bạn
        pass: "wgidjybtfbxsjqlh", // Thay bằng mật khẩu ứng dụng
    },
});

// Hàm kiểm tra lớp học và gửi email nếu tìm thấy lớp phù hợp
async function checkClasses() {
    try {
        const response = await axios.get(SHEET_URL);
        const html = response.data;

        // Trích xuất dữ liệu từ bảng Google Sheets
        const regex = /<td.*?>(.*?)<\/td>/g;
        const matches = [...html.matchAll(regex)].map((m) => m[1]);


        let results = [];
        for (let i = 0; i < matches.length; i ++) {
            // split matches by "<br>";
            let lop = matches[i].split("<br>");
            if (lop[1].toLowerCase().includes("toán") && lop[1].includes("7")) {
                results.push(lop.join("\n"));
            }
        }
        console.log(results.length);

        if (results.length > 0) {
            sendEmail(results.join("\n"));
        }
    } catch (error) {
        console.error("Lỗi khi lấy dữ liệu:", error);
    }
}

// Hàm gửi email
function sendEmail(content) {
    const mailOptions = {
        from: "cineseats@gmail.com",
        to: "quockhanh4104.kn@gmail.com",
        subject: "Tìm thấy lớp phù hợp!",
        text: `Đã tìm thấy lớp:\n${content}`,
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error("Lỗi gửi email:", error);
        } else {
            console.log("Email đã gửi:", info.response);
        }
    });
}

// Endpoint để phục vụ trang HTML
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

// Chạy server
const PORT = 3000;
app.listen(PORT, () => console.log(`Server chạy trên http://localhost:${PORT}`));

// Kiểm tra lớp học mỗi 5 phút
setInterval(checkClasses, 5 * 60 * 1000);