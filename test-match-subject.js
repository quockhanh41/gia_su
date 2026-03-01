// Test helper function matchSubject
console.log("=== Test matchSubject function ===\n");

function matchSubject(text, keyword) {
  // Danh sách các cụm từ loại trừ (không phải môn học)
  const exclusions = {
    'toán': ['kế toán', 'kế-toán'],
    'hóa': ['văn hóa', 'văn-hóa', 'âm hóa'],
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
  const pattern = new RegExp(`\\b${lowerKeyword}\\b`, 'i');
  return pattern.test(lowerText);
}

const testCases = [
  // Test môn Anh
  { text: "Tiếng Anh lớp 5", keyword: "anh", expected: true, desc: "Should match 'anh' in 'Tiếng Anh'" },
  { text: "Anh văn lớp 8", keyword: "anh", expected: true, desc: "Should match 'Anh văn'" },
  { text: "Thanh nhạc", keyword: "anh", expected: false, desc: "Should NOT match 'anh' in 'Thanh'" },
  { text: "Môn anh", keyword: "anh", expected: true, desc: "Should match standalone 'anh'" },
  
  // Test môn Toán
  { text: "Toán lớp 6", keyword: "toán", expected: true, desc: "Should match 'Toán'" },
  { text: "Kế toán", keyword: "toán", expected: false, desc: "Should NOT match 'toán' in 'Kế toán'" },
  { text: "Môn toán", keyword: "toán", expected: true, desc: "Should match standalone 'toán'" },
  
  // Test môn Sinh
  { text: "Sinh học lớp 10", keyword: "sinh", expected: true, desc: "Should match 'Sinh học'" },
  { text: "Sinh nhật", keyword: "sinh", expected: true, desc: "Should match 'Sinh' (word boundary OK)" },
  { text: "Họ và tên sinh viên", keyword: "sinh", expected: true, desc: "Should match standalone 'sinh'" },
  
  // Test môn Hóa
  { text: "Hóa học lớp 9", keyword: "hóa", expected: true, desc: "Should match 'Hóa học'" },
  { text: "Văn hóa", keyword: "hóa", expected: false, desc: "Should NOT match 'hóa' in 'Văn hóa'" },
  { text: "Dạy hóa", keyword: "hóa", expected: true, desc: "Should match standalone 'hóa'" },
  
  // Edge cases
  { text: "TIẾNG ANH", keyword: "anh", expected: true, desc: "Case insensitive test" },
  { text: "anh-văn", keyword: "anh", expected: true, desc: "Match with hyphen boundary" },
  { text: "Môn: Anh", keyword: "anh", expected: true, desc: "Match with punctuation" },
];

let passed = 0;
let failed = 0;

testCases.forEach((test, index) => {
  const result = matchSubject(test.text, test.keyword);
  const status = result === test.expected ? "✓ PASS" : "✗ FAIL";
  
  if (result === test.expected) {
    passed++;
  } else {
    failed++;
    console.log(`${status} - Test ${index + 1}: ${test.desc}`);
    console.log(`  Text: "${test.text}"`);
    console.log(`  Keyword: "${test.keyword}"`);
    console.log(`  Expected: ${test.expected}, Got: ${result}\n`);
  }
});

console.log(`\n=== Test Results ===`);
console.log(`Total: ${testCases.length}`);
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);

if (failed === 0) {
  console.log("\n🎉 All tests passed!");
} else {
  console.log(`\n⚠️ ${failed} test(s) failed`);
  process.exit(1);
}
