require("dotenv").config();
const express = require("express");
const axios = require("axios");
// Removed nodemailer -> const nodemailer = require("nodemailer");
const cors = require("cors");
const path = require("path");
const xpath = require("xpath");
const dom = require("xmldom").DOMParser;

const sgMail = require("@sendgrid/mail");
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

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
const HOME_ADDRESS =
  "KTX KHU B, Đ. Mạc Đĩnh Chi, Khu phố Tân Hòa, Dĩ An, Bình Dương";

// Removed nodemailer transporter
// const transporter = nodemailer.createTransport({...});

const mathClassIDSet = new Set();
const englishClassIDSet = new Set();
const ITClassIDSet = new Set();
const customClassIDSet = new Set(); // Cho yêu cầu tùy chỉnh: sinh, toán 1-8, hóa 6-11
let classes = []; // Mảng lưu trữ tất cả các lớp học

// Helper function: Kiểm tra môn học với word boundary để tránh match substring
// VD: "anh" sẽ match "Tiếng Anh" nhưng không match "Thanh nhạc"
// Xử lý các trường hợp đặc biệt như "Kế toán" không match "toán"
function matchSubject(text, keyword) {
  // Danh sách các cụm từ loại trừ (không phải môn học)
  const exclusions = {
    toán: ["kế toán", "kế-toán"],
    hóa: ["văn hóa", "văn-hóa", "âm hóa"],
    // 'sinh': [] // Sinh nhật OK vì không phổ biến trong context lớp học
  };

  // Lowercase để so sánh
  const lowerText = text.toLowerCase();
  const lowerKeyword = keyword.toLowerCase();

  // Kiểm tra các cụm từ loại trừ
  if (exclusions[lowerKeyword]) {
    for (const excluded of exclusions[lowerKeyword]) {
      if (lowerText.includes(excluded)) {
        return false;
      }
    }
  }

  // Kiểm tra word boundary
  const pattern = new RegExp(`\\b${lowerKeyword}\\b`, "i");
  return pattern.test(lowerText);
}

// Hàm tính khoảng cách sử dụng Google Maps Distance Matrix API
async function calculateDistanceGoogleMaps(destination) {
  if (!process.env.GOOGLE_MAPS_API_KEY) {
    console.warn("Chưa cấu hình GOOGLE_MAPS_API_KEY");
    return null;
  }

  try {
    const url = "https://maps.googleapis.com/maps/api/distancematrix/json";
    const params = {
      origins: HOME_ADDRESS,
      destinations: destination,
      mode: "driving",
      language: "vi",
      key: process.env.GOOGLE_MAPS_API_KEY,
    };

    const response = await axios.get(url, { params });

    if (
      response.data.status === "OK" &&
      response.data.rows[0]?.elements[0]?.status === "OK"
    ) {
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
    console.error("Lỗi khi tính khoảng cách Google Maps:", error.message);
    return null;
  }
}

// Hàm tính khoảng cách cho các lớp offline trong customClass
async function calculateDistancesForCustomClasses(classList) {
  if (!process.env.GOOGLE_MAPS_API_KEY) {
    console.warn("⚠️  Bỏ qua tính khoảng cách: chưa có GOOGLE_MAPS_API_KEY");
    return classList;
  }

  console.log(`Đang tính khoảng cách cho ${classList.length} lớp custom...`);

  const enrichedList = [];
  for (const classText of classList) {
    const lines = classText.split("\n");
    if (lines.length >= 7) {
      const address = lines[2]; // Dòng thứ 3 là địa chỉ
      const isOnline = address.toLowerCase().includes("online");

      if (!isOnline) {
        // Tính khoảng cách cho lớp offline
        const distanceInfo = await calculateDistanceGoogleMaps(address);
        if (distanceInfo) {
          const enrichedClass =
            classText +
            `\nKhoảng cách: ${distanceInfo.distance} (~${distanceInfo.duration})`;
          enrichedList.push(enrichedClass);
          console.log(`✓ Đã tính khoảng cách: ${distanceInfo.distance}`);
        } else {
          enrichedList.push(classText);
        }
        // Delay tránh rate limit
        await new Promise((resolve) => setTimeout(resolve, 200));
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
        classInfo[6].toLowerCase(),
      );
      classes.push(newClass);

      if (isOnline) {
        // Toán lớp 6-7 (online)
        if (
          matchSubject(subject, "toán") &&
          (subject.includes("lớp 6") || subject.includes("lớp 7")) &&
          !mathClassIDSet.has(classID)
        ) {
          mathClass.push(classInfo.join("\n"));
          mathClassIDSet.add(classID);
        }

        // Tiếng Anh lớp 1-8 (online)
        if (matchSubject(subject, "anh") && !englishClassIDSet.has(classID)) {
          let matchEnglish = false;
          for (let grade = 1; grade <= 8; grade++) {
            const pattern = new RegExp(`lớp\\s*${grade}(?!\\d)`, "i");
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
      const isHCMOrBinhDuong =
        address.includes("hồ chí minh") ||
        address.includes("hcm") ||
        address.includes("tp.hcm") ||
        address.includes("bình dương") ||
        address.includes("binh duong");

      if (isHCMOrBinhDuong && !customClassIDSet.has(classID)) {
        let matchCustom = false;

        // Môn Sinh - mọi cấp độ
        if (matchSubject(subject, "sinh")) {
          matchCustom = true;
        }

        // Toán lớp 1-8
        if (matchSubject(subject, "toán")) {
          for (let grade = 1; grade <= 8; grade++) {
            const pattern = new RegExp(`lớp\\s*${grade}(?!\\d)`, "i");
            if (pattern.test(subject)) {
              matchCustom = true;
              break;
            }
          }
        }

        // Hóa lớp 6-11
        if (matchSubject(subject, "hóa") || matchSubject(subject, "hoa")) {
          for (let grade = 6; grade <= 11; grade++) {
            const pattern = new RegExp(`lớp\\s*${grade}(?!\\d)`, "i");
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
      await sendEmail(mathClass.join("\n\n"), "quockhanh4104.kn@gmail.com");
      // console.log(mathClass.join("\n\n"));
    }
    if (englishClass.length > 0) {
      // sendEmail(englishClass.join("\n\n"), "baotram10052007@gmail.com");
      await sendEmail(englishClass.join("\n\n"), "quockhanh4104.kn@gmail.com");
      // console.log(englishClass.join("\n\n"));
    }
    if (ITClass.length > 0) {
      await sendEmail(ITClass.join("\n\n"), "quockhanh4104.kn@gmail.com");
      // console.log(ITClass.join("\n\n"));
    }
    if (customClass.length > 0) {
      // Tính khoảng cách cho các lớp offline trước khi gửi email
      // const enrichedCustomClass = await calculateDistancesForCustomClasses(customClass);
      // sendEmail(enrichedCustomClass.join("\n\n"), "yenngan23092006@gmail.com");
      // sendEmail(enrichedCustomClass.join("\n\n"), "quockhanh4104.kn@gmail.com");
      // console.log(`Đã gửi ${enrichedCustomClass.length} lớp (Sinh/Toán 1-8/Hóa 6-11) đến yenngan23092006@gmail.com`);
    }
    console.log(
      mathClass.length,
      englishClass.length,
      ITClass.length,
      customClass.length,
    );
  } catch (error) {
    console.error("Lỗi khi lấy dữ liệu:", error);
  }
}

// Hàm gửi email với retry logic qua SendGrid
async function sendEmail(content, email, retries = 3) {
  const msg = {
    to: email,
    from: process.env.EMAIL_USER, // Phải dùng email đã đăng ký Single Sender Verification trên SendGrid
    subject: "Tìm thấy lớp phù hợp!",
    text: content,
  };

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await sgMail.send(msg);
      console.log(
        `Email đã gửi đến ${email} (via SendGrid) - attempt: ${attempt}`,
      );
      return true;
    } catch (error) {
      console.error(
        `Lỗi gửi email bằng SendGrid (lần ${attempt}/${retries}):`,
        error.message,
      );
      if (error.response) {
        console.error(error.response.body);
      }

      if (attempt < retries) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 10000); // Tối đa delay 10s
        console.log(`Retry sau ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        console.error(
          `Không thể gửi email đến ${email} sau ${retries} lần thử`,
        );
        return false;
      }
    }
  }
}

// Endpoint để phục vụ trang HTML
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Endpoint để lấy tất cả lớp học
app.get("/classes", (req, res) => {
  res.json(classes);
});

// Health check endpoint cho uptime monitoring
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    classesCount: classes.length,
  });
});

// Test Email API endpoint (SendGrid)
app.get("/test-email", async (req, res) => {
  console.log("Testing SendGrid connection/API KEY...");

  if (!process.env.SENDGRID_API_KEY) {
    return res.status(500).json({
      status: "error",
      message: "SENDGRID_API_KEY not found in environment variables",
    });
  }

  const msg = {
    to: process.env.EMAIL_USER, // Tự gửi cho chính mình để test
    from: process.env.EMAIL_USER,
    subject: "Test SendGrid Email Config",
    text: "Nếu bạn nhận được email này, cấu hình SendGrid của bạn đang hoạt động tốt trên Render!",
  };

  try {
    const info = await sgMail.send(msg);
    res.json({
      status: "success",
      message: "SendGrid API call successful ✓ Check your inbox.",
      info: info,
    });
    console.log("✓ SendGrid configuration working successfully");
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message,
      body: error.response ? error.response.body : null,
      help: "Check if the Sender Identity is verified in SendGrid, or check if Render Environment Variable is correct.",
    });
    console.error("✗ SendGrid verification failed:", error.message);
    if (error.response) console.error(error.response.body);
  }
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
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server chạy trên http://localhost:${PORT}`);
  // Crawl dữ liệu ngay khi start
  checkClasses();
  // Kiểm tra lớp học mỗi 5 phút
  setInterval(checkClasses, 5 * 60 * 1000);
});
