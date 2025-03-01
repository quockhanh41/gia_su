require("dotenv").config();
const express = require("express");
const axios = require("axios");
const nodemailer = require("nodemailer");
const cors = require("cors");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());

const SHEET_URL =
    "https://docs.google.com/spreadsheets/u/0/d/e/2PACX-1vSmU6kCer_KFEQzc-HYRLjMEFgO0B2FM3iSa3aXGwqNSQxYhQGJBmzu76Tilx2_jCYIO4k9EpVqOvr1/pubhtml/sheet?headers=false&gid=0";

// Cấu hình email sender
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER, // Lấy từ biến môi trường
        pass: process.env.EMAIL_PASS, // Lấy từ biến môi trường
    },
});

const mathClassIDSet = new Set();
const englishClassIDSet = new Set();

// Hàm kiểm tra lớp học và gửi email nếu tìm thấy lớp phù hợp
async function checkClasses() {
    try {
        const response = await axios.get(SHEET_URL);
        const html = response.data;

        // Trích xuất dữ liệu từ bảng Google Sheets
        const regex = /<td.*?>(.*?)<\/td>/g;
        const matches = [...html.matchAll(regex)].map((m) => m[1]);

        let mathClass = [];
        let englishClass = [];

        for (const match of matches) {
            const lop = match.split("<br>");
            if (lop.length < 3) continue; // Tránh lỗi khi dữ liệu không đủ

            const classID = lop[0].split(":")[1]?.trim();
            if (!classID) continue;

            const subject = lop[1].toLowerCase();
            const isOnline = lop[2].toLowerCase().includes("online");

            if (isOnline) {
                if (subject.includes("toán") && (subject.includes("6") || subject.includes("7")) && !mathClassIDSet.has(classID)) {
                    mathClass.push(lop.join("\n"));
                    mathClassIDSet.add(classID);
                }
                if (subject.includes("anh") && !englishClassIDSet.has(classID)) {
                    englishClass.push(lop.join("\n"));
                    englishClassIDSet.add(classID);
                }
            }
        }

        if (mathClass.length > 0) {
            sendEmail(mathClass.join("\n\n"), "thuy271019@gmail.com");
            // sendEmail(mathClass.join("\n\n"), "quockhanh4104.kn@gmail.com");
        }
        if (englishClass.length > 0) {
            sendEmail(englishClass.join("\n\n"), "lylai2001@gmail.com");
            // sendEmail(englishClass.join("\n\n"), "quockhanh4104.kn@gmail.com");
        }
    } catch (error) {
        console.error("Lỗi khi lấy dữ liệu:", error);
    }
}

// Hàm gửi email
function sendEmail(content, email) {
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: "Tìm thấy lớp phù hợp!",
        text: content,
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error("Lỗi gửi email:", error);
        } else {
            console.log(`Email đã gửi đến ${email}:`, info.response);
        }
    });
}

// Endpoint để phục vụ trang HTML
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

// Endpoint để reset danh sách lớp học
app.get("/clear", (req, res) => {
    mathClassIDSet.clear();
    englishClassIDSet.clear();
    res.send("Đã xóa danh sách lớp học!");
});

// Chạy server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server chạy trên http://localhost:${PORT}`));

// Kiểm tra lớp học mỗi 5 giây
setInterval(checkClasses, 5 * 1000);
