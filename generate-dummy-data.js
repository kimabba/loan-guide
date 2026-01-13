const fs = require("fs");

// loan_guides.json 읽기
const guides = require("./loan_guides.json");

// 필요한 필드만 추출
const products = guides.slice(0, 100).map((guide, idx) => ({
  item_cd: (idx + 1).toString(),
  pfi_name: guide.pfi_name,
  depth1: guide.depth1,
  depth2: guide.depth2,
  fi_memo: guide.fi_memo || "",
}));

console.log(`총 ${products.length}개 상품 데이터 생성됨`);
console.log("첫 번째 상품:", products[0]);
console.log("\n더미 데이터 배열:");
console.log(JSON.stringify(products, null, 2).substring(0, 1000) + "...");
