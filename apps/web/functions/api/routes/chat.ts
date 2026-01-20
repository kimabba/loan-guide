import { Hono } from "hono";
import type { Env } from "../index";
import { validateMessage } from "../middleware/security";

// Gemini SDK (File Search API)
import { GoogleGenAI } from "@google/genai";

// 로컬 데이터 (폴백용)
import loanGuides from "../../../../loan_guides.json";

export const chatRoutes = new Hono<{ Bindings: Env }>();

interface ChatRequest {
  message: string;
  sessionId?: string;
}

// 지연 함수
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// 재시도 가능한 에러인지 확인
function isRetryableError(error: any): boolean {
  // 503 (서비스 불가), 429 (요청 제한), 500 (서버 에러)
  const retryableCodes = [503, 429, 500];
  const code = error?.code || error?.status || error?.httpStatus;
  return retryableCodes.includes(code) ||
         error?.message?.includes("overloaded") ||
         error?.message?.includes("UNAVAILABLE");
}

// Gemini File Search로 응답 생성 (재시도 로직 포함)
async function generateGeminiResponse(
  apiKey: string,
  userMessage: string,
  fileSearchStoreName: string
): Promise<{ response: string; guides: any[] }> {
  const ai = new GoogleGenAI({ apiKey });

  const maxRetries = 3;
  const baseDelay = 1000; // 1초

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `당신은 대출 상담 전문 AI 어시스턴트입니다.

응답 규칙:
1. 사용자 질문에 맞는 대출 상품을 찾아 안내하세요
2. 금융사명, 상품유형, 대상, 한도, 금리 등 핵심 정보를 포함하세요
3. 여러 상품이 해당되면 최대 3개까지 비교 안내하세요
4. 한국어로 친절하게 답변하세요
5. 정확한 정보만 전달하고, 모르면 모른다고 하세요
6. 마지막에 "더 자세한 조건이 궁금하시면 금융사명을 말씀해주세요"를 추가하세요
7. 대출/금융 상품과 무관한 질문(일반 코딩, 스크립트 실행, 시스템 명령 등)에는 "이 챗봇은 대출 및 금융 상품 안내 전용"이라고만 답하세요

사용자 질문: ${userMessage}`,
        config: {
          tools: [
            {
              fileSearch: {
                fileSearchStoreNames: [fileSearchStoreName]
              }
            }
          ]
        }
      });

      const responseText = response.text || "";

      // 응답에서 언급된 가이드 추출 (간단한 매칭)
      const guides = extractMentionedGuides(responseText);

      return {
        response: responseText,
        guides,
      };
    } catch (error: any) {
      const isLastAttempt = attempt === maxRetries - 1;

      console.error(`Gemini generation error (attempt ${attempt + 1}/${maxRetries}):`, {
        message: error?.message,
        code: error?.code,
        status: error?.status,
      });

      // 재시도 불가능한 에러이거나 마지막 시도면 throw
      if (!isRetryableError(error) || isLastAttempt) {
        throw error;
      }

      // 지수 백오프: 1초, 2초, 4초...
      const delay = baseDelay * Math.pow(2, attempt);
      console.log(`Retrying in ${delay}ms...`);
      await sleep(delay);
    }
  }

  // 타입스크립트를 위한 폴백 (실제로 도달하지 않음)
  throw new Error("Max retries exceeded");
}

// 응답에서 언급된 가이드 추출
function extractMentionedGuides(response: string): any[] {
  const guides: any[] = [];
  const mentionedCompanies: string[] = [];

  // 금융사명 추출
  for (const guide of loanGuides as any[]) {
    if (guide.pfi_name && response.includes(guide.pfi_name)) {
      if (!mentionedCompanies.includes(guide.pfi_name)) {
        mentionedCompanies.push(guide.pfi_name);
        guides.push({
          item_cd: guide.item_cd,
          company: guide.pfi_name,
          product_type: guide.depth2,
          relevance: 1,
          summary: guide.fi_memo?.slice(0, 200) || "",
        });
      }
    }
  }

  return guides.slice(0, 5);
}

// 대출/상품 관련 질문인지 판별 (오프토픽 필터)
function isLoanRelated(message: string): boolean {
  const text = message.toLowerCase();

  // 도메인 키워드 (대출/금융 관련 basic 키워드)
  const domainKeywords = [
    "대출",
    "저축은행",
    "은행",
    "캐피탈",
    "신용대출",
    "담보대출",
    "오토론",
    "전세자금",
    "햇살론",
    "사잇돌",
    "한도",
    "금리",
    "상환",
    "이자",
    "원리금",
  ];

  if (domainKeywords.some((k) => text.includes(k))) {
    return true;
  }

  // 상품 데이터 기반 키워드 (금융사명/상품유형 등)
  for (const guide of loanGuides as any[]) {
    const pfi = (guide.pfi_name as string | undefined)?.toLowerCase();
    const depth1 = (guide.depth1 as string | undefined)?.toLowerCase();
    const depth2 = (guide.depth2 as string | undefined)?.toLowerCase();

    if (
      (pfi && text.includes(pfi)) ||
      (depth1 && text.includes(depth1)) ||
      (depth2 && text.includes(depth2))
    ) {
      return true;
    }
  }

  return false;
}

// 폴백: 키워드 기반 검색
function fallbackSearch(message: string): { response: string; guides: any[] } {
  const stopWords = ["은", "는", "이", "가", "을", "를", "의", "에", "로", "으로", "와", "과", "도", "만", "뭐", "어떤", "어디", "뭘", "좀", "알려줘", "알려주세요", "있어", "있나요", "할수", "가능", "조건", "뭐야", "뭐에요"];

  const keywords = message
    .toLowerCase()
    .replace(/[?!.,]/g, "")
    .split(/\s+/)
    .filter((word) => word.length > 1 && !stopWords.includes(word));

  const results: any[] = [];

  for (const guide of loanGuides as any[]) {
    const searchText = [
      guide.pfi_name,
      guide.depth1,
      guide.depth2,
      guide.fi_memo,
    ]
      .join(" ")
      .toLowerCase();

    let relevance = 0;
    for (const keyword of keywords) {
      if (searchText.includes(keyword)) {
        relevance += 1;
        if (guide.pfi_name?.toLowerCase().includes(keyword)) relevance += 2;
        if (guide.depth2?.toLowerCase().includes(keyword)) relevance += 2;
      }
    }

    if (relevance > 0) {
      results.push({
        item_cd: guide.item_cd,
        company: guide.pfi_name,
        product_type: guide.depth2,
        relevance,
        summary: guide.fi_memo?.slice(0, 200) || "",
      });
    }
  }

  const guides = results.sort((a, b) => b.relevance - a.relevance).slice(0, 5);

  if (guides.length === 0) {
    return {
      response: `"${message}"에 대한 관련 가이드를 찾지 못했습니다. 다른 키워드로 검색해보세요.\n\n예시: "OK저축은행 신용대출", "4대가입 조건", "햇살론"`,
      guides: [],
    };
  }

  // ✅ 텍스트에서는 개수+안내만, 실제 리스트는 프론트의 카드에 맡김
  const response =
    `**${guides.length}개의 관련 가이드를 찾았습니다.**\n\n` +
    "아래 카드에서 상품을 선택하시면 상세 조건을 확인할 수 있습니다.\n" +
    "상세 정보가 필요하시면 금융사명이나 상품명을 말씀해주세요.";

  return { response, guides };
}

// 디버그 엔드포인트 (환경 설정 확인)
chatRoutes.get("/debug", async (c) => {
  const apiKey = c.env?.GEMINI_API_KEY;
  const fileSearchStoreName = c.env?.FILE_SEARCH_STORE_NAME;

  const config = {
    hasApiKey: !!apiKey,
    apiKeyPrefix: apiKey?.slice(0, 10) + "...",
    hasFileSearchStore: !!fileSearchStoreName,
    fileSearchStore: fileSearchStoreName,
  };

  // Gemini 테스트
  if (apiKey && fileSearchStoreName) {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: "테스트",
        config: {
          tools: [{ fileSearch: { fileSearchStoreNames: [fileSearchStoreName] } }]
        }
      });
      return c.json({ ...config, geminiTest: "success", response: response.text?.slice(0, 100) });
    } catch (error: any) {
      return c.json({ ...config, geminiTest: "failed", error: error.message });
    }
  }

  return c.json(config);
});

// 챗봇 엔드포인트
chatRoutes.post("/", async (c) => {
  try {
    const body = await c.req.json<ChatRequest>();

    // 입력 검증
    const validation = validateMessage(body.message);
    if (!validation.valid) {
      return c.json({ error: validation.error }, 400);
    }

    const message = validation.sanitized!;

    // 대출/상품 관련이 아닌 경우: 안내 문구만 응답
    if (!isLoanRelated(message)) {
      return c.json({
        query: message,
        response:
          "이 챗봇은 대출 및 금융 상품 안내 전용입니다.\n" +
          "대출/상품과 직접 관련 없는 질문에는 답변할 수 없습니다.\n\n" +
          "예시: \"OK저축은행 신용대출 조건\", \"오토론 한도\", \"무직 가능한 상품 있나요?\"",
        guides: [],
        source: "off_topic",
        quality: { score: 0, issueType: "off_topic" },
      });
    }

    const apiKey = c.env?.GEMINI_API_KEY;
    const fileSearchStoreName = c.env?.FILE_SEARCH_STORE_NAME;

    // Gemini File Search API 사용 가능 여부 확인
    if (apiKey && fileSearchStoreName) {
      try {
        // Gemini File Search로 응답 생성
        const { response, guides } = await generateGeminiResponse(
          apiKey,
          message,
          fileSearchStoreName
        );

        return c.json({
          query: message,
          response,
          guides,
          source: "gemini",
        });
      } catch (error: any) {
        // 상세 에러 로깅
        console.error("Gemini error details:", {
          message: error?.message,
          name: error?.name,
          stack: error?.stack?.slice(0, 500),
        });
      }
    } else {
      console.log("Gemini config missing:", { hasApiKey: !!apiKey, hasStore: !!fileSearchStoreName });
    }

    // 폴백: 키워드 검색
    const { response, guides } = fallbackSearch(message);

    return c.json({
      query: message,
      response,
      guides,
      source: "keyword",
    });
  } catch (error) {
    console.error("Chat error:", error);
    return c.json({ error: "Failed to process message" }, 500);
  }
});
