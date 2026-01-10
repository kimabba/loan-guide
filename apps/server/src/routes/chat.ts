import { Hono } from "hono";
import { validateMessage } from "../middleware/security";
import { GoogleGenAI } from "@google/genai";
import { CHATBOT_CONFIG } from "../config/chatbot";

// 로컬 데이터 (폴백용)
import loanGuides from "../../../../loan_guides.json";

export const chatRoutes = new Hono();

interface ChatRequest {
  message: string;
  sessionId?: string;
}

// 환경변수
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const FILE_SEARCH_STORE_NAME = process.env.FILE_SEARCH_STORE_NAME;

// Gemini File Search로 응답 생성
async function generateGeminiResponse(
  userMessage: string
): Promise<{ response: string; guides: any[] }> {
  if (!GEMINI_API_KEY || !FILE_SEARCH_STORE_NAME) {
    throw new Error("Gemini configuration missing");
  }

  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

  const response = await ai.models.generateContent({
    model: CHATBOT_CONFIG.model,
    contents: `${CHATBOT_CONFIG.systemPrompt}

사용자 질문: ${userMessage}`,
    config: {
      tools: [
        {
          fileSearch: {
            fileSearchStoreNames: [FILE_SEARCH_STORE_NAME]
          }
        }
      ]
    }
  });

  const responseText = response.text || "";
  const guides = extractMentionedGuides(responseText);

  return { response: responseText, guides };
}

// 응답에서 언급된 가이드 추출
function extractMentionedGuides(response: string): any[] {
  const guides: any[] = [];
  const mentionedCompanies: string[] = [];

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
      response: CHATBOT_CONFIG.noResultMessage,
      guides: [],
    };
  }

  let response = `**${guides.length}개의 관련 가이드를 찾았습니다:**\n\n`;
  for (const guide of guides) {
    response += `### ${guide.company} - ${guide.product_type}\n`;
    response += `${guide.summary}\n\n`;
  }
  response += `\n상세 정보가 필요하시면 금융사명이나 상품명을 말씀해주세요.`;

  return { response, guides };
}

// 디버그 엔드포인트
chatRoutes.get("/debug", async (c) => {
  const config = {
    hasApiKey: !!GEMINI_API_KEY,
    apiKeyPrefix: GEMINI_API_KEY?.slice(0, 10) + "...",
    hasFileSearchStore: !!FILE_SEARCH_STORE_NAME,
    fileSearchStore: FILE_SEARCH_STORE_NAME,
  };

  if (GEMINI_API_KEY && FILE_SEARCH_STORE_NAME) {
    try {
      const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: CHATBOT_CONFIG.model,
        contents: "테스트",
        config: {
          tools: [{ fileSearch: { fileSearchStoreNames: [FILE_SEARCH_STORE_NAME] } }]
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

    const validation = validateMessage(body.message);
    if (!validation.valid) {
      return c.json({ error: validation.error }, 400);
    }

    const message = validation.sanitized!;

    // Gemini File Search API 시도
    if (GEMINI_API_KEY && FILE_SEARCH_STORE_NAME) {
      try {
        const { response, guides } = await generateGeminiResponse(message);
        return c.json({
          query: message,
          response,
          guides,
          source: "gemini",
        });
      } catch (error: any) {
        console.error("Gemini error:", error.message);
      }
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
