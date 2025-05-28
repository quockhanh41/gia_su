require("dotenv").config();
const express = require("express");
const axios = require("axios");
const nodemailer = require("nodemailer");
const cors = require("cors");
const path = require("path");
const xpath = require("xpath");
const dom = require("xmldom").DOMParser;

// Tắt các cảnh báo xmldom
const parser = new dom({
  locator: {},
  errorHandler: {
    warning: function () {},
    error: function () {},
    fatalError: function () {},
  },
});

class ClassInfo {
  constructor(classID, name, address, schedule, price, condition, fee) {
    this.classID = classID;
    this.name = name;
    this.address = address;
    this.schedule = schedule;
    this.price = price;
    this.condition = condition;
    this.fee = fee;
  }
}

const app = express();
app.use(cors());
app.use(express.json());

const SHEET_URL =
  "https://docs.google.com/document/d/e/2PACX-1vT1YqDoJ6oQo5fuZs-maN6MJ2i82zk_DeX6dW1_S7d5DLgVNHt66Y6QRr3o4qRQK-RsgbdcDqsASJAi/pub";
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
const artClassIDSet = new Set();
let classes = []; // Mảng lưu trữ tất cả các lớp học

// Hàm kiểm tra lớp học và gửi email nếu tìm thấy lớp phù hợp
async function checkClasses() {
  try {
    const response = await axios.get(SHEET_URL);
    const html = response.data;

    // Parse HTML thành DOM với parser đã cấu hình
    const doc = parser.parseFromString(html);

    // Sử dụng XPath để lấy tất cả các đoạn văn bản
    const paragraphs = xpath.select("//p/span/text()", doc);

    let matches = [];
    for (let i = 0; i < paragraphs.length; i++) {
      const text = paragraphs[i].nodeValue.trim();
      if (text) {
        matches.push(text);
      }
    }

    classes = []; // Reset mảng classes
    let mathClass = [];
    let englishClass = [];
    let artClass = [];

    // Xử lý từng lớp học (7 dòng một lớp)
    for (let i = 2; i < matches.length; i += 7) {
      const classInfo = matches.slice(i, i + 7);
      if (classInfo.length < 7) continue; // Bỏ qua nếu không đủ 7 dòng

      const classID = classInfo[0].split(":")[1]?.trim().toLowerCase();
      if (!classID) continue;

      const subject = classInfo[1].toLowerCase();
      const isOnline = classInfo[2].toLowerCase().includes("online");

      // Tạo đối tượng ClassInfo và thêm vào mảng classes
      const newClass = new ClassInfo(
        classID,
        classInfo[1].toLowerCase(),
        classInfo[2].toLowerCase(),
        classInfo[3].toLowerCase(),
        classInfo[4].toLowerCase(),
        classInfo[5].toLowerCase(),
        classInfo[6].toLowerCase()
      );
      classes.push(newClass);

      if (isOnline) {
        if (
          subject.includes("toán") &&
          (subject.includes("lớp 6") || subject.includes("lớp 7")) &&
          !mathClassIDSet.has(classID)
        ) {
          mathClass.push(classInfo.join("\n"));
          mathClassIDSet.add(classID);
        }
        if (
          ((subject.includes("anh") && subject.includes("lớp 12")) ||
            subject.includes("tiếng anh giao tiếp")) &&
          !englishClassIDSet.has(classID)
        ) {
          englishClass.push(classInfo.join("\n"));
          englishClassIDSet.add(classID);
        }
        if (subject.includes("vẽ") && !artClassIDSet.has(classID)) {
          artClass.push(classInfo.join("\n"));
          artClassIDSet.add(classID);
        }
      }
    }

    if (mathClass.length > 0) {
      sendEmail(mathClass.join("\n\n"), "thuy271019@gmail.com");
      // sendEmail(mathClass.join("\n\n"), "quockhanh4104.kn@gmail.com");
      // console.log(mathClass.join("\n\n"));
    }
    if (englishClass.length > 0) {
      sendEmail(englishClass.join("\n\n"), "lylai2001@gmail.com");
      // sendEmail(englishClass.join("\n\n"), "quockhanh4104.kn@gmail.com");
      // console.log(englishClass.join("\n\n"));
    }
    if (artClass.length > 0) {
      // sendEmail(artClass.join("\n\n"), "quockhanh4104.kn@gmail.com");
      // console.log(artClass.join("\n\n"));
    }
    console.log(mathClass.length, englishClass.length, artClass.length);
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
  artClassIDSet.clear();
  res.send("Đã xóa danh sách lớp học!");
});

// Endpoint tìm kiếm lớp học
app.post("/search", (req, res) => {
  const { classID, name, address, schedule, price, condition, fee } = req.body;

  const filteredClasses = classes.filter((cls) => {
    // kiểm tra include cho tất cả các  từ trong classID, name, address, schedule, price, condition, fee có nằm trong cls hay không
    return (
      classID.split(" ").every((id) => cls.classID.includes(id)) &&
      name.split(" ").every((n) => cls.name.includes(n)) &&
      address.split(" ").every((a) => cls.address.includes(a)) &&
      schedule.split(" ").every((s) => cls.schedule.includes(s)) &&
      price.split(" ").every((p) => cls.price.includes(p)) &&
      condition.split(" ").every((c) => cls.condition.includes(c)) &&
      fee.split(" ").every((f) => cls.fee.includes(f))
    );
  });

  res.json(filteredClasses);
});

// Chạy server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server chạy trên http://localhost:${PORT}`);
  // Kiểm tra lớp học mỗi 5 giây
  setInterval(checkClasses, 30 * 1000);
});
