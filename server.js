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
    this.distance = null; // Khoảng cách tính bằng km (chỉ cho offline)
    this.duration = null; // Thời gian di chuyển (chỉ cho offline)
  }
}

const app = express();
app.use(cors());
app.use(express.json());

const SHEET_URL =
  "https://docs.google.com/document/d/e/2PACX-1vT1YqDoJ6oQo5fuZs-maN6MJ2i82zk_DeX6dW1_S7d5DLgVNHt66Y6QRr3o4qRQK-RsgbdcDqsASJAi/pub";

// Địa chỉ gốc để tính khoảng cách
const HOME_ADDRESS = "KTX KHU B, Đ. Mạc Đĩnh Chi, Khu phố Tân Hòa, Dĩ An, Bình Dương";

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
const ITClassIDSet = new Set();
const customClassIDSet = new Set(); // Cho yêu cầu tùy chỉnh: sinh, toán 1-8, hóa 6-11
let classes = []; // Mảng lưu trữ tất cả các lớp học

// Hàm tính khoảng cách sử dụng Google Maps Distance Matrix API
async function calculateDistanceGoogleMaps(destination) {
  if (!process.env.GOOGLE_MAPS_API_KEY) {
    console.warn('Chưa cấu hình GOOGLE_MAPS_API_KEY');
    return null;
  }

  try {
    const url = 'https://maps.googleapis.com/maps/api/distancematrix/json';
    const params = {
      origins: HOME_ADDRESS,
      destinations: destination,
      mode: 'driving',
      language: 'vi',
      key: process.env.GOOGLE_MAPS_API_KEY,
    };

    const response = await axios.get(url, { params });
    
    if (response.data.status === 'OK' && 
        response.data.rows[0]?.elements[0]?.status === 'OK') {
      const element = response.data.rows[0].elements[0];
      return {
        distance: element.distance.text,
        distanceValue: element.distance.value, // meters
        duration: element.duration.text,
        durationValue: element.duration.value, // seconds
      };
    }
    console.warn(`Không thể tính khoảng cách cho: "${destination}"`);
    return null;
  } catch (error) {
    console.error('Lỗi khi tính khoảng cách Google Maps:', error.message);
    return null;
  }
}

// Hàm tính khoảng cách cho các lớp offline trong customClass
async function calculateDistancesForCustomClasses(classList) {
  if (!process.env.GOOGLE_MAPS_API_KEY) {
    console.warn('⚠️  Bỏ qua tính khoảng cách: chưa có GOOGLE_MAPS_API_KEY');
    return classList;
  }

  console.log(`Đang tính khoảng cách cho ${classList.length} lớp custom...`);
  
  const enrichedList = [];
  for (const classText of classList) {
    const lines = classText.split('\n');
    if (lines.length >= 7) {
      const address = lines[2]; // Dòng thứ 3 là địa chỉ
      const isOnline = address.toLowerCase().includes('online');
      
      if (!isOnline) {
        // Tính khoảng cách cho lớp offline
        const distanceInfo = await calculateDistanceGoogleMaps(address);
        if (distanceInfo) {
          const enrichedClass = classText + `\nKhoảng cách: ${distanceInfo.distance} (~${distanceInfo.duration})`;
          enrichedList.push(enrichedClass);
          console.log(`✓ Đã tính khoảng cách: ${distanceInfo.distance}`);
        } else {
          enrichedList.push(classText);
        }
        // Delay tránh rate limit
        await new Promise(resolve => setTimeout(resolve, 200));
      } else {
        // Lớp online - không cần tính khoảng cách
        enrichedList.push(classText);
      }
    } else {
      enrichedList.push(classText);
    }
  }
  
  console.log(`✓ Đã tính xong khoảng cách cho ${enrichedList.length} lớp`);
  return enrichedList;
}

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
    for (let i = 2; i < paragraphs.length; i++) {
      const text = paragraphs[i].nodeValue.trim();
      if (text) {
        matches.push(text);
      }
    }

    classes = []; // Reset mảng classes
    let mathClass = [];
    let englishClass = [];
    let ITClass = [];
    let customClass = []; // Sinh, Toán 1-8, Hóa 6-11 tại HCM/Bình Dương

    // Xử lý từng lớp học (7 dòng một lớp)
    for (let i = 2; i < matches.length; i += 7) {
      const classInfo = matches.slice(i, i + 7);
      if (classInfo.length < 7) continue; // Bỏ qua nếu không đủ 7 dòng
      const classID = classInfo[0].split(":")[1]?.trim().toLowerCase();
      if (!classID) continue;

      const subject = classInfo[1].toLowerCase();
      const address = classInfo[2].toLowerCase();
      const isOnline = address.includes("online");

      // Tạo đối tượng ClassInfo và thêm vào mảng classes
      const newClass = new ClassInfo(
        classID,
        classInfo[1].toLowerCase(),
        address,
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
        
        // Tiếng Anh lớp 1-8
        if (subject.includes(" anh ") && !englishClassIDSet.has(classID)) {
          let matchEnglish = false;
          for (let grade = 1; grade <= 8; grade++) {
            const pattern = new RegExp(`lớp\\s*${grade}(?!\\d)`, 'i');
            if (pattern.test(subject)) {
              matchEnglish = true;
              break;
            }
          }
          if (matchEnglish) {
            englishClass.push(classInfo.join("\n"));
            englishClassIDSet.add(classID);
          }
        }
        
        if (
          (subject.includes("lập trình") ||
            subject.includes("c++") ||
            subject.includes("python") ||
            subject.includes("java") ||
            subject.includes("javascript") ||
            subject.includes("tin")) &&
          !(
            subject.includes("văn phòng") ||
            subject.includes("vp") ||
            subject.includes("excel")
          ) &&
          !ITClassIDSet.has(classID)
        ) {
          ITClass.push(classInfo.join("\n"));
          ITClassIDSet.add(classID);
        }
      }
      
      // Lọc lớp tùy chỉnh: Sinh (mọi cấp), Toán 1-8, Hóa 6-11 tại HCM/Bình Dương
      const isHCMOrBinhDuong = address.includes("hồ chí minh") || 
                                address.includes("hcm") || 
                                address.includes("tp.hcm") ||
                                address.includes("bình dương") ||
                                address.includes("binh duong");
      
      if (isHCMOrBinhDuong && !customClassIDSet.has(classID)) {
        let matchCustom = false;
        
        // Môn Sinh - mọi cấp độ
        if (subject.includes("sinh")) {
          matchCustom = true;
        }
        
        // Toán lớp 1-8
        if (subject.includes("toán")) {
          for (let grade = 1; grade <= 8; grade++) {
            const pattern = new RegExp(`lớp\\s*${grade}(?!\\d)`, 'i');
            if (pattern.test(subject)) {
              matchCustom = true;
              break;
            }
          }
        }
        
        // Hóa lớp 6-11
        if (subject.includes("hóa") || subject.includes("hoa")) {
          for (let grade = 6; grade <= 11; grade++) {
            const pattern = new RegExp(`lớp\\s*${grade}(?!\\d)`, 'i');
            if (pattern.test(subject)) {
              matchCustom = true;
              break;
            }
          }
        }
        
        if (matchCustom) {
          customClass.push(classInfo.join("\n"));
          customClassIDSet.add(classID);
        }
      }
    }

    if (mathClass.length > 0) {
      // sendEmail(mathClass.join("\n\n"), "thuy271019@gmail.com");
      sendEmail(mathClass.join("\n\n"), "quockhanh4104.kn@gmail.com");
      // console.log(mathClass.join("\n\n"));
    }
    if (englishClass.length > 0) {
      // sendEmail(englishClass.join("\n\n"), "baotram10052007@gmail.com");
      sendEmail(englishClass.join("\n\n"), "quockhanh4104.kn@gmail.com");
      // console.log(englishClass.join("\n\n"));
    }
    if (ITClass.length > 0) {
      sendEmail(ITClass.join("\n\n"), "quockhanh4104.kn@gmail.com");
      // console.log(ITClass.join("\n\n"));
    }
    if (customClass.length > 0) {
      // Tính khoảng cách cho các lớp offline trước khi gửi email
      // const enrichedCustomClass = await calculateDistancesForCustomClasses(customClass);
      // sendEmail(enrichedCustomClass.join("\n\n"), "yenngan23092006@gmail.com");
      // sendEmail(enrichedCustomClass.join("\n\n"), "quockhanh4104.kn@gmail.com");
      // console.log(`Đã gửi ${enrichedCustomClass.length} lớp (Sinh/Toán 1-8/Hóa 6-11) đến yenngan23092006@gmail.com`);
    }
    console.log(mathClass.length, englishClass.length, ITClass.length, customClass.length);
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

// Endpoint để lấy tất cả lớp học
app.get("/classes", (req, res) => {
  res.json(classes);
});

// Endpoint để reset danh sách lớp học
app.get("/clear", (req, res) => {
  mathClassIDSet.clear();
  englishClassIDSet.clear();
  ITClassIDSet.clear();
  customClassIDSet.clear();
  res.send("Đã xóa danh sách lớp học!");
});

// Endpoint tìm kiếm lớp học (backward compatible)
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
  // Crawl dữ liệu ngay khi start
  checkClasses();
  // Kiểm tra lớp học mỗi 5 phút
  setInterval(checkClasses, 5 * 60 * 1000);
});
