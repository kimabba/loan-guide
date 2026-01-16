import { Hono } from "hono";
import { cors } from "hono/cors";
import { handle } from "hono/cloudflare-pages";

// Gemini SDK
import { GoogleGenAI } from "@google/genai";

// Supabase
import { createClient, SupabaseClient } from "@supabase/supabase-js";

// 로컬 데이터
import loanGuides from "../loan_guides.json";

// ============================================
// Supabase Client Factory
// ============================================
function getSupabase(env: Env): SupabaseClient | null {
  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
    return null;
  }
  return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
}

// ============================================
// System Instruction (강화된 버전)
// ============================================
const SYSTEM_INSTRUCTION = `
당신은 한국 대출 상품 전문 상담사입니다.

## 핵심 규칙
1. **검색된 가이드 정보만 사용**: File Search에서 찾은 정보만 답변에 활용하세요.
2. **확실하지 않으면 명시**: "해당 정보를 찾지 못했습니다"라고 솔직하게 답변하세요.
3. **대출 외 질문 거절**: "저는 대출 상담 전문이라 다른 주제는 도움드리기 어렵습니다"라고 응답하세요.

## 응답 형식
- 금융사명, 상품유형, 대상, 한도, 금리 순서로 구조화하세요.
- 여러 상품 비교 시 표 형식을 사용하세요.
- 마지막에 "더 자세한 조건이 궁금하시면 금융사명을 말씀해주세요"를 추가하세요.

## 주의사항
- 법적 조언 제공 금지
- 특정 상품 추천이 아닌 정보 제공 목적임을 명시
- 최신 정보 확인은 금융사 직접 문의 권장

## 대출 관련 키워드
저축은행, 대부, 신용대출, 담보대출, 금리, 한도, 조건, 4대보험, 프리랜서, 자영업자, 직장인,
무직자, 햇살론, 비상금대출, 전세대출, 주택담보대출, OK저축은행, SBI저축은행, 웰컴저축은행
`;

// ============================================
// Quality Analysis Types & Functions
// ============================================
type IssueType = 'off_topic' | 'no_answer' | 'wrong_answer' | 'low_confidence' | 'ok';

interface QualityAnalysis {
  score: number;
  issueType: IssueType;
  reason?: string;
}

/**
 * 개선된 응답 품질 분석 (Grounding 메타데이터 적극 활용)
 */
function analyzeResponseQuality(
  userMessage: string,
  response: string,
  guides: any[],
  groundingMetadata?: any
): QualityAnalysis {
  // 대출 관련 키워드 (확장)
  const loanKeywords = [
    '대출', '금리', '한도', '저축은행', '대부', '신용', '담보', '조건',
    '4대', '프리랜서', '자영업', '직장인', '무직', '햇살론', '비상금',
    '전세', '주택담보', 'OK', 'SBI', '웰컴', '페퍼', '상환', '이자',
    '승인', '심사', '서류', '소득', '신용등급', '연체', '보증', '카드론',
    '마이너스', '리볼빙', '연체', '채무', '부채', '원금', '월납입'
  ];

  // 부정 응답 패턴
  const negativePatterns = [
    /찾지\s*못했/,
    /정보가\s*없/,
    /확인이\s*어렵/,
    /도움드리기\s*어렵/,
    /해당\s*정보를?\s*찾을\s*수\s*없/,
    /관련\s*정보가?\s*없/,
    /죄송\s*(합니다|해요)/,
  ];

  // 긍정 응답 패턴 (구체적인 정보 제공)
  const positivePatterns = [
    /\d+%/, // 금리 언급
    /\d+(만원|억|원)/, // 금액 언급
    /한도.*\d/, // 한도 정보
    /금리.*\d/, // 금리 정보
    /대상.*직장인|프리랜서|자영업/, // 대상 언급
  ];

  const hasLoanContext = loanKeywords.some(k => userMessage.toLowerCase().includes(k.toLowerCase()));
  const hasGuideReference = guides.length > 0;

  // Grounding 메타데이터 분석
  const groundingChunks = groundingMetadata?.groundingChunks || [];
  const groundingChunksCount = groundingChunks.length;
  const groundingSupports = groundingMetadata?.groundingSupports || [];

  // Grounding 신뢰도 계산
  let groundingConfidence = 0;
  if (groundingSupports.length > 0) {
    const avgConfidence = groundingSupports.reduce((sum: number, s: any) =>
      sum + (s.confidenceScores?.[0] || 0), 0) / groundingSupports.length;
    groundingConfidence = avgConfidence;
  }

  // 응답 품질 지표
  const hasNegativeResponse = negativePatterns.some(p => p.test(response));
  const hasPositiveContent = positivePatterns.some(p => p.test(response));
  const responseLength = response.length;

  let score = 0.5; // 기본 점수
  let issueType: IssueType = 'ok';
  let reason: string | undefined;

  // === 점수 계산 로직 ===

  // 1. 대출 관련 없는 질문 (off_topic)
  if (!hasLoanContext && !hasGuideReference && groundingChunksCount === 0) {
    score = 0.3;
    issueType = 'off_topic';
    reason = '대출 관련 키워드 없음, 가이드 참조 없음';
    return { score, issueType, reason };
  }

  // 2. Grounding 기반 점수 (가장 중요)
  if (groundingChunksCount > 0) {
    score += 0.2; // Grounding 있으면 +0.2
    if (groundingConfidence > 0.7) {
      score += 0.15; // 고신뢰도 Grounding +0.15
    } else if (groundingConfidence > 0.4) {
      score += 0.08; // 중신뢰도 Grounding +0.08
    }
  }

  // 3. 가이드 참조 점수
  if (hasGuideReference) {
    score += 0.15; // 가이드 참조 +0.15
    if (guides.length >= 3) {
      score += 0.05; // 다중 가이드 +0.05
    }
  }

  // 4. 응답 내용 품질
  if (hasPositiveContent) {
    score += 0.1; // 구체적 정보 포함 +0.1
  }

  // 5. 응답 길이 (너무 짧으면 감점)
  if (responseLength < 50) {
    score -= 0.15;
  } else if (responseLength > 200) {
    score += 0.05;
  }

  // 6. 부정 응답 감점
  if (hasNegativeResponse) {
    // 부정 응답이지만 가이드가 있으면 덜 감점
    if (hasGuideReference) {
      score -= 0.1;
      reason = '부정 응답이나 가이드 참조 있음';
    } else {
      score -= 0.25;
      issueType = 'low_confidence';
      reason = '불확실한 응답, 가이드 참조 없음';
    }
  }

  // 7. 대출 질문인데 가이드 없음
  if (hasLoanContext && !hasGuideReference && groundingChunksCount === 0) {
    score = Math.min(score, 0.5);
    issueType = 'no_answer';
    reason = '대출 질문이나 관련 가이드를 찾지 못함';
  }

  // 점수 범위 제한 (0.1 ~ 1.0)
  score = Math.max(0.1, Math.min(1.0, score));

  // 최종 이슈 타입 결정
  if (issueType === 'ok') {
    if (score < 0.5) {
      issueType = 'low_confidence';
      reason = reason || '전반적인 품질 점수 낮음';
    } else if (score < 0.7) {
      reason = reason || '보통 수준의 응답';
    }
  }

  return {
    score: Math.round(score * 100) / 100,
    issueType,
    reason
  };
}

// Types
export interface Env {
  ENVIRONMENT: string;
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  GEMINI_API_KEY?: string;
  FILE_SEARCH_STORE_NAME?: string;
}

// ============================================
// Security & Rate Limiting
// ============================================
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

function cleanupExpiredEntries() {
  const now = Date.now();
  if (rateLimitStore.size > 100) {
    for (const [key, entry] of rateLimitStore.entries()) {
      if (entry.resetTime < now) {
        rateLimitStore.delete(key);
      }
    }
  }
}

function sanitizeString(input: string): string {
  if (typeof input !== "string") return "";
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    .trim();
}

interface ValidationResult {
  valid: boolean;
  error?: string;
  sanitized?: string;
}

function validateMessage(message: unknown): ValidationResult {
  if (typeof message !== "string") {
    return { valid: false, error: "Message must be a string" };
  }
  if (message.trim().length === 0) {
    return { valid: false, error: "Message cannot be empty" };
  }
  if (message.length > 1000) {
    return { valid: false, error: "Message too long (max 1000 characters)" };
  }
  return { valid: true, sanitized: sanitizeString(message) };
}

function validateEmail(email: unknown): ValidationResult {
  if (email === undefined || email === null || email === "") {
    return { valid: true, sanitized: undefined };
  }
  if (typeof email !== "string") {
    return { valid: false, error: "Email must be a string" };
  }
  if (email.length > 254) {
    return { valid: false, error: "Email too long" };
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { valid: false, error: "Invalid email format" };
  }
  return { valid: true, sanitized: email.toLowerCase().trim() };
}

function validateReportType(type: unknown): ValidationResult {
  const validTypes = ["bug", "guide_fix", "feature", "other"];
  if (typeof type !== "string" || !validTypes.includes(type)) {
    return { valid: false, error: "Invalid report type" };
  }
  return { valid: true, sanitized: type };
}

// ============================================
// Hono App
// ============================================
const app = new Hono<{ Bindings: Env }>().basePath("/api");

// CORS
app.use(
  "*",
  cors({
    origin: ["https://loan-guide.pages.dev", "http://localhost:5173"],
    credentials: true,
  })
);

// Rate Limiting Middleware
app.use("*", async (c, next) => {
  cleanupExpiredEntries();
  const key =
    c.req.header("cf-connecting-ip") ||
    c.req.header("x-forwarded-for")?.split(",")[0] ||
    "anonymous";
  const now = Date.now();
  const windowMs = 60 * 1000;
  const max = 100;

  let entry = rateLimitStore.get(key);
  if (!entry || entry.resetTime < now) {
    entry = { count: 0, resetTime: now + windowMs };
    rateLimitStore.set(key, entry);
  }
  entry.count++;

  c.header("X-RateLimit-Limit", max.toString());
  c.header("X-RateLimit-Remaining", Math.max(0, max - entry.count).toString());
  c.header("X-RateLimit-Reset", Math.ceil(entry.resetTime / 1000).toString());

  if (entry.count > max) {
    return c.json({ error: "Too many requests. Please try again later." }, 429);
  }
  await next();
});

// ============================================
// Health Routes
// ============================================
app.get("/", (c) => {
  return c.json({
    name: "Loan Guide Chatbot API",
    version: "0.1.0",
    status: "ok",
  });
});

app.get("/health", (c) => {
  return c.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    environment: c.env.ENVIRONMENT || "unknown",
  });
});

// ============================================
// Guides Routes
// ============================================
app.get("/guides", (c) => {
  const guides = (loanGuides as any[]).map((g) => ({
    item_cd: g.item_cd,
    company: g.pfi_name,
    category: g.depth1,
    product_type: g.depth2,
    memo: g.fi_memo?.slice(0, 100) + "...",
  }));

  return c.json({
    total: guides.length,
    guides,
  });
});

app.get("/guides/:id", (c) => {
  const rawId = c.req.param("id");
  if (!rawId || !/^\d+$/.test(rawId) || rawId.length > 20) {
    return c.json({ error: "Invalid guide ID" }, 400);
  }

  const guide = (loanGuides as any[]).find((g) => g.item_cd === rawId);
  if (!guide) {
    return c.json({ error: "Guide not found" }, 404);
  }

  // 상품 조회 기록
  recordGuideView(rawId);

  return c.json(guide);
});

app.get("/guides/search/:query", (c) => {
  const rawQuery = c.req.param("query");
  if (!rawQuery || rawQuery.length > 100) {
    return c.json({ error: "Invalid search query" }, 400);
  }

  const query = sanitizeString(rawQuery).toLowerCase();

  // 쿼리를 단어로 분리
  const queryWords = query.split(/\s+/).filter(w => w.length > 0);

  // 각 가이드에 대해 점수 계산
  const scoredResults: { guide: any; score: number }[] = [];

  for (const guide of loanGuides as any[]) {
    const searchText = buildSearchText(guide).toLowerCase();
    let score = 0;

    // 전체 쿼리 매칭
    if (searchText.includes(query)) {
      score += 10;
    }

    // 개별 단어 매칭
    for (const word of queryWords) {
      if (searchText.includes(word)) {
        score += 1;

        // 필드별 가중치
        if (guide.pfi_name?.toLowerCase().includes(word)) score += 3;
        if (guide.depth2?.toLowerCase().includes(word)) score += 2;
        if (guide.depth1?.toLowerCase().includes(word)) score += 1;
      }
    }

    if (score > 0) {
      scoredResults.push({ guide, score });
    }
  }

  // 점수순 정렬 후 상위 결과 반환
  const results = scoredResults
    .sort((a, b) => b.score - a.score)
    .slice(0, 15)
    .map(({ guide, score }) => ({
      item_cd: guide.item_cd,
      company: guide.pfi_name,
      category: guide.depth1,
      product_type: guide.depth2,
      memo: guide.fi_memo?.slice(0, 150),
      conditions: extractKeyConditions(guide.depth3),
      relevance: score,
    }));

  return c.json({ query, total: results.length, results });
});

// ============================================
// Chat Routes
// ============================================
interface ChatRequest {
  message: string;
  sessionId?: string;
}

interface GeminiResult {
  response: string;
  guides: any[];
  usage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  groundingMetadata?: any;
}

async function generateGeminiResponse(
  apiKey: string,
  userMessage: string,
  fileSearchStoreName: string
): Promise<GeminiResult> {
  const ai = new GoogleGenAI({ apiKey });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: userMessage,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        tools: [
          {
            fileSearch: {
              fileSearchStoreNames: [fileSearchStoreName],
            },
          },
        ],
      },
    });

    const responseText = response.text || "";
    const guides = extractMentionedGuides(responseText);

    // 토큰 사용량 추출 (Gemini API 응답에서)
    const usageMetadata = (response as any).usageMetadata;
    const usage = usageMetadata
      ? {
          inputTokens: usageMetadata.promptTokenCount || 0,
          outputTokens: usageMetadata.candidatesTokenCount || 0,
          totalTokens: usageMetadata.totalTokenCount || 0,
        }
      : undefined;

    // Grounding metadata 추출
    const groundingMetadata = (response as any).candidates?.[0]?.groundingMetadata;

    return { response: responseText, guides, usage, groundingMetadata };
  } catch (error: any) {
    console.error("Gemini generation error:", error);
    throw error;
  }
}

/**
 * 응답에서 언급된 가이드 추출 (개선된 버전)
 * - 단어 경계 기반 매칭으로 오탐 방지
 * - 중복 제거를 위해 Set 사용
 * - depth3 상세 조건 포함
 */
function extractMentionedGuides(response: string): any[] {
  const guides: any[] = [];
  const mentionedCompanies = new Set<string>();
  const normalizedResponse = response.toLowerCase();

  // 금융사명을 길이 순으로 정렬 (긴 이름 우선 매칭)
  const sortedGuides = [...(loanGuides as any[])].sort(
    (a, b) => (b.pfi_name?.length || 0) - (a.pfi_name?.length || 0)
  );

  for (const guide of sortedGuides) {
    if (!guide.pfi_name) continue;

    const companyName = guide.pfi_name;
    const normalizedName = companyName.toLowerCase();

    // 이미 추가된 금융사는 스킵
    if (mentionedCompanies.has(companyName)) continue;

    // 단어 경계 기반 매칭 (한글 지원)
    // 한글은 \b가 작동하지 않으므로 앞뒤로 공백/구두점/문자열 경계 확인
    const escapedName = normalizedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(
      `(?:^|[\\s,.!?()\\[\\]{}:;'"~·…])${escapedName}(?:[\\s,.!?()\\[\\]{}:;'"~·…]|$)`,
      'i'
    );

    // 정규식 매칭 또는 정확한 포함 확인
    const isMatched = pattern.test(normalizedResponse) ||
                      normalizedResponse.includes(normalizedName);

    if (isMatched) {
      mentionedCompanies.add(companyName);

      // depth3에서 주요 조건 추출
      const conditions = extractKeyConditions(guide.depth3);

      guides.push({
        item_cd: guide.item_cd,
        company: guide.pfi_name,
        category: guide.depth1,
        product_type: guide.depth2,
        relevance: calculateRelevance(response, guide),
        summary: guide.fi_memo?.slice(0, 200) || "",
        conditions, // 상세 조건 추가
      });
    }
  }

  // 관련성 점수로 정렬 후 상위 5개 반환
  return guides
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, 5);
}

/**
 * depth3에서 주요 조건 추출
 */
function extractKeyConditions(depth3: any[]): Record<string, string> {
  const conditions: Record<string, string> = {};

  if (!Array.isArray(depth3)) return conditions;

  for (const section of depth3) {
    if (!section.depth4_key || !Array.isArray(section.depth4_key)) continue;

    for (const field of section.depth4_key) {
      const name = field.depth4_name;
      const detail = field.detail;

      if (!name || !detail) continue;

      // 주요 조건만 추출
      if (name === '연령' || name === '나이') {
        conditions.age = detail;
      } else if (name === '한도' || name.includes('대출한도')) {
        conditions.limit = detail;
      } else if (name === '금리' || name.includes('이자')) {
        conditions.rate = detail;
      } else if (name === '대상' || name.includes('자격')) {
        conditions.target = detail;
      } else if (name === '재직' || name.includes('근무')) {
        conditions.employment = detail;
      } else if (name === '소득' || name.includes('연소득')) {
        conditions.income = detail;
      }
    }
  }

  return conditions;
}

/**
 * 가이드의 관련성 점수 계산
 */
function calculateRelevance(response: string, guide: any): number {
  let relevance = 1;
  const normalizedResponse = response.toLowerCase();

  // 금융사명 언급 횟수
  const companyMatches = (normalizedResponse.match(
    new RegExp(guide.pfi_name?.toLowerCase() || '', 'g')
  ) || []).length;
  relevance += companyMatches * 2;

  // 상품유형 언급 여부
  if (guide.depth2 && normalizedResponse.includes(guide.depth2.toLowerCase())) {
    relevance += 3;
  }

  // 카테고리 언급 여부
  if (guide.depth1 && normalizedResponse.includes(guide.depth1.toLowerCase())) {
    relevance += 1;
  }

  return relevance;
}

/**
 * 개선된 폴백 검색 (TF-IDF 기반)
 * - 키워드 가중치 적용
 * - depth3 상세 조건 검색 포함
 * - 동의어/유사어 처리
 */
function fallbackSearch(message: string): { response: string; guides: any[] } {
  // 확장된 스탑워드 (조사, 어미, 일반적인 질문 패턴)
  // 주의: "없는", "있는" 등은 직업 조건 판단에 중요하므로 제외하지 않음
  const stopWords = new Set([
    "은", "는", "이", "가", "을", "를", "의", "에", "로", "으로", "와", "과", "도", "만",
    "뭐", "어떤", "어디", "뭘", "좀", "알려줘", "알려주세요", "있나요", "할수",
    "조건", "뭐야", "뭐에요", "하고", "해서", "하면", "되나요", "싶어요",
    "주세요", "부탁", "요", "데", "때", "것", "수", "거", "점"
    // "없는", "있는", "가능" 제외 (직업 조건 판단에 필요)
  ]);

  // 동의어/유사어 매핑 (직업 구분 대폭 확장)
  const synonyms: Record<string, string[]> = {
    // === 대출 유형 ===
    "신용대출": ["신용", "무담보", "신용론"],
    "담보대출": ["담보", "주담대", "주택담보", "하우스론"],
    "햇살론": ["햇살", "서민대출", "정부지원대출"],
    "사잇돌": ["사잇돌대출", "중금리"],

    // === 직업 구분 (핵심 개선) ===
    // 4대보험 가입 직장인
    "4대가입": ["4대보험", "4대", "사대보험", "사대", "직장인", "회사원", "근로자", "월급쟁이", "정규직"],
    "직장인": ["회사원", "근로자", "월급쟁이", "정규직", "4대가입", "4대보험"],

    // 4대보험 미가입자
    "미가입": ["4대보험없는", "4대없는", "보험없는", "미가입자", "4대미가입"],
    "4대보험없는": ["미가입", "4대없는", "보험없는", "미가입자"],

    // 프리랜서
    "프리랜서": ["자유직", "프리", "비정규직", "자유계약", "1인사업자", "플랫폼노동자"],

    // 개인사업자
    "개인사업자": ["자영업", "자영업자", "사업자", "개인사업", "소상공인", "자영업대출"],
    "자영업": ["자영업자", "사업자", "개인사업", "개인사업자", "소상공인"],

    // 무직/주부
    "무직": ["무직자", "실업자", "미취업", "백수", "취준생"],
    "주부": ["전업주부", "주부론", "가정주부"],

    // 특수 직군
    "청년": ["청년론", "사회초년생", "청년대출"],
    "개인회생": ["회생", "회생자", "파산"],
    "연금": ["연금수령", "국민연금", "퇴직연금"],

    // === 금융 조건 ===
    "금리": ["이자", "이율", "연이율", "금리대"],
    "한도": ["최대금액", "대출금액", "한도액", "대출한도"],
    "조건": ["자격", "요건", "기준", "대상"],

    // === 근무형태 ===
    "계약직": ["기간제", "단기계약"],
    "파견직": ["파견근무", "파견"],
    "일용직": ["일당제", "일용"],
  };

  // 키워드 추출 및 정규화
  const normalizedMessage = message.toLowerCase().replace(/[?!.,()[\]{}'"]/g, " ");
  const rawKeywords = normalizedMessage.split(/\s+/).filter(w => w.length > 0);

  // 스탑워드 제거 및 동의어 확장
  const keywords: { word: string; weight: number }[] = [];
  const seenWords = new Set<string>();

  for (const word of rawKeywords) {
    if (word.length < 2 || stopWords.has(word)) continue;
    if (seenWords.has(word)) continue;

    seenWords.add(word);
    keywords.push({ word, weight: 1.0 });

    // 동의어 확장 (가중치 낮춤)
    for (const [key, syns] of Object.entries(synonyms)) {
      if (word === key || syns.includes(word)) {
        for (const syn of [key, ...syns]) {
          if (!seenWords.has(syn)) {
            seenWords.add(syn);
            keywords.push({ word: syn, weight: 0.7 });
          }
        }
      }
    }
  }

  // 키워드가 없으면 원본 메시지에서 2글자 이상 단어 추출
  if (keywords.length === 0) {
    const fallbackWords = normalizedMessage.match(/[가-힣a-z0-9]{2,}/g) || [];
    for (const word of fallbackWords.slice(0, 5)) {
      if (!stopWords.has(word)) {
        keywords.push({ word, weight: 0.5 });
      }
    }
  }

  // 문서 빈도수 계산 (IDF용)
  const docFrequency = new Map<string, number>();
  const totalDocs = (loanGuides as any[]).length;

  for (const guide of loanGuides as any[]) {
    const searchText = buildSearchText(guide).toLowerCase();
    const seenInDoc = new Set<string>();

    for (const { word } of keywords) {
      if (!seenInDoc.has(word) && searchText.includes(word)) {
        seenInDoc.add(word);
        docFrequency.set(word, (docFrequency.get(word) || 0) + 1);
      }
    }
  }

  // 각 가이드에 대해 TF-IDF 기반 점수 계산
  const results: any[] = [];

  for (const guide of loanGuides as any[]) {
    const searchText = buildSearchText(guide).toLowerCase();
    let score = 0;
    const matchedKeywords: string[] = [];

    for (const { word, weight } of keywords) {
      // TF (단어 빈도)
      const regex = new RegExp(escapeRegex(word), 'g');
      const matches = searchText.match(regex);
      const tf = matches ? matches.length : 0;

      if (tf > 0) {
        // IDF (역문서 빈도)
        const df = docFrequency.get(word) || 1;
        const idf = Math.log(totalDocs / df) + 1;

        // TF-IDF 점수
        let termScore = tf * idf * weight;

        // 필드별 가중치 부여
        if (guide.pfi_name?.toLowerCase().includes(word)) {
          termScore *= 3; // 금융사명 매칭 → 3배
        }
        if (guide.depth2?.toLowerCase().includes(word)) {
          termScore *= 2.5; // 상품유형 매칭 → 2.5배
        }
        if (guide.depth1?.toLowerCase().includes(word)) {
          termScore *= 1.5; // 카테고리 매칭 → 1.5배
        }

        score += termScore;
        if (!matchedKeywords.includes(word)) {
          matchedKeywords.push(word);
        }
      }
    }

    // ★ 직업 타입 매칭 점수 추가 (핵심 개선)
    const jobTypeScore = calculateJobTypeScore(keywords, guide);
    score += jobTypeScore;

    // 직업 타입 추출하여 결과에 포함
    const jobType = extractJobType(guide.depth2);

    if (score > 0) {
      const conditions = extractKeyConditions(guide.depth3);
      results.push({
        item_cd: guide.item_cd,
        company: guide.pfi_name,
        category: guide.depth1,
        product_type: guide.depth2,
        jobType, // 직업 타입 추가
        relevance: Math.round(score * 100) / 100,
        summary: guide.fi_memo?.slice(0, 200) || "",
        conditions,
        matchedKeywords,
      });
    }
  }

  // 점수순 정렬 후 상위 결과 반환
  const guides = results
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, 8); // 더 많은 결과 제공

  if (guides.length === 0) {
    // 검색 결과 없을 때 추천 검색어 제공
    const suggestions = getSuggestions(message);
    return {
      response: `"${message}"에 대한 관련 가이드를 찾지 못했습니다.\n\n**추천 검색어:**\n${suggestions.map(s => `- ${s}`).join('\n')}\n\n예시: "OK저축은행 신용대출", "4대보험 없는 직장인", "햇살론 조건"`,
      guides: [],
    };
  }

  // 응답 생성 (조건 정보 포함)
  let response = `**${guides.length}개의 관련 가이드를 찾았습니다:**\n\n`;
  for (const guide of guides.slice(0, 5)) {
    response += `### ${guide.company} - ${guide.product_type}\n`;
    response += `${guide.summary}\n`;

    // 조건 정보 표시
    if (Object.keys(guide.conditions).length > 0) {
      const conditionStr = Object.entries(guide.conditions)
        .map(([key, value]) => {
          const labels: Record<string, string> = {
            age: '연령', limit: '한도', rate: '금리',
            target: '대상', employment: '재직', income: '소득'
          };
          return `${labels[key] || key}: ${value}`;
        })
        .slice(0, 3)
        .join(' | ');
      response += `> ${conditionStr}\n`;
    }
    response += '\n';
  }

  if (guides.length > 5) {
    response += `\n*그 외 ${guides.length - 5}개의 추가 결과가 있습니다.*\n`;
  }
  response += `\n상세 정보가 필요하시면 금융사명이나 상품명을 말씀해주세요.`;

  return { response, guides };
}

/**
 * depth2에서 직업/대상 타입 추출
 * 예: "신용대출(4대가입)" → "4대가입"
 * 예: "햇살론(프리랜서)" → "프리랜서"
 */
function extractJobType(depth2: string): string | null {
  if (!depth2) return null;
  const match = depth2.match(/\(([^)]+)\)/);
  return match ? match[1] : null;
}

/**
 * 직업 타입 매칭 점수 계산 (개선된 버전)
 * - depth2 직업 타입 매칭
 * - fi_memo에서 "무직가능", "무직 포함" 등 패턴 인식
 * - "무직불가" 등 부정 패턴 감점
 */
function calculateJobTypeScore(keywords: { word: string; weight: number }[], guide: any): number {
  const jobType = extractJobType(guide.depth2);
  const depth2Lower = (guide.depth2 || "").toLowerCase();
  const fiMemoLower = (guide.fi_memo || "").toLowerCase();
  let score = 0;

  // 직업 타입별 키워드 매핑
  const jobTypeKeywords: Record<string, string[]> = {
    "4대가입": ["4대", "4대보험", "직장인", "회사원", "정규직", "근로자"],
    "미가입": ["미가입", "4대없는", "보험없는", "4대보험없는", "4대미가입"],
    "프리랜서": ["프리랜서", "프리", "자유직", "플랫폼"],
    "개인사업자": ["개인사업자", "자영업", "사업자", "소상공인"],
    "주부론": ["주부", "전업주부", "가정주부"],
    "주부": ["주부", "전업주부", "가정주부"],
    "무직론": ["무직", "무직자", "실업", "미취업", "백수"],
    "무직": ["무직", "무직자", "실업", "미취업", "백수"],
    "청년론": ["청년", "사회초년생", "청년대출"],
    "개인회생": ["회생", "파산", "개인회생"],
    "연금수령": ["연금", "국민연금", "퇴직연금"],
  };

  // 사용자가 검색한 직업 키워드 추출
  const searchedJobTypes: string[] = [];
  for (const { word } of keywords) {
    for (const [type, typeKeywords] of Object.entries(jobTypeKeywords)) {
      if (typeKeywords.some(tk => tk.includes(word) || word.includes(tk))) {
        if (!searchedJobTypes.includes(type)) {
          searchedJobTypes.push(type);
        }
      }
    }
  }

  // 1. depth2 직업 타입 정확 매칭 (높은 가점)
  if (jobType) {
    const jobTypeLower = jobType.toLowerCase();
    for (const [type, typeKeywords] of Object.entries(jobTypeKeywords)) {
      if (jobTypeLower.includes(type.toLowerCase()) || type.toLowerCase().includes(jobTypeLower)) {
        for (const { word, weight } of keywords) {
          if (typeKeywords.some(tk => tk.includes(word) || word.includes(tk))) {
            score += 15 * weight; // depth2 직업 타입 정확 매칭 → 매우 높은 가점
          }
        }
      }
    }
  }

  // 2. fi_memo에서 직업 가능/불가 여부 확인
  const isSearchingMujik = searchedJobTypes.includes("무직론") || searchedJobTypes.includes("무직") ||
    keywords.some(k => k.word.includes("무직"));

  if (isSearchingMujik) {
    // "무직가능", "무직 가능", "무직 포함" 패턴 → 가점
    if (/무직\s*(가능|포함|진행가능|ok|O)/i.test(fiMemoLower) ||
        /모든\s*직군\s*(가능|진행가능)/i.test(fiMemoLower)) {
      score += 20; // fi_memo에서 무직 가능 확인 → 높은 가점
    }
    // depth2에 "무직론" 포함 → 가점
    if (depth2Lower.includes("무직")) {
      score += 25; // 무직 전용 상품 → 최고 가점
    }
    // "무직불가", "무직 제외" 패턴 → 감점
    if (/무직\s*(불가|제외|안됨|진행불가)/i.test(fiMemoLower)) {
      score -= 30; // 무직 불가 상품 → 큰 감점
    }
  }

  // 3. 주부 검색 처리
  const isSearchingJubu = searchedJobTypes.includes("주부론") || searchedJobTypes.includes("주부") ||
    keywords.some(k => k.word.includes("주부"));

  if (isSearchingJubu) {
    if (/주부\s*(가능|포함|진행가능)/i.test(fiMemoLower) || depth2Lower.includes("주부")) {
      score += 20;
    }
    if (/주부\s*(불가|제외)/i.test(fiMemoLower)) {
      score -= 30;
    }
  }

  // 4. "없는" 패턴 특수 처리 (4대보험 없는 → 미가입)
  const hasNegativePattern = keywords.some(k =>
    k.word === "없는" || k.word === "없이" || k.word === "미"
  );
  const has4daeKeyword = keywords.some(k =>
    k.word.includes("4대") || k.word.includes("보험")
  );

  if (hasNegativePattern && has4daeKeyword) {
    if (jobType === "미가입" || depth2Lower.includes("미가입")) {
      score += 15; // "4대보험 없는" → "미가입" 상품 강력 매칭
    }
  }

  // 5. 반대 케이스: 4대보험 있는 직장인 → 4대가입 상품
  if (!hasNegativePattern && has4daeKeyword) {
    if (jobType === "4대가입" || depth2Lower.includes("4대가입")) {
      score += 10;
    }
  }

  return score;
}

/**
 * 검색용 텍스트 생성 (depth3 포함 + 직업 타입 확장 + fi_memo 조건 파싱)
 */
function buildSearchText(guide: any): string {
  const parts = [
    guide.pfi_name,
    guide.depth1,
    guide.depth2,
    guide.fi_memo,
  ];

  // 직업 타입 추출하여 검색 텍스트에 추가
  const jobType = extractJobType(guide.depth2);
  if (jobType) {
    parts.push(jobType);
    // 직업 타입의 동의어도 추가
    const jobExpansions: Record<string, string[]> = {
      "4대가입": ["직장인", "회사원", "정규직", "4대보험"],
      "미가입": ["4대보험없는", "보험미가입"],
      "프리랜서": ["자유직", "프리"],
      "개인사업자": ["자영업", "사업자"],
      "무직론": ["무직", "무직자", "무직가능"],
      "주부론": ["주부", "전업주부"],
    };
    if (jobExpansions[jobType]) {
      parts.push(...jobExpansions[jobType]);
    }
  }

  // fi_memo에서 직업 조건 키워드 추출하여 추가
  const fiMemo = guide.fi_memo || "";
  if (/무직\s*(가능|포함|진행가능)/i.test(fiMemo) || /모든\s*직군.*가능/i.test(fiMemo)) {
    parts.push("무직가능", "무직", "무직자");
  }
  if (/주부\s*(가능|포함)/i.test(fiMemo)) {
    parts.push("주부가능", "주부", "전업주부");
  }

  // depth3 상세 조건도 검색 대상에 포함
  if (Array.isArray(guide.depth3)) {
    for (const section of guide.depth3) {
      if (section.depth3_name) parts.push(section.depth3_name);
      if (Array.isArray(section.depth4_key)) {
        for (const field of section.depth4_key) {
          if (field.depth4_name) parts.push(field.depth4_name);
          if (field.detail) parts.push(field.detail);
        }
      }
    }
  }

  return parts.filter(Boolean).join(" ");
}

/**
 * 정규식 특수문자 이스케이프
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * 검색 결과 없을 때 추천 검색어 생성
 */
function getSuggestions(message: string): string[] {
  const suggestions: string[] = [];

  // 자주 사용되는 검색어
  const popularTerms = [
    "신용대출", "OK저축은행", "웰컴저축은행", "SBI저축은행",
    "직장인 대출", "프리랜서 대출", "자영업자 대출",
    "4대보험 없는", "햇살론", "비상금대출"
  ];

  // 메시지와 관련 있는 추천어 선택
  const messageLower = message.toLowerCase();
  for (const term of popularTerms) {
    if (suggestions.length >= 3) break;

    // 일부 글자가 겹치면 추천
    const termChars = term.toLowerCase().split('');
    const matchCount = termChars.filter(c => messageLower.includes(c)).length;
    if (matchCount >= 2 || Math.random() > 0.5) {
      suggestions.push(term);
    }
  }

  // 최소 3개 추천
  while (suggestions.length < 3) {
    const randomTerm = popularTerms[Math.floor(Math.random() * popularTerms.length)];
    if (!suggestions.includes(randomTerm)) {
      suggestions.push(randomTerm);
    }
  }

  return suggestions;
}

app.get("/chat/debug", async (c) => {
  const apiKey = c.env?.GEMINI_API_KEY;
  const fileSearchStoreName = c.env?.FILE_SEARCH_STORE_NAME;

  const config = {
    hasApiKey: !!apiKey,
    apiKeyPrefix: apiKey?.slice(0, 10) + "...",
    hasFileSearchStore: !!fileSearchStoreName,
    fileSearchStore: fileSearchStoreName,
  };

  if (apiKey && fileSearchStoreName) {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: "테스트",
        config: {
          tools: [{ fileSearch: { fileSearchStoreNames: [fileSearchStoreName] } }],
        },
      });
      return c.json({
        ...config,
        geminiTest: "success",
        response: response.text?.slice(0, 100),
      });
    } catch (error: any) {
      return c.json({ ...config, geminiTest: "failed", error: error.message });
    }
  }

  return c.json(config);
});

app.post("/chat", async (c) => {
  try {
    const body = await c.req.json<ChatRequest>();
    const validation = validateMessage(body.message);
    if (!validation.valid) {
      return c.json({ error: validation.error }, 400);
    }

    const message = validation.sanitized!;
    const { sessionId } = body;
    const apiKey = c.env?.GEMINI_API_KEY;
    const fileSearchStoreName = c.env?.FILE_SEARCH_STORE_NAME;
    const supabase = getSupabase(c.env);

    // 검색어 기록
    recordSearch(message);

    // 세션 ID 확인/생성 (Supabase가 설정된 경우에만)
    let activeSessionId = sessionId;
    if (supabase && !activeSessionId) {
      try {
        const { data: newSession, error: sessionError } = await supabase
          .from('chat_sessions')
          .insert({ title: message.slice(0, 50) })
          .select('id')
          .single();

        if (!sessionError && newSession) {
          activeSessionId = newSession.id;
        }
      } catch (e) {
        console.error('Session creation error:', e);
      }
    }

    // 사용자 메시지 저장 (Supabase가 설정된 경우에만)
    if (supabase && activeSessionId) {
      try {
        await supabase.from('chat_messages').insert({
          session_id: activeSessionId,
          role: 'user',
          content: message
        });
      } catch (e) {
        console.error('User message save error:', e);
      }
    }

    let responseData: {
      query: string;
      response: string;
      guides: any[];
      source: string;
      sessionId?: string;
      usage?: any;
      quality?: { score: number; issueType: string };
    };

    if (apiKey && fileSearchStoreName) {
      try {
        const { response, guides, usage, groundingMetadata } = await generateGeminiResponse(
          apiKey,
          message,
          fileSearchStoreName
        );

        // 토큰 사용량 기록
        if (usage) {
          recordTokenUsage(
            "chat",
            "gemini-2.5-flash",
            usage.inputTokens,
            usage.outputTokens
          );
        }

        // 품질 분석
        const quality = analyzeResponseQuality(message, response, guides, groundingMetadata);

        // AI 응답 저장 및 품질 로그 기록 (Supabase가 설정된 경우에만)
        if (supabase && activeSessionId) {
          try {
            const { data: aiMessage } = await supabase
              .from('chat_messages')
              .insert({
                session_id: activeSessionId,
                role: 'assistant',
                content: response,
                guide_ids: guides.map(g => g.item_cd)
              })
              .select('id')
              .single();

            // 품질 로그 저장
            const qualityLogData: any = {
              session_id: activeSessionId,
              quality_score: quality.score,
              issue_type: quality.issueType,
              grounding_chunks_count: groundingMetadata?.groundingChunks?.length || 0,
              has_guide_reference: guides.length > 0
            };

            if (aiMessage?.id) {
              qualityLogData.message_id = aiMessage.id;
            }

            const { data: qualityLog } = await supabase
              .from('chat_quality_logs')
              .insert(qualityLogData)
              .select('id')
              .single();

            // 문제 감지 시 버그 리포트 자동 생성
            if (quality.score < 0.5 && qualityLog?.id) {
              const { data: bugReport } = await supabase
                .from('bug_reports')
                .insert({
                  type: 'guide_fix',
                  title: `[자동] ${quality.issueType}: ${message.slice(0, 50)}`,
                  description: `## 사용자 질문\n${message}\n\n## AI 응답\n${response.slice(0, 500)}\n\n## 문제 유형\n${quality.issueType}\n\n## 품질 점수\n${quality.score}`,
                  status: 'open'
                })
                .select('id')
                .single();

              // 품질 로그와 버그 리포트 연결
              if (bugReport?.id) {
                await supabase
                  .from('chat_quality_logs')
                  .update({ bug_report_id: bugReport.id })
                  .eq('id', qualityLog.id);
              }
            }
          } catch (e) {
            console.error('AI message/quality log save error:', e);
          }
        }

        responseData = {
          query: message,
          response,
          guides,
          source: "gemini",
          sessionId: activeSessionId,
          usage,
          quality: { score: quality.score, issueType: quality.issueType }
        };

        return c.json(responseData);
      } catch (error: any) {
        console.error("Gemini error details:", {
          message: error?.message,
          name: error?.name,
          stack: error?.stack?.slice(0, 500),
        });
      }
    }

    // Fallback: 키워드 검색 (토큰 사용 없음)
    const { response, guides } = fallbackSearch(message);
    recordTokenUsage("keyword_search", "none", 0, 0);

    // Fallback 응답도 저장 (Supabase가 설정된 경우에만)
    if (supabase && activeSessionId) {
      try {
        await supabase.from('chat_messages').insert({
          session_id: activeSessionId,
          role: 'assistant',
          content: response,
          guide_ids: guides.map(g => g.item_cd)
        });

        // Fallback은 low_confidence로 기록
        await supabase.from('chat_quality_logs').insert({
          session_id: activeSessionId,
          quality_score: 0.5,
          issue_type: 'low_confidence',
          has_guide_reference: guides.length > 0
        });
      } catch (e) {
        console.error('Fallback message save error:', e);
      }
    }

    responseData = {
      query: message,
      response,
      guides,
      source: "keyword",
      sessionId: activeSessionId,
      quality: { score: 0.5, issueType: 'low_confidence' }
    };

    return c.json(responseData);
  } catch (error) {
    console.error("Chat error:", error);
    return c.json({ error: "Failed to process message" }, 500);
  }
});

// ============================================
// Chat Sessions & History Routes
// ============================================

// 세션 목록 조회
app.get("/chat/sessions", async (c) => {
  const supabase = getSupabase(c.env);
  if (!supabase) {
    return c.json({ error: "Database not configured", total: 0, sessions: [] });
  }

  const limit = Math.min(parseInt(c.req.query("limit") || "20"), 50);

  const { data: sessions, error } = await supabase
    .from('chat_sessions')
    .select('id, title, created_at, updated_at')
    .order('updated_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Sessions fetch error:", error);
    return c.json({ error: "세션 목록을 불러올 수 없습니다" }, 500);
  }

  return c.json({ total: sessions?.length || 0, sessions: sessions || [] });
});

// 특정 세션의 메시지 조회
app.get("/chat/sessions/:sessionId/messages", async (c) => {
  const sessionId = c.req.param("sessionId");
  if (!sessionId || !/^[0-9a-f-]{36}$/.test(sessionId)) {
    return c.json({ error: "Invalid session ID" }, 400);
  }

  const supabase = getSupabase(c.env);
  if (!supabase) {
    return c.json({ error: "Database not configured", sessionId, total: 0, messages: [] });
  }

  const { data: messages, error } = await supabase
    .from('chat_messages')
    .select('id, role, content, guide_ids, created_at')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error("Messages fetch error:", error);
    return c.json({ error: "메시지를 불러올 수 없습니다" }, 500);
  }

  return c.json({ sessionId, total: messages?.length || 0, messages: messages || [] });
});

// 피드백 제출
app.post("/chat/feedback", async (c) => {
  try {
    const body = await c.req.json<{
      messageId?: string;
      sessionId?: string;
      feedback: 'helpful' | 'not_helpful' | 'wrong';
    }>();

    const { messageId, sessionId, feedback } = body;
    const validFeedbacks = ['helpful', 'not_helpful', 'wrong'];

    if (!validFeedbacks.includes(feedback)) {
      return c.json({ error: "Invalid feedback type" }, 400);
    }

    const supabase = getSupabase(c.env);
    if (!supabase) {
      return c.json({ error: "Database not configured" }, 503);
    }

    // messageId 또는 sessionId로 품질 로그 찾기
    let query = supabase.from('chat_quality_logs').update({ user_feedback: feedback });

    if (messageId) {
      query = query.eq('message_id', messageId);
    } else if (sessionId) {
      // 세션의 가장 최근 품질 로그 업데이트
      const { data: latestLog } = await supabase
        .from('chat_quality_logs')
        .select('id')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (latestLog) {
        query = query.eq('id', latestLog.id);
      } else {
        return c.json({ error: "Quality log not found" }, 404);
      }
    } else {
      return c.json({ error: "messageId or sessionId required" }, 400);
    }

    const { error } = await query;

    if (error) {
      console.error("Feedback update error:", error);
      return c.json({ error: "피드백 저장에 실패했습니다" }, 500);
    }

    // 'wrong' 피드백인 경우 버그 리포트 생성 고려
    if (feedback === 'wrong' && sessionId) {
      const { data: qualityLog } = await supabase
        .from('chat_quality_logs')
        .select('id, bug_report_id, session_id')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      // 버그 리포트가 없으면 생성
      if (qualityLog && !qualityLog.bug_report_id) {
        const { data: messages } = await supabase
          .from('chat_messages')
          .select('role, content')
          .eq('session_id', sessionId)
          .order('created_at', { ascending: false })
          .limit(2);

        if (messages && messages.length >= 2) {
          const userMsg = messages.find(m => m.role === 'user')?.content || '';
          const aiMsg = messages.find(m => m.role === 'assistant')?.content || '';

          const { data: bugReport } = await supabase
            .from('bug_reports')
            .insert({
              type: 'guide_fix',
              title: `[사용자 신고] ${userMsg.slice(0, 50)}`,
              description: `## 사용자 질문\n${userMsg}\n\n## AI 응답\n${aiMsg.slice(0, 500)}\n\n## 피드백\n사용자가 "잘못된 답변"으로 신고함`,
              status: 'open'
            })
            .select('id')
            .single();

          if (bugReport) {
            await supabase
              .from('chat_quality_logs')
              .update({ bug_report_id: bugReport.id })
              .eq('id', qualityLog.id);
          }
        }
      }
    }

    return c.json({ success: true, message: "피드백이 저장되었습니다" });
  } catch (error) {
    console.error("Feedback error:", error);
    return c.json({ error: "피드백 처리에 실패했습니다" }, 500);
  }
});

// 품질 통계 조회 (관리자용)
app.get("/chat/quality/stats", async (c) => {
  const supabase = getSupabase(c.env);
  if (!supabase) {
    return c.json({ error: "Database not configured" }, 503);
  }
  const days = Math.min(parseInt(c.req.query("days") || "7"), 30);

  // issue_type별 카운트
  const { data: issueStats } = await supabase
    .from('chat_quality_logs')
    .select('issue_type')
    .gte('created_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString());

  const issueCounts: Record<string, number> = {
    ok: 0,
    off_topic: 0,
    no_answer: 0,
    low_confidence: 0,
    wrong_answer: 0
  };

  issueStats?.forEach(log => {
    if (log.issue_type && log.issue_type in issueCounts) {
      issueCounts[log.issue_type]++;
    }
  });

  // 피드백 통계
  const { data: feedbackStats } = await supabase
    .from('chat_quality_logs')
    .select('user_feedback')
    .not('user_feedback', 'is', null)
    .gte('created_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString());

  const feedbackCounts: Record<string, number> = {
    helpful: 0,
    not_helpful: 0,
    wrong: 0
  };

  feedbackStats?.forEach(log => {
    if (log.user_feedback && log.user_feedback in feedbackCounts) {
      feedbackCounts[log.user_feedback]++;
    }
  });

  // 문제 채팅 목록 (최근 20개)
  const { data: problemChats } = await supabase
    .from('chat_quality_logs')
    .select(`
      id,
      quality_score,
      issue_type,
      user_feedback,
      bug_report_id,
      created_at,
      chat_messages!chat_quality_logs_message_id_fkey (content)
    `)
    .neq('issue_type', 'ok')
    .order('created_at', { ascending: false })
    .limit(20);

  return c.json({
    period: `${days} days`,
    issueCounts,
    feedbackCounts,
    totalChats: issueStats?.length || 0,
    problemRate: issueStats?.length
      ? Math.round((issueStats.filter(s => s.issue_type !== 'ok').length / issueStats.length) * 100)
      : 0,
    recentProblems: problemChats || []
  });
});

// ============================================
// Reports Routes
// ============================================
interface BugReport {
  id: string;
  type: "bug" | "guide_fix" | "feature" | "other";
  title: string;
  description: string;
  email?: string;
  guideId?: string;
  createdAt: string;
}

const reports: BugReport[] = [];

app.post("/reports", async (c) => {
  try {
    const body = await c.req.json();

    const typeValidation = validateReportType(body.type || "bug");
    if (!typeValidation.valid) {
      return c.json({ error: typeValidation.error }, 400);
    }

    const titleValidation = validateMessage(body.title);
    if (!titleValidation.valid) {
      return c.json({ error: `제목: ${titleValidation.error}` }, 400);
    }

    const descValidation = validateMessage(body.description);
    if (!descValidation.valid) {
      return c.json({ error: `내용: ${descValidation.error}` }, 400);
    }

    const emailValidation = validateEmail(body.email);
    if (!emailValidation.valid) {
      return c.json({ error: emailValidation.error }, 400);
    }

    const report: BugReport = {
      id: crypto.randomUUID(),
      type: typeValidation.sanitized as BugReport["type"],
      title: titleValidation.sanitized!,
      description: descValidation.sanitized!,
      email: emailValidation.sanitized,
      guideId: body.guideId ? sanitizeString(body.guideId).slice(0, 50) : undefined,
      createdAt: new Date().toISOString(),
    };

    reports.push(report);
    console.log("New bug report:", report.title);

    return c.json({
      success: true,
      message: "리포트가 제출되었습니다. 검토 후 반영하겠습니다.",
      reportId: report.id,
    });
  } catch (error) {
    console.error("Report submission error:", error);
    return c.json({ error: "리포트 제출에 실패했습니다" }, 500);
  }
});

app.get("/reports", (c) => {
  return c.json({
    total: reports.length,
    reports: reports.slice(-20).reverse(),
  });
});

// ============================================
// Announcements Routes
// ============================================
interface Announcement {
  id: string;
  type: "update" | "notice" | "maintenance" | "new_feature";
  title: string;
  content: string;
  important: boolean;
  createdAt: string;
}

const announcements: Announcement[] = [
  {
    id: "1",
    type: "new_feature",
    title: "대출 가이드 챗봇 서비스 오픈",
    content: `안녕하세요, 대출 가이드 서비스를 이용해 주셔서 감사합니다.

오늘부터 대출 가이드 챗봇 서비스가 정식 오픈되었습니다.

**주요 기능:**
- 163개 대출 상품 정보 검색
- 키워드 기반 맞춤 상품 추천
- 상세 대출 조건 확인

많은 이용 부탁드립니다.`,
    important: true,
    createdAt: "2025-01-10T09:00:00Z",
  },
  {
    id: "2",
    type: "update",
    title: "OK저축은행 상품 정보 업데이트",
    content: `OK저축은행의 대출 상품 정보가 업데이트되었습니다.

**변경 사항:**
- OK비상금대출 금리 조정 (연 15.9% → 연 14.9%)
- OK프리론 한도 변경 (최대 3,000만원 → 최대 5,000만원)

자세한 내용은 챗봇에서 확인해 주세요.`,
    important: false,
    createdAt: "2025-01-09T14:30:00Z",
  },
  {
    id: "3",
    type: "maintenance",
    title: "시스템 점검 안내 (1/15)",
    content: `서비스 품질 향상을 위한 시스템 점검이 예정되어 있습니다.

**점검 일시:** 2025년 1월 15일 02:00 ~ 06:00 (4시간)
**영향 범위:** 전체 서비스 일시 중단

점검 시간 동안 서비스 이용이 불가하오니 양해 부탁드립니다.`,
    important: true,
    createdAt: "2025-01-08T10:00:00Z",
  },
];

app.get("/announcements", (c) => {
  const type = c.req.query("type");
  const important = c.req.query("important");

  let filtered = [...announcements];

  if (type) {
    filtered = filtered.filter((a) => a.type === type);
  }

  if (important === "true") {
    filtered = filtered.filter((a) => a.important);
  }

  filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return c.json({ total: filtered.length, announcements: filtered });
});

app.get("/announcements/:id", (c) => {
  const id = c.req.param("id");
  const announcement = announcements.find((a) => a.id === id);

  if (!announcement) {
    return c.json({ error: "공지사항을 찾을 수 없습니다" }, 404);
  }

  return c.json(announcement);
});

// ============================================
// Statistics Routes
// ============================================

// 통계 데이터 저장소 (인메모리 - 실제 운영 시 DB 사용)
interface TokenUsageRecord {
  branchId?: string;
  userId?: string;
  sessionId?: string;
  requestType: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  createdAt: string;
}

interface DailyStats {
  date: string;
  chatCount: number;
  messageCount: number;
  apiCallCount: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCostUsd: number;
  activeUsers: Set<string>;
}

const tokenUsageRecords: TokenUsageRecord[] = [];
const dailyStatsMap = new Map<string, DailyStats>();
const guideViewCounts = new Map<string, number>();
const searchQueries: { query: string; count: number; createdAt: string }[] = [];

// 토큰 비용 계산 (Gemini 2.5 Flash 기준)
const TOKEN_COSTS = {
  "gemini-2.5-flash": {
    input: 0.000075 / 1000,  // $0.075 per 1M input tokens
    output: 0.0003 / 1000,   // $0.30 per 1M output tokens
  },
};

function calculateCost(model: string, inputTokens: number, outputTokens: number): number {
  const costs = TOKEN_COSTS[model as keyof typeof TOKEN_COSTS] || TOKEN_COSTS["gemini-2.5-flash"];
  return inputTokens * costs.input + outputTokens * costs.output;
}

function getTodayKey(): string {
  return new Date().toISOString().split("T")[0];
}

function getOrCreateDailyStats(date: string): DailyStats {
  if (!dailyStatsMap.has(date)) {
    dailyStatsMap.set(date, {
      date,
      chatCount: 0,
      messageCount: 0,
      apiCallCount: 0,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalCostUsd: 0,
      activeUsers: new Set(),
    });
  }
  return dailyStatsMap.get(date)!;
}

// 토큰 사용량 기록 함수
function recordTokenUsage(
  requestType: string,
  model: string,
  inputTokens: number,
  outputTokens: number,
  branchId?: string,
  userId?: string,
  sessionId?: string
) {
  const costUsd = calculateCost(model, inputTokens, outputTokens);
  const now = new Date().toISOString();
  const today = getTodayKey();

  tokenUsageRecords.push({
    branchId,
    userId,
    sessionId,
    requestType,
    model,
    inputTokens,
    outputTokens,
    costUsd,
    createdAt: now,
  });

  // 일별 통계 업데이트
  const dailyStats = getOrCreateDailyStats(today);
  dailyStats.chatCount += requestType === "chat" ? 1 : 0;
  dailyStats.messageCount += 1;
  dailyStats.apiCallCount += 1;
  dailyStats.totalInputTokens += inputTokens;
  dailyStats.totalOutputTokens += outputTokens;
  dailyStats.totalCostUsd += costUsd;
  if (userId) dailyStats.activeUsers.add(userId);

  // 오래된 레코드 정리 (최대 1000개 유지)
  if (tokenUsageRecords.length > 1000) {
    tokenUsageRecords.splice(0, 100);
  }
}

// 상품 조회 기록
function recordGuideView(guideId: string) {
  const current = guideViewCounts.get(guideId) || 0;
  guideViewCounts.set(guideId, current + 1);
}

// 검색 기록
function recordSearch(query: string) {
  const existing = searchQueries.find((q) => q.query.toLowerCase() === query.toLowerCase());
  if (existing) {
    existing.count += 1;
  } else {
    searchQueries.push({ query, count: 1, createdAt: new Date().toISOString() });
  }
  // 오래된 검색어 정리
  if (searchQueries.length > 500) {
    searchQueries.splice(0, 100);
  }
}

// 통계 대시보드 데이터
app.get("/stats/dashboard", (c) => {
  const today = getTodayKey();
  const todayStats = dailyStatsMap.get(today);

  // 최근 7일 데이터
  const last7Days: { date: string; tokens: number; cost: number; chats: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateKey = date.toISOString().split("T")[0];
    const stats = dailyStatsMap.get(dateKey);
    last7Days.push({
      date: dateKey,
      tokens: stats ? stats.totalInputTokens + stats.totalOutputTokens : 0,
      cost: stats ? stats.totalCostUsd : 0,
      chats: stats ? stats.chatCount : 0,
    });
  }

  // 인기 상품 TOP 10
  const topGuides = Array.from(guideViewCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([guideId, views]) => {
      const guide = (loanGuides as any[]).find((g) => g.item_cd === guideId);
      return {
        guideId,
        company: guide?.pfi_name || "Unknown",
        productType: guide?.depth2 || "Unknown",
        views,
      };
    });

  // 인기 검색어 TOP 10
  const topSearches = [...searchQueries]
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // 전체 통계 계산
  const totalTokens = tokenUsageRecords.reduce(
    (sum, r) => sum + r.inputTokens + r.outputTokens,
    0
  );
  const totalCost = tokenUsageRecords.reduce((sum, r) => sum + r.costUsd, 0);
  const totalChats = tokenUsageRecords.filter((r) => r.requestType === "chat").length;

  return c.json({
    overview: {
      totalTokens,
      totalCost: Math.round(totalCost * 1000000) / 1000000,
      totalCostKrw: Math.round(totalCost * 1450), // USD to KRW (approximate)
      totalChats,
      totalApiCalls: tokenUsageRecords.length,
      todayTokens: todayStats
        ? todayStats.totalInputTokens + todayStats.totalOutputTokens
        : 0,
      todayCost: todayStats ? Math.round(todayStats.totalCostUsd * 1000000) / 1000000 : 0,
      todayChats: todayStats?.chatCount || 0,
      todayActiveUsers: todayStats?.activeUsers.size || 0,
    },
    trends: {
      last7Days,
    },
    topGuides,
    topSearches,
    lastUpdated: new Date().toISOString(),
  });
});

// 토큰 사용량 상세
app.get("/stats/tokens", (c) => {
  const limit = Math.min(parseInt(c.req.query("limit") || "100"), 500);
  const offset = parseInt(c.req.query("offset") || "0");
  const requestType = c.req.query("type");

  let filtered = [...tokenUsageRecords];
  if (requestType) {
    filtered = filtered.filter((r) => r.requestType === requestType);
  }

  const total = filtered.length;
  const records = filtered
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(offset, offset + limit);

  return c.json({
    total,
    limit,
    offset,
    records,
  });
});

// 일별 통계
app.get("/stats/daily", (c) => {
  const days = Math.min(parseInt(c.req.query("days") || "30"), 90);
  const stats: {
    date: string;
    chatCount: number;
    messageCount: number;
    apiCallCount: number;
    totalTokens: number;
    totalCostUsd: number;
    activeUsers: number;
  }[] = [];

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateKey = date.toISOString().split("T")[0];
    const dayStats = dailyStatsMap.get(dateKey);

    stats.push({
      date: dateKey,
      chatCount: dayStats?.chatCount || 0,
      messageCount: dayStats?.messageCount || 0,
      apiCallCount: dayStats?.apiCallCount || 0,
      totalTokens: dayStats
        ? dayStats.totalInputTokens + dayStats.totalOutputTokens
        : 0,
      totalCostUsd: dayStats?.totalCostUsd || 0,
      activeUsers: dayStats?.activeUsers.size || 0,
    });
  }

  return c.json({ days, stats });
});

// 상품 조회 통계
app.get("/stats/guides", (c) => {
  const limit = Math.min(parseInt(c.req.query("limit") || "20"), 100);

  const guideStats = Array.from(guideViewCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([guideId, views]) => {
      const guide = (loanGuides as any[]).find((g) => g.item_cd === guideId);
      return {
        guideId,
        company: guide?.pfi_name || "Unknown",
        category: guide?.depth1 || "Unknown",
        productType: guide?.depth2 || "Unknown",
        views,
      };
    });

  return c.json({
    total: guideViewCounts.size,
    guides: guideStats,
  });
});

// 검색어 통계
app.get("/stats/searches", (c) => {
  const limit = Math.min(parseInt(c.req.query("limit") || "20"), 100);

  const searches = [...searchQueries]
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);

  return c.json({
    total: searchQueries.length,
    searches,
  });
});

// 플랜 정보
app.get("/stats/plans", (c) => {
  const plans = [
    {
      name: "free",
      displayName: "무료",
      monthlyTokenLimit: 50000,
      monthlyChatLimit: 100,
      maxUsers: 5,
      priceKrw: 0,
      features: ["기본 채팅", "상품 검색"],
    },
    {
      name: "basic",
      displayName: "베이직",
      monthlyTokenLimit: 500000,
      monthlyChatLimit: 1000,
      maxUsers: 20,
      priceKrw: 49000,
      features: ["기본 채팅", "상품 검색", "내보내기", "우선 응답"],
    },
    {
      name: "pro",
      displayName: "프로",
      monthlyTokenLimit: 5000000,
      monthlyChatLimit: null, // 무제한
      maxUsers: 100,
      priceKrw: 199000,
      features: ["기본 채팅", "상품 검색", "내보내기", "우선 응답", "API 접근", "전담 지원"],
    },
  ];

  return c.json({ plans });
});

// ============================================
// Admin API Endpoints
// ============================================

// 상품 분류 매핑 정보
app.get("/admin/product-mappings", (c) => {
  // 동의어 매핑 데이터
  const synonymMappings = [
    // 직업 구분
    { key: "4대가입", synonyms: ["4대보험", "4대", "사대보험", "직장인", "회사원", "근로자", "정규직"], category: "직업" },
    { key: "미가입", synonyms: ["4대보험없는", "4대없는", "보험없는", "미가입자"], category: "직업" },
    { key: "프리랜서", synonyms: ["자유직", "프리", "비정규직", "자유계약", "플랫폼노동자"], category: "직업" },
    { key: "개인사업자", synonyms: ["자영업", "자영업자", "사업자", "소상공인"], category: "직업" },
    { key: "무직", synonyms: ["무직자", "실업자", "미취업", "백수", "취준생"], category: "직업" },
    { key: "주부", synonyms: ["전업주부", "주부론", "가정주부"], category: "직업" },
    { key: "청년", synonyms: ["청년론", "사회초년생", "청년대출"], category: "직업" },
    { key: "개인회생", synonyms: ["회생", "회생자", "파산"], category: "특수" },
    // 대출 유형
    { key: "신용대출", synonyms: ["신용", "무담보", "신용론"], category: "대출유형" },
    { key: "담보대출", synonyms: ["담보", "주담대", "주택담보", "하우스론"], category: "대출유형" },
    { key: "햇살론", synonyms: ["햇살", "서민대출", "정부지원대출"], category: "대출유형" },
    { key: "사잇돌", synonyms: ["사잇돌대출", "중금리"], category: "대출유형" },
    { key: "오토론", synonyms: ["자동차담보", "차량담보", "자동차대출"], category: "대출유형" },
    // 금융 조건
    { key: "금리", synonyms: ["이자", "이율", "연이율"], category: "조건" },
    { key: "한도", synonyms: ["최대금액", "대출금액", "한도액"], category: "조건" },
  ];

  // depth2에서 직업 유형 추출
  function extractJobType(depth2: string): string | null {
    if (!depth2) return null;
    const match = depth2.match(/\(([^)]+)\)/);
    return match ? match[1] : null;
  }

  // 상품별 통계 계산
  const guides = loanGuides as any[];
  const jobTypeCounts: Record<string, number> = {};
  const loanTypeCounts: Record<string, number> = {};
  const categories: { depth2: string; jobType: string | null; loanType: string; count: number }[] = [];

  // depth2별 그룹화
  const depth2Groups: Record<string, any[]> = {};
  for (const guide of guides) {
    const d2 = guide.depth2 || "기타";
    if (!depth2Groups[d2]) depth2Groups[d2] = [];
    depth2Groups[d2].push(guide);
  }

  // 각 그룹 분석
  for (const [depth2, groupGuides] of Object.entries(depth2Groups)) {
    const jobType = extractJobType(depth2);

    // 대출 유형 추출 (괄호 앞 부분)
    let loanType = depth2.replace(/\([^)]+\)/, "").trim();
    if (!loanType) loanType = depth2;

    // 직업 유형 카운트
    if (jobType) {
      jobTypeCounts[jobType] = (jobTypeCounts[jobType] || 0) + groupGuides.length;
    }

    // 대출 유형 카운트
    loanTypeCounts[loanType] = (loanTypeCounts[loanType] || 0) + groupGuides.length;

    categories.push({
      depth2,
      jobType,
      loanType,
      count: groupGuides.length,
    });
  }

  // 직업 유형 요약
  const jobTypeSummary = Object.entries(jobTypeCounts)
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count);

  // 대출 유형 요약
  const loanTypeSummary = Object.entries(loanTypeCounts)
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count);

  // 주의 필요한 검색 패턴
  const problematicPatterns = [
    {
      pattern: "4대보험 없는 직장인",
      expectedMapping: "미가입",
      description: "부정 표현 '없는'이 포함되어 '미가입' 상품으로 매핑 필요",
      scoreBonus: 10,
    },
    {
      pattern: "자영업자 대출",
      expectedMapping: "개인사업자",
      description: "'자영업자'는 '개인사업자' 동의어로 매핑",
      scoreBonus: 5,
    },
    {
      pattern: "회사원 신용대출",
      expectedMapping: "4대가입",
      description: "'회사원'은 '4대가입' 동의어로 매핑",
      scoreBonus: 5,
    },
    {
      pattern: "프리 대출",
      expectedMapping: "프리랜서",
      description: "'프리'는 '프리랜서' 축약형으로 매핑",
      scoreBonus: 5,
    },
    {
      pattern: "전업주부 대출",
      expectedMapping: "주부",
      description: "'전업주부'는 '주부' 동의어로 매핑",
      scoreBonus: 5,
    },
  ];

  return c.json({
    stats: {
      totalProducts: guides.length,
      jobTypeCount: Object.keys(jobTypeCounts).length,
      loanTypeCount: Object.keys(loanTypeCounts).length,
      synonymGroupCount: synonymMappings.length,
    },
    synonymMappings,
    categories: categories.sort((a, b) => b.count - a.count),
    jobTypeSummary,
    loanTypeSummary,
    problematicPatterns,
  });
});

// 404 Handler
app.notFound((c) => {
  return c.json({ error: "Not Found" }, 404);
});

// Error Handler
app.onError((err, c) => {
  console.error(`Error: ${err.message}`);
  return c.json({ error: "Internal Server Error" }, 500);
});

// Export for Cloudflare Pages
export const onRequest = handle(app);

// ============================================
// Simple Cache Implementation (In-Memory)
// ============================================
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

const cacheStore = new Map<string, CacheEntry<any>>();

function getCachedData<T>(key: string): T | null {
  const entry = cacheStore.get(key);
  if (!entry) return null;
  
  if (Date.now() > entry.timestamp + entry.ttl) {
    cacheStore.delete(key);
    return null;
  }
  
  return entry.data;
}

function setCachedData<T>(key: string, data: T, ttlMs: number = 5 * 60 * 1000): void {
  cacheStore.set(key, {
    data,
    timestamp: Date.now(),
    ttl: ttlMs,
  });
  
  // Cleanup old entries (keep size reasonable)
  if (cacheStore.size > 100) {
    const now = Date.now();
    for (const [cacheKey, entry] of cacheStore.entries()) {
      if (now > entry.timestamp + entry.ttl) {
        cacheStore.delete(cacheKey);
      }
    }
  }
}

