import { Hono } from "hono";
import { cors } from "hono/cors";
import { handle } from "hono/cloudflare-pages";

// Gemini SDK
import { GoogleGenAI } from "@google/genai";

// 로컬 데이터
import loanGuides from "../loan_guides.json";

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
  const results = (loanGuides as any[])
    .filter((g) => {
      const searchText = [g.pfi_name, g.depth1, g.depth2, g.fi_memo, JSON.stringify(g.depth3)]
        .join(" ")
        .toLowerCase();
      return searchText.includes(query);
    })
    .slice(0, 10)
    .map((g) => ({
      item_cd: g.item_cd,
      company: g.pfi_name,
      category: g.depth1,
      product_type: g.depth2,
      memo: g.fi_memo?.slice(0, 150),
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
      contents: `당신은 대출 상담 전문 AI 어시스턴트입니다.

응답 규칙:
1. 사용자 질문에 맞는 대출 상품을 찾아 안내하세요
2. 금융사명, 상품유형, 대상, 한도, 금리 등 핵심 정보를 포함하세요
3. 여러 상품이 해당되면 최대 3개까지 비교 안내하세요
4. 한국어로 친절하게 답변하세요
5. 정확한 정보만 전달하고, 모르면 모른다고 하세요
6. 마지막에 "더 자세한 조건이 궁금하시면 금융사명을 말씀해주세요"를 추가하세요

사용자 질문: ${userMessage}`,
      config: {
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

    return { response: responseText, guides, usage };
  } catch (error: any) {
    console.error("Gemini generation error:", error);
    throw error;
  }
}

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

function fallbackSearch(message: string): { response: string; guides: any[] } {
  const stopWords = [
    "은", "는", "이", "가", "을", "를", "의", "에", "로", "으로", "와", "과", "도", "만",
    "뭐", "어떤", "어디", "뭘", "좀", "알려줘", "알려주세요", "있어", "있나요", "할수",
    "가능", "조건", "뭐야", "뭐에요",
  ];

  const keywords = message
    .toLowerCase()
    .replace(/[?!.,]/g, "")
    .split(/\s+/)
    .filter((word) => word.length > 1 && !stopWords.includes(word));

  const results: any[] = [];

  for (const guide of loanGuides as any[]) {
    const searchText = [guide.pfi_name, guide.depth1, guide.depth2, guide.fi_memo]
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

  let response = `**${guides.length}개의 관련 가이드를 찾았습니다:**\n\n`;
  for (const guide of guides) {
    response += `### ${guide.company} - ${guide.product_type}\n`;
    response += `${guide.summary}\n\n`;
  }
  response += `\n상세 정보가 필요하시면 금융사명이나 상품명을 말씀해주세요.`;

  return { response, guides };
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
    const apiKey = c.env?.GEMINI_API_KEY;
    const fileSearchStoreName = c.env?.FILE_SEARCH_STORE_NAME;

    // 검색어 기록
    recordSearch(message);

    if (apiKey && fileSearchStoreName) {
      try {
        const { response, guides, usage } = await generateGeminiResponse(
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

        return c.json({
          query: message,
          response,
          guides,
          source: "gemini",
          usage,
        });
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

    return c.json({ query: message, response, guides, source: "keyword" });
  } catch (error) {
    console.error("Chat error:", error);
    return c.json({ error: "Failed to process message" }, 500);
  }
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

