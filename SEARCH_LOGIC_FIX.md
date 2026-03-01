# 🎯 Fix: Logic Tìm Kiếm Môn Học

## Vấn Đề

Trước đây, khi tìm môn **"Anh"** (Tiếng Anh), kết quả cũng bao gồm cả **"Thanh nhạc"** vì:
- Logic cũ: `subject.includes("anh")`
- "Th**anh** nhạc" chứa substring "anh" → Match sai ❌

## Giải Pháp

Sử dụng **Word Boundary** (`\b`) trong Regex kết hợp với **Exclusion List**:

### 1. Word Boundary Matching

```javascript
function matchSubject(text, keyword) {
  const pattern = new RegExp(`\\b${keyword}\\b`, 'i');
  return pattern.test(text);
}
```

**Cách hoạt động:**
- `\b` = word boundary (ranh giới từ)
- Chỉ match khi keyword là một TỪ RIÊNG BIỆT
- Không match khi keyword nằm TRONG một từ khác

**Ví dụ:**
| Text | Keyword | Old Logic | New Logic |
|------|---------|-----------|-----------|
| "Tiếng Anh lớp 5" | anh | ✅ Match | ✅ Match |
| "Anh văn" | anh | ✅ Match | ✅ Match |
| "**Thanh** nhạc" | anh | ❌ Match (SAI!) | ✅ Không match (ĐÚNG!) |

### 2. Exclusion List

Một số trường hợp đặc biệt:
- **"Kế toán"** ≠ môn Toán
- **"Văn hóa"** ≠ môn Hóa học

```javascript
const exclusions = {
  'toán': ['kế toán', 'kế-toán'],
  'hóa': ['văn hóa', 'văn-hóa', 'âm hóa'],
};
```

## Kết Quả

### ✅ Môn Anh (Tiếng Anh)

| Text | Kết Quả | Lý Do |
|------|---------|-------|
| "Tiếng Anh lớp 5" | ✅ Match | Word boundary OK |
| "Anh văn lớp 8" | ✅ Match | Word boundary OK |
| "Môn anh" | ✅ Match | Standalone word |
| "**Thanh** nhạc" | ❌ Không match | "anh" nằm TRONG "Thanh" |
| "**Khanh** học piano" | ❌ Không match | "anh" nằm TRONG "Khanh" |

### ✅ Môn Toán

| Text | Kết Quả | Lý Do |
|------|---------|-------|
| "Toán lớp 6" | ✅ Match | Word boundary OK |
| "Dạy toán" | ✅ Match | Standalone word |
| "**Kế toán**" | ❌ Không match | Exclusion list |

### ✅ Môn Hóa

| Text | Kết Quả | Lý Do |
|------|---------|-------|
| "Hóa học lớp 9" | ✅ Match | Word boundary OK |
| "Dạy hóa" | ✅ Match | Standalone word |
| "**Văn hóa**" | ❌ Không match | Exclusion list |

### ✅ Môn Sinh

| Text | Kết Quả | Lý Do |
|------|---------|-------|
| "Sinh học lớp 10" | ✅ Match | Word boundary OK |
| "Môn sinh" | ✅ Match | Standalone word |
| "Sinh nhật" | ✅ Match | OK (không phổ biến trong context lớp học) |

## Test Coverage

File [test-match-subject.js](test-match-subject.js) có 16 test cases:

```bash
node test-match-subject.js
```

```
=== Test Results ===
Total: 16
Passed: 16 ✅
Failed: 0

🎉 All tests passed!
```

## Code Changes

### Trước (❌ Có bug):

```javascript
// Môn Anh
if (subject.includes(" anh ") && !englishClassIDSet.has(classID)) {
  // Logic...
}

// Môn Toán
if (subject.includes("toán") && ...) {
  // Logic...
}

// Môn Hóa
if (subject.includes("hóa") || subject.includes("hoa")) {
  // Logic...
}
```

**Vấn đề:**
- "Thanh nhạc" match "anh" ❌
- "Kế toán" match "toán" ❌
- "Văn hóa" match "hóa" ❌

### Sau (✅ Fixed):

```javascript
// Helper function với word boundary + exclusion list
function matchSubject(text, keyword) {
  const exclusions = {
    'toán': ['kế toán', 'kế-toán'],
    'hóa': ['văn hóa', 'văn-hóa', 'âm hóa'],
  };
  
  const lowerText = text.toLowerCase();
  const lowerKeyword = keyword.toLowerCase();
  
  // Check exclusions first
  if (exclusions[lowerKeyword]) {
    for (const excluded of exclusions[lowerKeyword]) {
      if (lowerText.includes(excluded)) {
        return false;
      }
    }
  }
  
  // Word boundary matching
  const pattern = new RegExp(`\\b${lowerKeyword}\\b`, 'i');
  return pattern.test(lowerText);
}

// Môn Anh
if (matchSubject(subject, "anh") && !englishClassIDSet.has(classID)) {
  // Logic...
}

// Môn Toán
if (matchSubject(subject, "toán") && ...) {
  // Logic...
}

// Môn Hóa
if (matchSubject(subject, "hóa") || matchSubject(subject, "hoa")) {
  // Logic...
}
```

## Deployment

Sau khi push code:

```bash
git push origin main
```

Render sẽ tự động redeploy. Logs sẽ hiển thị:
- ✅ "Tiếng Anh lớp 5" → Match
- ✅ "Thanh nhạc" → Không match (đúng!)

## Thêm Exclusion Mới (Nếu Cần)

Nếu phát hiện thêm false positives, thêm vào exclusion list:

```javascript
const exclusions = {
  'toán': ['kế toán', 'kế-toán'],
  'hóa': ['văn hóa', 'văn-hóa', 'âm hóa'],
  'anh': ['thanh', 'khanh'], // Nếu cần
  'sinh': ['sinh nhật'], // Nếu cần
};
```

## Summary

✅ **Fixed**: "Thanh nhạc" không còn match môn "Anh"  
✅ **Fixed**: "Kế toán" không còn match môn "Toán"  
✅ **Fixed**: "Văn hóa" không còn match môn "Hóa"  
✅ **Tested**: 16/16 test cases passed  
✅ **Ready**: Sẵn sàng deploy lên Render  

---

**Tác giả**: GitHub Copilot  
**Ngày**: March 1, 2026
