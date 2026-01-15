/**
 * 기존 Gemini File Search Store 목록 확인
 */

import { GoogleGenAI } from "@google/genai";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.error("GEMINI_API_KEY 환경변수가 필요합니다.");
  process.exit(1);
}

async function listStores() {
  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

  console.log("File Search Store 목록 조회 중...\n");

  try {
    const stores = await ai.fileSearchStores.list();

    if (!stores || stores.length === 0) {
      console.log("생성된 Store가 없습니다.");
      return;
    }

    console.log("=== 기존 Store 목록 ===");
    for (const store of stores) {
      console.log(`- ${store.name}`);
      console.log(`  Display Name: ${store.displayName || 'N/A'}`);
      console.log(`  Created: ${store.createTime || 'N/A'}`);
      console.log("");
    }
  } catch (error) {
    console.error("조회 실패:", error.message);
  }
}

listStores();
