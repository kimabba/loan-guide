import { Hono } from "hono";
import { handle } from "hono/cloudflare-pages";

// Gemini SDK
import { GoogleGenAI } from "@google/genai";

// Supabase
import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Security Middleware
import {
  corsMiddleware,
  securityHeadersMiddleware,
  rateLimitMiddleware,
  chatRateLimitMiddleware,
  authRateLimitMiddleware,
  auditLogMiddleware,
  sanitizeError,
  isBlockedURL,
  validateUUID,
  addAuditLog,
  getAuditLogs,
  resetAuthRateLimit,
} from "../security/middleware";

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
2. **적극적으로 검색**: 사용자 질문에서 핵심 키워드를 추출하여 여러 방식으로 검색하세요.
3. **대출 외 질문 거절**: "저는 대출 상담 전문이라 다른 주제는 도움드리기 어렵습니다"라고 응답하세요.

## 검색 전략
사용자 질문에 따라 다음 키워드로 검색하세요:
- **무직자 대출**: "무직가능", "무직 포함", "무직론", "모든 직군 가능"
- **프리랜서 대출**: "프리랜서", "자유직", "위촉계약"
- **자영업자 대출**: "사업자", "자영업", "개인사업자"
- **직장인 대출**: "4대보험", "직장인", "재직"
- **담보대출**: "담보", "부동산", "전세", "자동차", "오토론"

## 응답 형식
1. 검색된 상품을 금융사명, 상품유형, 대상, 한도, 금리 순서로 구조화하세요.
2. 여러 상품이 있으면 최대 3개까지 비교 안내하세요.
3. 반드시 구체적인 상품명과 조건을 포함하세요.
4. 마지막에 "더 자세한 조건이 궁금하시면 금융사명을 말씀해주세요"를 추가하세요.

## 주의사항
- 법적 조언 제공 금지
- 특정 상품 추천이 아닌 정보 제공 목적임을 명시
- 최신 정보 확인은 금융사 직접 문의 권장
- "정보를 찾지 못했습니다"는 최후의 수단으로만 사용

## 대출 관련 키워드
저축은행, 대부, 신용대출, 담보대출, 금리, 한도, 조건, 4대보험, 프리랜서, 자영업자, 직장인,
무직자, 무직가능, 햇살론, 비상금대출, 전세대출, 주택담보대출, OK저축은행, SBI저축은행, 웰컴저축은행, 다올저축은행
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
// Security & Input Validation
// ============================================

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

// Security Middleware Stack (순서 중요!)
// 1. CORS - Preflight 요청 처리
app.use("*", corsMiddleware());

// 2. Security Headers - HSTS, CSP, X-Frame-Options 등
app.use("*", securityHeadersMiddleware());

// 3. General Rate Limiting - 모든 요청에 적용
app.use("*", rateLimitMiddleware());

// 4. Audit Logging - 민감한 작업 로깅
app.use("*", auditLogMiddleware());

// 5. Chat-specific rate limiting (더 엄격)
app.use("/chat", chatRateLimitMiddleware());
app.use("/chat/*", chatRateLimitMiddleware());

// 6. Auth-specific rate limiting (Bruteforce 방어)
app.use("/auth/*", authRateLimitMiddleware());

// ============================================
// Admin Authentication Helper
// ============================================
async function verifyAdminAuth(c: any): Promise<{ isAdmin: boolean; userId?: string; error?: string }> {
  const authHeader = c.req.header("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { isAdmin: false, error: "Missing or invalid authorization header" };
  }

  const token = authHeader.substring(7);
  const supabase = getSupabase(c.env);

  if (!supabase) {
    // Supabase 미설정 시 개발 환경에서는 허용
    if (c.env.ENVIRONMENT === "development") {
      return { isAdmin: true, userId: "dev-admin" };
    }
    return { isAdmin: false, error: "Authentication service unavailable" };
  }

  try {
    // JWT 토큰 검증
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return { isAdmin: false, error: "Invalid or expired token" };
    }

    // user_profiles 테이블에서 role 확인
    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return { isAdmin: false, error: "User profile not found" };
    }

    if (profile.role !== "admin") {
      return { isAdmin: false, error: "Admin access required" };
    }

    return { isAdmin: true, userId: user.id };
  } catch (err) {
    console.error("Auth verification error:", err);
    return { isAdmin: false, error: "Authentication failed" };
  }
}

// Admin auth middleware for protected routes
async function requireAdmin(c: any, next: () => Promise<void>) {
  const auth = await verifyAdminAuth(c);
  if (!auth.isAdmin) {
    return c.json({ error: auth.error || "Unauthorized" }, 401);
  }
  c.set("adminUserId", auth.userId);
  await next();
}

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

// API 상태 확인 (Gemini 연결 테스트)
app.get("/api-status", async (c) => {
  const apiKey = c.env?.GEMINI_API_KEY;
  const fileSearchStoreName = c.env?.FILE_SEARCH_STORE_NAME;

  const status = {
    timestamp: new Date().toISOString(),
    gemini: {
      configured: !!(apiKey && fileSearchStoreName),
      status: "unknown" as "ok" | "error" | "unknown",
      latency: 0,
      error: null as string | null,
    },
    fallback: {
      status: "ok",
      guides_count: (loanGuides as any[]).length,
    },
  };

  // Gemini API 간단 테스트 (빠른 응답 확인)
  if (apiKey && fileSearchStoreName) {
    const startTime = Date.now();
    try {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash-001", // 빠른 모델로 테스트
        contents: "test",
        config: { maxOutputTokens: 10 },
      });

      status.gemini.status = response.text ? "ok" : "error";
      status.gemini.latency = Date.now() - startTime;
    } catch (error: any) {
      status.gemini.status = "error";
      status.gemini.latency = Date.now() - startTime;
      status.gemini.error = error?.message?.includes("429")
        ? "rate_limit_exceeded"
        : error?.message?.includes("503")
          ? "service_unavailable"
          : error?.message || "unknown_error";
    }
  }

  return c.json(status);
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

// 지연 함수
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// 재시도 가능한 에러인지 확인
function isRetryableError(error: any): boolean {
  const retryableCodes = [503, 429, 500];
  const code = error?.code || error?.status || error?.httpStatus;
  return retryableCodes.includes(code) ||
         error?.message?.includes("overloaded") ||
         error?.message?.includes("UNAVAILABLE") ||
         error?.message?.includes("rate limit");
}

// 쿼리 확장: 검색 품질 향상을 위해 관련 키워드 추가
function expandQuery(userMessage: string): string {
  const expansions: { pattern: RegExp; keywords: string }[] = [
    { pattern: /무직/i, keywords: "(무직가능, 무직 포함, 무직론, 모든 직군 가능 상품 검색)" },
    { pattern: /프리랜서/i, keywords: "(프리랜서, 자유직, 위촉계약, 소득확인 가능한 상품 검색)" },
    { pattern: /자영업/i, keywords: "(사업자, 자영업자, 개인사업자 상품 검색)" },
    { pattern: /담보/i, keywords: "(담보대출, 부동산담보, 주택담보 상품 검색)" },
    { pattern: /오토론|자동차/i, keywords: "(오토론, 자동차담보, 차량담보 상품 검색)" },
    { pattern: /전세/i, keywords: "(전세대출, 전세자금, 전세담보 상품 검색)" },
  ];

  let expandedQuery = userMessage;
  for (const { pattern, keywords } of expansions) {
    if (pattern.test(userMessage)) {
      expandedQuery = `${userMessage}\n\n[검색 힌트: ${keywords}]`;
      break;
    }
  }
  return expandedQuery;
}

// 단일 모델로 요청 시도 (재시도 로직 포함)
async function tryGeminiModel(
  ai: GoogleGenAI,
  model: string,
  userMessage: string,
  fileSearchStoreName: string,
  maxRetries: number = 2
): Promise<GeminiResult | null> {
  const baseDelay = 1000;
  const expandedMessage = expandQuery(userMessage);

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: expandedMessage,
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

      const usageMetadata = (response as any).usageMetadata;
      const usage = usageMetadata
        ? {
            inputTokens: usageMetadata.promptTokenCount || 0,
            outputTokens: usageMetadata.candidatesTokenCount || 0,
            totalTokens: usageMetadata.totalTokenCount || 0,
          }
        : undefined;

      const groundingMetadata = (response as any).candidates?.[0]?.groundingMetadata;

      return { response: responseText, guides, usage, groundingMetadata };
    } catch (error: any) {
      const isLastAttempt = attempt === maxRetries - 1;

      console.error(`Gemini ${model} error (attempt ${attempt + 1}/${maxRetries}):`, {
        message: error?.message,
        code: error?.code,
      });

      if (!isRetryableError(error) || isLastAttempt) {
        return null; // 이 모델 실패, 다음 모델로
      }

      const delay = baseDelay * Math.pow(2, attempt);
      console.log(`Retrying ${model} in ${delay}ms...`);
      await sleep(delay);
    }
  }
  return null;
}

async function generateGeminiResponse(
  apiKey: string,
  userMessage: string,
  fileSearchStoreName: string
): Promise<GeminiResult> {
  const ai = new GoogleGenAI({ apiKey });

  // 모델 우선순위: gemini-2.5-flash → gemini-2.0-flash-001
  const models = ["gemini-2.5-flash", "gemini-2.0-flash-001"];

  for (const model of models) {
    const result = await tryGeminiModel(ai, model, userMessage, fileSearchStoreName);
    if (result) {
      console.log(`Success with model: ${model}`);
      return result;
    }
    console.log(`Model ${model} failed, trying next...`);
  }

  // 모든 모델 실패
  throw new Error("All Gemini models failed after retries");
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

// ============================================
// Synonym Mapping Helper Functions
// ============================================

// 동의어 매핑 캐시 (5분 TTL)
let synonymMappingsCache: { data: any[] | null; timestamp: number } = { data: null, timestamp: 0 };
const SYNONYM_CACHE_TTL = 5 * 60 * 1000; // 5분

// DB에서 동의어 매핑 조회 (캐시 포함)
async function getSynonymMappingsFromDB(supabase: SupabaseClient | null): Promise<Record<string, string[]>> {
  // Supabase 없으면 하드코딩 사용
  if (!supabase) {
    return getDefaultSynonyms();
  }

  // 캐시 확인
  if (synonymMappingsCache.data && Date.now() - synonymMappingsCache.timestamp < SYNONYM_CACHE_TTL) {
    return convertToSynonymObject(synonymMappingsCache.data);
  }

  try {
    const { data, error } = await supabase
      .from('synonym_mappings')
      .select('*')
      .eq('is_active', true)
      .order('priority', { ascending: false });

    if (error || !data || data.length === 0) {
      console.log('DB 동의어 조회 실패 또는 비어있음, 기본값 사용:', error?.message);
      return getDefaultSynonyms();
    }

    // 캐시 갱신
    synonymMappingsCache = { data, timestamp: Date.now() };
    return convertToSynonymObject(data);
  } catch (err) {
    console.error('동의어 매핑 조회 오류:', err);
    return getDefaultSynonyms();
  }
}

// DB 데이터를 검색용 객체로 변환
function convertToSynonymObject(mappings: any[]): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  for (const mapping of mappings) {
    result[mapping.primary_key] = mapping.synonyms || [];
  }
  return result;
}

// 기본 동의어 (DB 없을 때 폴백)
function getDefaultSynonyms(): Record<string, string[]> {
  return {
    // 대출 유형
    "신용대출": ["신용", "무담보", "신용론"],
    "담보대출": ["담보", "주담대", "주택담보", "하우스론"],
    "햇살론": ["햇살", "서민대출", "정부지원대출"],
    "사잇돌": ["사잇돌대출", "중금리"],
    // 직업 구분
    "4대가입": ["4대보험", "4대", "사대보험", "사대", "직장인", "회사원", "근로자", "월급쟁이", "정규직"],
    "직장인": ["회사원", "근로자", "월급쟁이", "정규직", "4대가입", "4대보험"],
    "미가입": ["4대보험없는", "4대없는", "보험없는", "미가입자", "4대미가입"],
    "4대보험없는": ["미가입", "4대없는", "보험없는", "미가입자"],
    "프리랜서": ["자유직", "프리", "비정규직", "자유계약", "1인사업자", "플랫폼노동자"],
    "개인사업자": ["자영업", "자영업자", "사업자", "개인사업", "소상공인", "자영업대출"],
    "자영업": ["자영업자", "사업자", "개인사업", "개인사업자", "소상공인"],
    "무직": ["무직자", "실업자", "미취업", "백수", "취준생"],
    "주부": ["전업주부", "주부론", "가정주부"],
    "청년": ["청년론", "사회초년생", "청년대출"],
    "개인회생": ["회생", "회생자", "파산"],
    "연금": ["연금수령", "국민연금", "퇴직연금"],
    // 금융 조건
    "금리": ["이자", "이율", "연이율", "금리대"],
    "한도": ["최대금액", "대출금액", "한도액", "대출한도"],
    "조건": ["자격", "요건", "기준", "대상"],
    // 근무형태
    "계약직": ["기간제", "단기계약"],
    "파견직": ["파견근무", "파견"],
    "일용직": ["일당제", "일용"],
  };
}

// 캐시 무효화
function invalidateSynonymCache() {
  synonymMappingsCache = { data: null, timestamp: 0 };
}

/**
 * 개선된 폴백 검색 (TF-IDF 기반)
 * - 키워드 가중치 적용
 * - depth3 상세 조건 검색 포함
 * - 동의어/유사어 처리 (DB에서 조회)
 */
async function fallbackSearch(message: string, supabase: SupabaseClient | null): Promise<{ response: string; guides: any[] }> {
  // 확장된 스탑워드 (조사, 어미, 일반적인 질문 패턴)
  // 주의: "없는", "있는" 등은 직업 조건 판단에 중요하므로 제외하지 않음
  const stopWords = new Set([
    "은", "는", "이", "가", "을", "를", "의", "에", "로", "으로", "와", "과", "도", "만",
    "뭐", "어떤", "어디", "뭘", "좀", "알려줘", "알려주세요", "있나요", "할수",
    "조건", "뭐야", "뭐에요", "하고", "해서", "하면", "되나요", "싶어요",
    "주세요", "부탁", "요", "데", "때", "것", "수", "거", "점"
    // "없는", "있는", "가능" 제외 (직업 조건 판단에 필요)
  ]);

  // DB에서 동의어 매핑 로드 (캐시됨)
  const synonyms = await getSynonymMappingsFromDB(supabase);

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

// Debug endpoint removed for security - was exposing API key prefix

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
    const { response, guides } = await fallbackSearch(message, supabase);
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

// 세션 목록 조회 (인증된 사용자 본인의 세션만)
app.get("/chat/sessions", async (c) => {
  const supabase = getSupabase(c.env);
  if (!supabase) {
    return c.json({ error: "Database not configured", total: 0, sessions: [] });
  }

  // 인증 확인 - 자신의 세션만 조회 가능
  const authHeader = c.req.header("Authorization");
  let userId: string | null = null;

  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    const { data: { user } } = await supabase.auth.getUser(token);
    userId = user?.id || null;
  }

  if (!userId) {
    return c.json({ error: "Authentication required", total: 0, sessions: [] }, 401);
  }

  const limit = Math.min(parseInt(c.req.query("limit") || "20"), 50);

  const { data: sessions, error } = await supabase
    .from('chat_sessions')
    .select('id, title, created_at, updated_at')
    .eq('user_id', userId) // 본인 세션만 조회
    .order('updated_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Sessions fetch error:", error);
    return c.json({ error: "세션 목록을 불러올 수 없습니다" }, 500);
  }

  return c.json({ total: sessions?.length || 0, sessions: sessions || [] });
});

// 특정 세션의 메시지 조회 (세션 소유자만)
app.get("/chat/sessions/:sessionId/messages", async (c) => {
  const sessionId = c.req.param("sessionId");
  if (!sessionId || !/^[0-9a-f-]{36}$/.test(sessionId)) {
    return c.json({ error: "Invalid session ID" }, 400);
  }

  const supabase = getSupabase(c.env);
  if (!supabase) {
    return c.json({ error: "Database not configured", sessionId, total: 0, messages: [] });
  }

  // 인증 확인 - 자신의 세션만 조회 가능
  const authHeader = c.req.header("Authorization");
  let userId: string | null = null;

  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    const { data: { user } } = await supabase.auth.getUser(token);
    userId = user?.id || null;
  }

  if (!userId) {
    return c.json({ error: "Authentication required" }, 401);
  }

  // 세션이 해당 사용자의 것인지 확인
  const { data: session } = await supabase
    .from('chat_sessions')
    .select('user_id')
    .eq('id', sessionId)
    .single();

  if (!session || session.user_id !== userId) {
    return c.json({ error: "Session not found or access denied" }, 404);
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

// ============================================
// Public Stats Summary (No Auth Required)
// ============================================

// 공개 통계 요약 (인증 불필요 - 관리자 페이지용)
app.get("/stats/summary", async (c) => {
  const supabase = getSupabase(c.env);
  const today = new Date().toISOString().split("T")[0];
  
  // Supabase에서 조회
  if (supabase) {
    try {
      // 모든 메시지 조회
      const { data: allMessages } = await supabase
        .from('chat_messages')
        .select('created_at, role');

      // 오늘 메시지 조회
      const { data: todayMessages } = await supabase
        .from('chat_messages')
        .select('created_at, role')
        .gte('created_at', `${today}T00:00:00`)
        .lt('created_at', `${today}T23:59:59`);

      // 최근 7일 데이터
      const last7Days: { date: string; chats: number; messages: number }[] = [];
      const statsByDate: Record<string, { chats: number; messages: number }> = {};

      allMessages?.forEach(msg => {
        const date = new Date(msg.created_at).toISOString().split('T')[0];
        if (!statsByDate[date]) {
          statsByDate[date] = { chats: 0, messages: 0 };
        }
        statsByDate[date].messages += 1;
        if (msg.role === 'user') {
          statsByDate[date].chats += 1;
        }
      });

      // 최근 7일만 포함
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateKey = date.toISOString().split("T")[0];
        const dayStat = statsByDate[dateKey];
        last7Days.push({
          date: dateKey,
          chats: dayStat?.chats || 0,
          messages: dayStat?.messages || 0,
        });
      }

      // 오늘 통계
      let todayChatsCount = 0;
      let todayMessagesCount = 0;
      todayMessagesCount = todayMessages ? todayMessages.length : 0;
      todayChatsCount = todayMessages ? todayMessages.filter(m => m.role === 'user').length : 0;

      return c.json({
        timestamp: new Date().toISOString(),
        overview: {
          totalChats: allMessages?.filter(m => m.role === 'user').length || 0,
          totalMessages: allMessages?.length || 0,
          totalTokens: 0,
          totalCostKrw: 0,
          todayChats: todayChatsCount,
          todayMessages: todayMessagesCount,
          guidesCount: (loanGuides as any[]).length,
        },
        trends: {
          last7Days,
        },
        topSearches: [...searchQueries]
          .sort((a, b) => b.count - a.count)
          .slice(0, 10)
          .map((s) => ({ query: s.query, count: s.count })),
      });
    } catch (error) {
      console.error("Stats summary query error:", error);
    }
  }

  // Fallback: 메모리 기반
  const todayStats = dailyStatsMap.get(today);

  // 전체 통계 계산
  let totalChats = 0;
  let totalMessages = 0;
  let totalTokens = 0;
  let totalCostUsd = 0;

  for (const stats of dailyStatsMap.values()) {
    totalChats += stats.chatCount;
    totalMessages += stats.messageCount;
    totalTokens += stats.totalInputTokens + stats.totalOutputTokens;
    totalCostUsd += stats.totalCostUsd;
  }

  // 최근 7일 데이터
  const last7Days: { date: string; chats: number; messages: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateKey = date.toISOString().split("T")[0];
    const stats = dailyStatsMap.get(dateKey);
    last7Days.push({
      date: dateKey,
      chats: stats?.chatCount || 0,
      messages: stats?.messageCount || 0,
    });
  }

  return c.json({
    timestamp: new Date().toISOString(),
    overview: {
      totalChats,
      totalMessages,
      totalTokens,
      totalCostKrw: Math.round(totalCostUsd * 1450),
      todayChats: todayStats?.chatCount || 0,
      todayMessages: todayStats?.messageCount || 0,
      guidesCount: (loanGuides as any[]).length,
    },
    trends: {
      last7Days,
    },
    topSearches: [...searchQueries]
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map((s) => ({ query: s.query, count: s.count })),
  });
});

// ============================================
// Protected Stats Routes (Admin Only)
// ============================================

// 통계 대시보드 데이터
app.get("/stats/dashboard", requireAdmin, async (c) => {
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
app.get("/stats/tokens", requireAdmin, async (c) => {
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
app.get("/stats/daily", requireAdmin, async (c) => {
  const days = Math.min(parseInt(c.req.query("days") || "30"), 90);
  const supabase = getSupabase(c.env);
  const stats: {
    date: string;
    chatCount: number;
    messageCount: number;
    apiCallCount: number;
    totalTokens: number;
    totalCostUsd: number;
    activeUsers: number;
  }[] = [];

  // Supabase에서 데이터 조회
  if (supabase) {
    try {
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - days);
      
      // chat_messages로부터 일별 통계 조회
      const { data: messages } = await supabase
        .from('chat_messages')
        .select('created_at, role')
        .gte('created_at', fromDate.toISOString());

      // 날짜별로 그룹핑
      const statsByDate: Record<string, { chats: number; messages: number }> = {};
      
      messages?.forEach(msg => {
        const date = new Date(msg.created_at).toISOString().split('T')[0];
        if (!statsByDate[date]) {
          statsByDate[date] = { chats: 0, messages: 0 };
        }
        statsByDate[date].messages += 1;
        if (msg.role === 'user') {
          statsByDate[date].chats += 1;
        }
      });

      // 날짜 범위 채우기
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateKey = date.toISOString().split("T")[0];
        const dayStat = statsByDate[dateKey];

        stats.push({
          date: dateKey,
          chatCount: dayStat?.chats || 0,
          messageCount: dayStat?.messages || 0,
          apiCallCount: dayStat?.messages || 0,
          totalTokens: 0, // 토큰 데이터가 없으면 0
          totalCostUsd: 0,
          activeUsers: 0,
        });
      }
    } catch (error) {
      console.error("Stats daily query error:", error);
    }
  } else {
    // Fallback: 메모리 기반
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
  }

  return c.json({ days, stats });
});

// 상품 조회 통계
app.get("/stats/guides", requireAdmin, async (c) => {
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
app.get("/stats/searches", requireAdmin, async (c) => {
  const limit = Math.min(parseInt(c.req.query("limit") || "20"), 100);

  const searches = [...searchQueries]
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);

  return c.json({
    total: searchQueries.length,
    searches,
  });
});

// 플랜 정보 (public - 요금제 정보는 공개)
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
// Protected Admin API Endpoints (Admin Only)
// ============================================

// 상품 분류 매핑 정보
app.get("/admin/product-mappings", requireAdmin, async (c) => {
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

// ============================================
// Synonym Mapping CRUD API
// ============================================

// GET: 모든 동의어 매핑 조회
app.get("/admin/synonyms", requireAdmin, async (c) => {
  const supabase = getSupabase(c.env);

  if (!supabase) {
    // DB 없으면 기본값 반환
    const defaults = getDefaultSynonyms();
    const mappings = Object.entries(defaults).map(([key, synonyms], idx) => ({
      id: `default-${idx}`,
      category: '기타',
      primary_key: key,
      synonyms,
      description: null,
      is_active: true,
      priority: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));
    return c.json({ mappings, source: 'default' });
  }

  try {
    const { data, error } = await supabase
      .from('synonym_mappings')
      .select('*')
      .order('category')
      .order('priority', { ascending: false });

    if (error) {
      console.error('동의어 조회 오류:', error);
      return c.json({ error: '동의어 목록을 가져올 수 없습니다' }, 500);
    }

    return c.json({ mappings: data || [], source: 'database' });
  } catch (err) {
    console.error('동의어 API 오류:', err);
    return c.json({ error: '서버 오류가 발생했습니다' }, 500);
  }
});

// POST: 새 동의어 매핑 추가
app.post("/admin/synonyms", requireAdmin, async (c) => {
  const supabase = getSupabase(c.env);

  if (!supabase) {
    return c.json({ error: '데이터베이스가 설정되지 않았습니다' }, 503);
  }

  try {
    const body = await c.req.json();
    const { category, primary_key, synonyms, description, priority } = body;

    // 유효성 검사
    if (!category || !primary_key || !synonyms || !Array.isArray(synonyms)) {
      return c.json({ error: 'category, primary_key, synonyms(배열)는 필수입니다' }, 400);
    }

    if (synonyms.length === 0) {
      return c.json({ error: '최소 하나 이상의 동의어가 필요합니다' }, 400);
    }

    const { data, error } = await supabase
      .from('synonym_mappings')
      .insert({
        category: category.trim(),
        primary_key: primary_key.trim(),
        synonyms: synonyms.map((s: string) => s.trim()).filter(Boolean),
        description: description?.trim() || null,
        priority: priority || 0,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return c.json({ error: '이미 존재하는 키워드입니다 (같은 카테고리 내)' }, 409);
      }
      console.error('동의어 추가 오류:', error);
      return c.json({ error: '동의어 추가에 실패했습니다' }, 500);
    }

    // 캐시 무효화
    invalidateSynonymCache();

    return c.json({ success: true, mapping: data });
  } catch (err) {
    console.error('동의어 추가 API 오류:', err);
    return c.json({ error: '서버 오류가 발생했습니다' }, 500);
  }
});

// PUT: 동의어 매핑 수정
app.put("/admin/synonyms/:id", requireAdmin, async (c) => {
  const supabase = getSupabase(c.env);

  if (!supabase) {
    return c.json({ error: '데이터베이스가 설정되지 않았습니다' }, 503);
  }

  const id = c.req.param('id');

  try {
    const body = await c.req.json();
    const { category, primary_key, synonyms, description, priority, is_active } = body;

    const updateData: any = {};
    if (category !== undefined) updateData.category = category.trim();
    if (primary_key !== undefined) updateData.primary_key = primary_key.trim();
    if (synonyms !== undefined) {
      if (!Array.isArray(synonyms) || synonyms.length === 0) {
        return c.json({ error: '동의어는 최소 1개 이상의 배열이어야 합니다' }, 400);
      }
      updateData.synonyms = synonyms.map((s: string) => s.trim()).filter(Boolean);
    }
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (priority !== undefined) updateData.priority = priority;
    if (is_active !== undefined) updateData.is_active = is_active;

    if (Object.keys(updateData).length === 0) {
      return c.json({ error: '수정할 필드가 없습니다' }, 400);
    }

    const { data, error } = await supabase
      .from('synonym_mappings')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return c.json({ error: '이미 존재하는 키워드입니다' }, 409);
      }
      console.error('동의어 수정 오류:', error);
      return c.json({ error: '동의어 수정에 실패했습니다' }, 500);
    }

    if (!data) {
      return c.json({ error: '해당 동의어를 찾을 수 없습니다' }, 404);
    }

    // 캐시 무효화
    invalidateSynonymCache();

    return c.json({ success: true, mapping: data });
  } catch (err) {
    console.error('동의어 수정 API 오류:', err);
    return c.json({ error: '서버 오류가 발생했습니다' }, 500);
  }
});

// DELETE: 동의어 매핑 삭제
app.delete("/admin/synonyms/:id", requireAdmin, async (c) => {
  const supabase = getSupabase(c.env);

  if (!supabase) {
    return c.json({ error: '데이터베이스가 설정되지 않았습니다' }, 503);
  }

  const id = c.req.param('id');

  try {
    const { error } = await supabase
      .from('synonym_mappings')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('동의어 삭제 오류:', error);
      return c.json({ error: '동의어 삭제에 실패했습니다' }, 500);
    }

    // 캐시 무효화
    invalidateSynonymCache();

    return c.json({ success: true, message: '동의어가 삭제되었습니다' });
  } catch (err) {
    console.error('동의어 삭제 API 오류:', err);
    return c.json({ error: '서버 오류가 발생했습니다' }, 500);
  }
});

// 404 Handler
app.notFound((c) => {
  return c.json({ error: "Not Found" }, 404);
});

// Error Handler (에러 노출 차단)
app.onError((err, c) => {
  const isDev = c.env?.ENVIRONMENT === "development";

  // 프로덕션에서는 상세 에러 로깅만 하고 사용자에게는 일반적인 메시지만 반환
  console.error(`Error: ${err.message}`, isDev ? err.stack : "");

  // Audit Log에 에러 기록
  const clientIP = c.req.header("cf-connecting-ip") ||
    c.req.header("x-forwarded-for")?.split(",")[0] ||
    "anonymous";

  addAuditLog({
    timestamp: new Date().toISOString(),
    action: "SERVER_ERROR",
    ip: clientIP,
    userAgent: c.req.header("User-Agent"),
    path: c.req.path,
    method: c.req.method,
    details: isDev ? { message: err.message } : undefined,
  });

  // sanitizeError로 안전한 에러 메시지 반환
  const safeError = sanitizeError(err, isDev);
  return c.json({ error: safeError.message }, 500);
});

// ============================================
// Admin Audit Log Endpoint
// ============================================
app.get("/admin/audit-logs", requireAdmin, async (c) => {
  const limit = Math.min(parseInt(c.req.query("limit") || "100"), 500);
  const logs = getAuditLogs(limit);
  return c.json({ total: logs.length, logs });
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

