import { Hono } from "hono";
import type { Env } from "../index";
import { validateMessage, sanitizeString } from "../middleware/security";

// 임시: 로컬 JSON 데이터
import loanGuides from "../../../../loan_guides.json";

export const chatRoutes = new Hono<{ Bindings: Env }>();

interface ChatRequest {
  message: string;
}

interface GuideResult {
  item_cd: string;
  company: string;
  product_type: string;
  relevance: number;
  summary: string;
}

// 키워드 추출 (간단한 버전)
function extractKeywords(text: string): string[] {
  const stopWords = ["은", "는", "이", "가", "을", "를", "의", "에", "로", "으로", "와", "과", "도", "만", "뭐", "어떤", "어디", "뭘", "좀", "알려줘", "알려주세요", "있어", "있나요", "할수", "가능", "조건", "뭐야", "뭐에요"];

  return text
    .toLowerCase()
    .replace(/[?!.,]/g, "")
    .split(/\s+/)
    .filter((word) => word.length > 1 && !stopWords.includes(word));
}

// 관련 가이드 검색
function searchGuides(keywords: string[]): GuideResult[] {
  const results: GuideResult[] = [];

  for (const guide of loanGuides as any[]) {
    const searchText = [
      guide.pfi_name,
      guide.depth1,
      guide.depth2,
      guide.fi_memo,
      JSON.stringify(guide.depth3),
    ]
      .join(" ")
      .toLowerCase();

    let relevance = 0;
    for (const keyword of keywords) {
      if (searchText.includes(keyword)) {
        relevance += 1;
        // 금융사명이나 상품유형에 매칭되면 가중치
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

  return results.sort((a, b) => b.relevance - a.relevance).slice(0, 5);
}

// 응답 생성
function generateResponse(query: string, guides: GuideResult[]): string {
  if (guides.length === 0) {
    return `"${query}"에 대한 관련 가이드를 찾지 못했습니다. 다른 키워드로 검색해보세요.\n\n예시: "OK저축은행 신용대출", "4대가입 조건", "햇살론"`;
  }

  let response = `**${guides.length}개의 관련 가이드를 찾았습니다:**\n\n`;

  for (const guide of guides) {
    response += `### ${guide.company} - ${guide.product_type}\n`;
    response += `${guide.summary}\n\n`;
  }

  response += `\n상세 정보가 필요하시면 금융사명이나 상품명을 말씀해주세요.`;

  return response;
}

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

    // 키워드 추출
    const keywords = extractKeywords(message);

    // 가이드 검색
    const guides = searchGuides(keywords);

    // 응답 생성
    const response = generateResponse(message, guides);

    return c.json({
      query: message,
      keywords,
      guides,
      response,
    });
  } catch (error) {
    console.error("Chat error:", error);
    return c.json({ error: "Failed to process message" }, 500);
  }
});
