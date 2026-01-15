/**
 * Gemini File Search Store 설정 스크립트 (ESM)
 */

import { GoogleGenAI } from "@google/genai";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.error("GEMINI_API_KEY 환경변수가 필요합니다.");
  process.exit(1);
}

async function setupFileSearchStore() {
  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

  console.log("1. FileSearchStore 생성 중...");

  // FileSearchStore 생성
  const fileSearchStore = await ai.fileSearchStores.create({
    config: { displayName: "loan-guides-store" }
  });

  console.log(`   Store 생성됨: ${fileSearchStore.name}`);

  // loan_guides.json 파일 경로
  const filePath = path.join(__dirname, "..", "loan_guides.json");

  if (!fs.existsSync(filePath)) {
    console.error(`파일을 찾을 수 없습니다: ${filePath}`);
    process.exit(1);
  }

  console.log("2. loan_guides.json 업로드 중...");

  // 파일 업로드
  let operation = await ai.fileSearchStores.uploadToFileSearchStore({
    file: filePath,
    fileSearchStoreName: fileSearchStore.name,
    config: {
      displayName: "loan-guides-data",
    }
  });

  console.log("3. 파일 처리 대기 중 (임베딩 생성)...");

  // 작업 완료 대기
  let attempts = 0;
  const maxAttempts = 60;

  while (!operation.done && attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 5000));
    if (operation.name) {
      operation = await ai.operations.get({ operation: operation.name });
    }
    attempts++;
    process.stdout.write(".");
  }
  console.log("");

  if (!operation.done) {
    console.warn("파일 처리 상태 확인 불가 - 계속 진행합니다.");
  }

  console.log("4. 테스트 쿼리 실행...");

  // 테스트 쿼리
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: "OK저축은행 신용대출 조건을 알려줘",
      config: {
        tools: [
          {
            fileSearch: {
              fileSearchStoreNames: [fileSearchStore.name]
            }
          }
        ]
      }
    });

    console.log("\n테스트 응답:");
    console.log(response.text);
  } catch (error) {
    console.log("테스트 쿼리 실패:", error.message);
  }

  console.log("\n5. 완료!");
  console.log("");
  console.log("=== 설정 정보 ===");
  console.log(`FILE_SEARCH_STORE_NAME=${fileSearchStore.name}`);
  console.log("");
  console.log("위 값을 .dev.vars 또는 Cloudflare 환경변수에 추가하세요.");

  return fileSearchStore.name;
}

setupFileSearchStore()
  .then((storeName) => {
    console.log("\n최종 Store 이름:", storeName);
  })
  .catch((error) => {
    console.error("오류 발생:", error);
    process.exit(1);
  });
