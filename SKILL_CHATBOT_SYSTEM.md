# Chatbot SaaS System - Build Skill

AI 챗봇 SaaS 시스템 구축을 위한 종합 가이드

---

## 1. 프로젝트 구조

### 권장 모노레포 구조

```
project/
├── apps/
│   ├── web/              # Frontend (React/Vue/Svelte)
│   ├── server/           # API Server (Node.js)
│   └── admin/            # Admin Dashboard (optional)
├── packages/
│   ├── shared/           # Shared types, utils
│   ├── ui/               # Shared UI components
│   └── config/           # Shared configs (ESLint, TS)
├── scripts/              # Setup, migration scripts
├── data/                 # Static data files (JSON, CSV)
└── docs/                 # Documentation
```

### 패키지 매니저 선택

| 도구 | 장점 | 단점 |
|------|------|------|
| **Bun** | 빠름, 올인원 | 생태계 작음 |
| **pnpm** | 효율적, 안정적 | 설정 복잡 |
| **npm** | 범용, 안정 | 느림 |

---

## 2. 데이터 준비 가이드

### 지식 베이스 파일 포맷

| 포맷 | 장점 | 단점 | 추천 용도 |
|------|------|------|-----------|
| **Markdown** | 구조화, 가독성 | 이미지 처리 복잡 | 기술 문서 |
| **TXT** | 단순, 범용 | 구조화 어려움 | 짧은 FAQ |
| **PDF** | 원본 유지 | 추출 품질 변동 | 공식 문서 |
| **JSON** | 구조화, 메타데이터 | 직접 읽기 어려움 | 상품 정보 |

### 문서 전처리 패턴

```typescript
// scripts/prepare-data.ts
import * as fs from "fs/promises";
import * as path from "path";

interface Document {
  id: string;
  title: string;
  content: string;
  metadata: Record<string, any>;
}

// 1. 마크다운 문서 분할
function splitMarkdown(content: string, maxLength = 2000): string[] {
  const sections = content.split(/\n#{1,3}\s/);
  const chunks: string[] = [];

  for (const section of sections) {
    if (section.length <= maxLength) {
      chunks.push(section.trim());
    } else {
      // 긴 섹션은 단락 단위로 분할
      const paragraphs = section.split("\n\n");
      let current = "";
      for (const p of paragraphs) {
        if ((current + p).length > maxLength) {
          if (current) chunks.push(current.trim());
          current = p;
        } else {
          current += "\n\n" + p;
        }
      }
      if (current) chunks.push(current.trim());
    }
  }

  return chunks.filter(c => c.length > 50);
}

// 2. JSON 상품 데이터 → 텍스트 변환
function productToText(product: any): string {
  return `
## ${product.name}

- 카테고리: ${product.category}
- 가격: ${product.price}
- 특징: ${product.features.join(", ")}

${product.description}

### 상세 정보
${Object.entries(product.details)
  .map(([k, v]) => `- ${k}: ${v}`)
  .join("\n")}
`.trim();
}

// 3. 배치 처리
async function prepareDataFiles(inputDir: string, outputDir: string) {
  const files = await fs.readdir(inputDir);

  for (const file of files) {
    const content = await fs.readFile(path.join(inputDir, file), "utf-8");
    let outputContent: string;

    if (file.endsWith(".json")) {
      const data = JSON.parse(content);
      outputContent = Array.isArray(data)
        ? data.map(productToText).join("\n\n---\n\n")
        : productToText(data);
    } else {
      outputContent = content;
    }

    await fs.writeFile(
      path.join(outputDir, file.replace(/\.[^.]+$/, ".txt")),
      outputContent
    );
  }
}
```

### 문서 품질 체크리스트

- [ ] 각 문서에 명확한 제목 포함
- [ ] 중복 내용 제거
- [ ] 최신 정보로 업데이트
- [ ] 일관된 용어 사용
- [ ] 메타데이터 (날짜, 카테고리) 포함
- [ ] 2000자 이하로 청킹

### 데이터 디렉토리 구조

```
data/
├── raw/                 # 원본 데이터
│   ├── products.json
│   ├── guides/
│   └── faq.md
├── processed/           # 전처리된 데이터
│   ├── products.txt
│   ├── guide-001.txt
│   └── faq.txt
└── scripts/
    ├── prepare.ts       # 전처리 스크립트
    └── upload.ts        # Store 업로드 스크립트
```

---

## 3. 기술 스택 옵션

### Backend Framework

| Framework | 특징 | 추천 환경 |
|-----------|------|-----------|
| **Hono** | 경량, Edge 최적화 | Cloudflare, Vercel Edge |
| **Express** | 범용, 생태계 풍부 | 전통적 서버 |
| **Fastify** | 고성능, 스키마 검증 | 대규모 API |
| **NestJS** | 엔터프라이즈급, DI | 복잡한 비즈니스 로직 |

### Frontend Framework

| Framework | 특징 | 추천 용도 |
|-----------|------|-----------|
| **React** | 생태계 최대, 유연 | 범용 |
| **Vue** | 쉬운 학습, 템플릿 | 빠른 개발 |
| **Svelte** | 번들 최소, 빠름 | 성능 중시 |
| **Next.js** | SSR, 풀스택 | SEO 필요시 |

### Database

| DB | 특징 | 추천 용도 |
|----|------|-----------|
| **Supabase** | PostgreSQL + Auth + Realtime | 빠른 MVP |
| **Firebase** | NoSQL, 실시간 | 모바일 앱 |
| **PlanetScale** | MySQL, 브랜칭 | 스케일 필요시 |
| **Neon** | Serverless PostgreSQL | Edge 환경 |
| **Cloudflare D1** | SQLite, Edge | Cloudflare 생태계 |

---

## 4. AI/RAG 시스템 구성

### AI Provider 비교

| Provider | 모델 | 특징 | 가격 |
|----------|------|------|------|
| **Google Gemini** | gemini-2.5-flash | File Search API, 저렴 | $0.075/1M tokens |
| **OpenAI** | gpt-4o | 범용 최고 성능 | $5/1M tokens |
| **Anthropic** | claude-3.5-sonnet | 긴 컨텍스트, 코딩 | $3/1M tokens |
| **Groq** | llama-3.1-70b | 초고속 응답 | $0.59/1M tokens |

### RAG 아키텍처 옵션

#### Option 1: File Search API (Managed RAG)
```
데이터 파일 → AI Provider 업로드 → 자동 임베딩/인덱싱
                                        ↓
사용자 질문 → AI + File Search Tool → 응답
```

**장점**: 구현 간단, 관리 불필요
**단점**: Provider 종속, 커스터마이징 제한

**지원**: Gemini File Search, OpenAI Assistants

#### Option 2: Vector DB + Embeddings (Custom RAG)
```
데이터 → Embedding 모델 → Vector DB 저장
                              ↓
사용자 질문 → 유사도 검색 → 컨텍스트 + LLM → 응답
```

**장점**: 완전한 제어, Provider 독립
**단점**: 구현 복잡, 인프라 관리 필요

**Vector DB 옵션**:
- **Pinecone**: 관리형, 스케일
- **Weaviate**: 오픈소스, 하이브리드 검색
- **Qdrant**: 오픈소스, 고성능
- **Cloudflare Vectorize**: Edge 환경
- **Supabase pgvector**: PostgreSQL 통합

#### Option 3: Hybrid (추천)
```
1차: 키워드/필터 검색 (빠름)
2차: Vector 유사도 검색 (정확)
3차: LLM 응답 생성
```

### File Search Store 관리 (Gemini)

```typescript
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Store 생성
async function createStore(displayName: string) {
  const store = await ai.fileSearchStores.create({ displayName });
  console.log(`Store created: ${store.name}`);
  return store;
}

// 파일 업로드 및 Store에 추가
async function uploadToStore(storeName: string, filePath: string) {
  // 1. 파일 업로드
  const file = await ai.files.upload({
    file: filePath,
    config: { displayName: path.basename(filePath) }
  });

  // 2. Store에 파일 추가
  await ai.fileSearchStores.update({
    name: storeName,
    update: { addFiles: [file.name] }
  });

  return file;
}

// 여러 파일 일괄 업로드
async function bulkUpload(storeName: string, directory: string) {
  const files = await fs.readdir(directory);
  const results = [];

  for (const file of files) {
    if (file.endsWith(".txt") || file.endsWith(".md") || file.endsWith(".pdf")) {
      const result = await uploadToStore(storeName, path.join(directory, file));
      results.push(result);
      console.log(`Uploaded: ${file}`);
    }
  }

  return results;
}

// Store에서 파일 제거
async function removeFromStore(storeName: string, fileName: string) {
  await ai.fileSearchStores.update({
    name: storeName,
    update: { removeFiles: [fileName] }
  });
}

// Store 목록 조회
async function listStores() {
  const stores = await ai.fileSearchStores.list();
  return stores;
}

// Store 내 파일 목록 조회
async function listStoreFiles(storeName: string) {
  const store = await ai.fileSearchStores.get({ name: storeName });
  return store.files;
}
```

**지식 베이스 업데이트 전략**:
```
1. 버전 관리: data/v1/, data/v2/ 디렉토리로 버전별 관리
2. 점진적 업데이트: 변경된 파일만 업데이트
3. A/B 테스트: 두 개의 Store를 유지하여 비교
4. 롤백: 이전 버전 Store로 즉시 전환 가능
```

### RAG 구현 코드 패턴

```typescript
// ===== Option 1: Gemini File Search =====
import { GoogleGenAI } from "@google/genai";

async function chatWithFileSearch(query: string) {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: query,
    config: {
      systemInstruction: "당신은 전문 상담 AI입니다...",
      tools: [{
        fileSearch: {
          fileSearchStoreNames: [process.env.FILE_SEARCH_STORE_NAME]
        }
      }]
    }
  });

  return response.text;
}

// ===== Option 2: OpenAI Assistants (File Search) =====
import OpenAI from "openai";

const openai = new OpenAI();

// Assistant 생성 (1회)
async function createAssistant() {
  const assistant = await openai.beta.assistants.create({
    name: "상담 AI",
    instructions: "당신은 전문 상담 AI입니다...",
    model: "gpt-4o",
    tools: [{ type: "file_search" }]
  });
  return assistant;
}

// Vector Store 생성 및 파일 업로드
async function createVectorStore(files: string[]) {
  const vectorStore = await openai.beta.vectorStores.create({
    name: "Knowledge Base"
  });

  await openai.beta.vectorStores.fileBatches.uploadAndPoll(
    vectorStore.id,
    { files: files.map(f => fs.createReadStream(f)) }
  );

  return vectorStore;
}

// Assistant에 Vector Store 연결
async function attachVectorStore(assistantId: string, vectorStoreId: string) {
  await openai.beta.assistants.update(assistantId, {
    tool_resources: {
      file_search: { vector_store_ids: [vectorStoreId] }
    }
  });
}

// 대화
async function chatWithAssistant(assistantId: string, query: string) {
  const thread = await openai.beta.threads.create();

  await openai.beta.threads.messages.create(thread.id, {
    role: "user",
    content: query
  });

  const run = await openai.beta.threads.runs.createAndPoll(thread.id, {
    assistant_id: assistantId
  });

  const messages = await openai.beta.threads.messages.list(thread.id);
  return messages.data[0].content[0].text.value;
}

// ===== Option 3: Custom Vector DB =====
import { createClient } from "@supabase/supabase-js";

async function chatWithVectorRAG(query: string) {
  const openai = new OpenAI();
  const supabase = createClient(url, key);

  // 1. Query embedding
  const embedding = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: query
  });

  // 2. Vector search
  const { data: docs } = await supabase.rpc("match_documents", {
    query_embedding: embedding.data[0].embedding,
    match_count: 5
  });

  // 3. LLM with context
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: "당신은 전문 상담 AI입니다..." },
      { role: "user", content: `Context:\n${docs.map(d => d.content).join("\n")}\n\nQuestion: ${query}` }
    ]
  });

  return response.choices[0].message.content;
}

// ===== Option 4: Fallback Pattern =====
async function chatWithFallback(query: string) {
  // 1. Try AI RAG
  try {
    return await chatWithFileSearch(query);
  } catch (error) {
    console.error("AI failed, falling back to keyword search");
  }

  // 2. Fallback to keyword search
  return keywordSearch(query);
}
```

### 에러 핸들링 & 재시도

```typescript
// lib/ai-client.ts
interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
}

async function withRetry<T>(
  fn: () => Promise<T>,
  config: RetryConfig = { maxRetries: 3, baseDelay: 1000, maxDelay: 10000 }
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      // 재시도 불가능한 에러
      if (error.status === 400 || error.status === 401) {
        throw error;
      }

      // Rate limit - 더 오래 대기
      if (error.status === 429) {
        const delay = Math.min(config.baseDelay * Math.pow(2, attempt + 2), config.maxDelay);
        await sleep(delay);
        continue;
      }

      // 일반 에러 - exponential backoff
      if (attempt < config.maxRetries) {
        const delay = Math.min(config.baseDelay * Math.pow(2, attempt), config.maxDelay);
        await sleep(delay);
      }
    }
  }

  throw lastError!;
}

// 사용
async function generateResponse(query: string) {
  return withRetry(() => ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: query
  }));
}
```

### 캐싱 전략

```typescript
// lib/cache.ts
import { LRUCache } from "lru-cache";

// 인메모리 캐시 (개발/소규모)
const responseCache = new LRUCache<string, CachedResponse>({
  max: 1000,
  ttl: 1000 * 60 * 60, // 1시간
});

interface CachedResponse {
  response: string;
  sources: Source[];
  cachedAt: number;
}

// 캐시 키 생성 (정규화)
function getCacheKey(query: string): string {
  return query.toLowerCase().trim().replace(/\s+/g, " ");
}

// 캐시된 응답 조회
async function getCachedResponse(query: string): Promise<CachedResponse | null> {
  const key = getCacheKey(query);
  return responseCache.get(key) || null;
}

// 응답 캐시 저장
async function cacheResponse(query: string, response: ChatResponse): Promise<void> {
  const key = getCacheKey(query);
  responseCache.set(key, {
    response: response.response,
    sources: response.sources,
    cachedAt: Date.now()
  });
}

// Redis 캐시 (프로덕션)
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL,
  token: process.env.UPSTASH_REDIS_TOKEN
});

async function getCachedResponseRedis(query: string): Promise<CachedResponse | null> {
  const key = `chat:${getCacheKey(query)}`;
  return redis.get(key);
}

async function cacheResponseRedis(query: string, response: ChatResponse, ttl = 3600): Promise<void> {
  const key = `chat:${getCacheKey(query)}`;
  await redis.set(key, response, { ex: ttl });
}
```

### 비용 최적화

```typescript
// 1. 토큰 사용량 추적
interface UsageTracker {
  inputTokens: number;
  outputTokens: number;
  requests: number;
}

const dailyUsage: Map<string, UsageTracker> = new Map();

function trackUsage(userId: string, input: number, output: number) {
  const today = new Date().toISOString().split("T")[0];
  const key = `${userId}:${today}`;

  const current = dailyUsage.get(key) || { inputTokens: 0, outputTokens: 0, requests: 0 };
  dailyUsage.set(key, {
    inputTokens: current.inputTokens + input,
    outputTokens: current.outputTokens + output,
    requests: current.requests + 1
  });
}

// 2. 사용량 제한
const DAILY_LIMIT = 100000; // 토큰

async function checkQuota(userId: string): Promise<boolean> {
  const today = new Date().toISOString().split("T")[0];
  const usage = dailyUsage.get(`${userId}:${today}`);
  return !usage || (usage.inputTokens + usage.outputTokens) < DAILY_LIMIT;
}

// 3. 모델 자동 선택 (비용 vs 품질)
function selectModel(query: string): string {
  // 간단한 질문 → 저렴한 모델
  if (query.length < 50) return "gemini-2.0-flash-lite";
  // 복잡한 질문 → 고성능 모델
  return "gemini-2.5-flash";
}

// 4. 프롬프트 최적화
const SYSTEM_PROMPT_SHORT = "전문 상담 AI. 간결하게 답변.";
const SYSTEM_PROMPT_FULL = "당신은 전문 상담 AI입니다. 사용자의 질문에...";

function getSystemPrompt(complexity: "simple" | "complex"): string {
  return complexity === "simple" ? SYSTEM_PROMPT_SHORT : SYSTEM_PROMPT_FULL;
}
```

**비용 절감 팁**:
| 전략 | 예상 절감 |
|------|----------|
| 응답 캐싱 | 30-50% |
| 모델 자동 선택 | 20-40% |
| 프롬프트 최적화 | 10-20% |
| 배치 처리 | 15-25% |

---

## 5. API 설계 패턴

### RESTful Endpoints

```
POST   /api/chat              # 챗봇 메시지 전송
GET    /api/chat/history      # 대화 히스토리
DELETE /api/chat/history/:id  # 히스토리 삭제

GET    /api/documents         # 문서 목록
GET    /api/documents/:id     # 문서 상세
POST   /api/documents/search  # 문서 검색

GET    /api/health            # 헬스체크
GET    /api/config            # 클라이언트 설정
```

### Chat API 스키마

```typescript
// Request
interface ChatRequest {
  message: string;
  sessionId?: string;
  context?: {
    documentIds?: string[];
    filters?: Record<string, any>;
  };
}

// Response
interface ChatResponse {
  query: string;
  response: string;
  sources: {
    id: string;
    title: string;
    relevance: number;
    excerpt?: string;
  }[];
  metadata: {
    source: "ai" | "keyword" | "cache";
    latency: number;
    model?: string;
  };
}
```

### Streaming Response (SSE)

```typescript
// Server
app.post("/api/chat/stream", async (c) => {
  const { message } = await c.req.json();

  return streamSSE(c, async (stream) => {
    const response = await ai.generateContentStream({
      model: "gemini-2.5-flash",
      contents: message
    });

    for await (const chunk of response) {
      await stream.writeSSE({
        data: JSON.stringify({ text: chunk.text() })
      });
    }
  });
});

// Client
const eventSource = new EventSource("/api/chat/stream");
eventSource.onmessage = (e) => {
  const { text } = JSON.parse(e.data);
  appendToChat(text);
};
```

---

## 6. Frontend 패턴

### 챗봇 UI 컴포넌트 구조

```
components/
├── chat/
│   ├── ChatContainer.tsx    # 메인 컨테이너
│   ├── MessageList.tsx      # 메시지 목록
│   ├── MessageBubble.tsx    # 개별 메시지
│   ├── InputArea.tsx        # 입력 영역
│   ├── TypingIndicator.tsx  # 타이핑 표시
│   └── SourceCard.tsx       # 출처 카드
├── common/
│   ├── Modal.tsx
│   ├── Button.tsx
│   └── Loading.tsx
└── layout/
    ├── Header.tsx
    ├── Sidebar.tsx
    └── Footer.tsx
```

### 상태 관리 (Zustand)

```typescript
import { create } from "zustand";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
  timestamp: Date;
}

interface ChatStore {
  messages: Message[];
  isLoading: boolean;
  error: string | null;

  sendMessage: (content: string) => Promise<void>;
  clearHistory: () => void;
}

export const useChatStore = create<ChatStore>((set, get) => ({
  messages: [],
  isLoading: false,
  error: null,

  sendMessage: async (content) => {
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content,
      timestamp: new Date()
    };

    set(state => ({
      messages: [...state.messages, userMessage],
      isLoading: true,
      error: null
    }));

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: content })
      });

      const data = await res.json();

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.response,
        sources: data.sources,
        timestamp: new Date()
      };

      set(state => ({
        messages: [...state.messages, assistantMessage],
        isLoading: false
      }));
    } catch (error) {
      set({ error: "Failed to send message", isLoading: false });
    }
  },

  clearHistory: () => set({ messages: [] })
}));
```

### 마크다운 렌더링

```typescript
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

function MessageBubble({ content, role }: { content: string; role: string }) {
  return (
    <div className={`message ${role}`}>
      {role === "assistant" ? (
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {content}
        </ReactMarkdown>
      ) : (
        <p>{content}</p>
      )}
    </div>
  );
}
```

---

## 7. 보안 체크리스트

### API 보안

```typescript
// Rate Limiting
app.use("/api/*", rateLimit({
  windowMs: 60 * 1000,  // 1분
  max: 100,             // 요청 수
  keyGenerator: (c) => c.req.header("x-forwarded-for") || "anonymous"
}));

// Request Size Limit
app.use("/api/*", requestSizeLimit(10 * 1024)); // 10KB

// Input Validation
function validateMessage(message: unknown): ValidationResult {
  if (typeof message !== "string") {
    return { valid: false, error: "Message must be a string" };
  }
  if (message.length > 1000) {
    return { valid: false, error: "Message too long" };
  }
  // XSS prevention
  const sanitized = message
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return { valid: true, sanitized };
}

// Security Headers
app.use("*", async (c, next) => {
  await next();
  c.header("X-Content-Type-Options", "nosniff");
  c.header("X-Frame-Options", "DENY");
  c.header("X-XSS-Protection", "1; mode=block");
  c.header("Content-Security-Policy", "default-src 'self'");
});
```

### 환경변수 관리

```bash
# .env.example (커밋됨)
AI_API_KEY=
DATABASE_URL=
AUTH_SECRET=

# .env.local (커밋 안됨)
AI_API_KEY=actual_key_here
```

### 시크릿 체크리스트

- [ ] API 키 환경변수로 관리
- [ ] .gitignore에 .env 파일 추가
- [ ] 프로덕션 시크릿 별도 관리 (Vault, Secret Manager)
- [ ] API 키 rotation 정책

---

## 8. 배포 옵션

### 플랫폼 비교

| 플랫폼 | 특징 | 가격 | 추천 용도 |
|--------|------|------|-----------|
| **Vercel** | 간편, Next.js 최적화 | 무료~ | 빠른 배포 |
| **Cloudflare** | Edge, 저렴 | 무료~ | 글로벌 서비스 |
| **Google Cloud Run** | 컨테이너, 서울 리전 | 무료~ | 한국 서비스 |
| **AWS Lambda** | 성숙, 풍부한 서비스 | 종량제 | 엔터프라이즈 |
| **Railway** | 간편, 다양한 서비스 | $5~ | 풀스택 앱 |

### Cloud Run 배포 (권장)

```dockerfile
# Dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
RUN npm install --production
ENV PORT=8080
EXPOSE 8080
CMD ["node", "dist/index.js"]
```

```yaml
# cloudbuild.yaml
steps:
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'gcr.io/$PROJECT_ID/chatbot', '.']
  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', 'gcr.io/$PROJECT_ID/chatbot']
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    args:
      - 'run'
      - 'deploy'
      - 'chatbot'
      - '--image=gcr.io/$PROJECT_ID/chatbot'
      - '--region=asia-northeast3'
      - '--platform=managed'
      - '--allow-unauthenticated'
```

### Vercel 배포

```json
// vercel.json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "functions": {
    "api/**/*.ts": {
      "runtime": "nodejs20.x"
    }
  }
}
```

---

## 9. 인증 시스템

### Supabase Auth

```typescript
// lib/supabase.ts
import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

// OAuth 로그인
export async function signInWithGoogle() {
  return supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${window.location.origin}/auth/callback` }
  });
}

// 세션 확인
export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}
```

### JWT 미들웨어

```typescript
// middleware/auth.ts
import { verify } from "hono/jwt";

export function authMiddleware() {
  return async (c: Context, next: Next) => {
    const token = c.req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    try {
      const payload = await verify(token, process.env.JWT_SECRET!);
      c.set("user", payload);
      await next();
    } catch {
      return c.json({ error: "Invalid token" }, 401);
    }
  };
}
```

---

## 10. 멀티테넌시 패턴

### 데이터 격리

```sql
-- 테넌트 테이블
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 사용자-테넌트 연결
CREATE TABLE tenant_users (
  tenant_id UUID REFERENCES tenants(id),
  user_id UUID REFERENCES auth.users(id),
  role TEXT DEFAULT 'member',
  PRIMARY KEY (tenant_id, user_id)
);

-- RLS 정책
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation" ON documents
  USING (tenant_id = (
    SELECT tenant_id FROM tenant_users
    WHERE user_id = auth.uid()
  ));
```

### 테넌트 컨텍스트

```typescript
// middleware/tenant.ts
export function tenantMiddleware() {
  return async (c: Context, next: Next) => {
    const tenantSlug = c.req.header("X-Tenant") ||
                       c.req.query("tenant");

    if (!tenantSlug) {
      return c.json({ error: "Tenant required" }, 400);
    }

    const tenant = await getTenantBySlug(tenantSlug);
    if (!tenant) {
      return c.json({ error: "Tenant not found" }, 404);
    }

    c.set("tenant", tenant);
    await next();
  };
}
```

---

## 11. 모니터링 & 로깅

### 로깅 패턴

```typescript
// lib/logger.ts
interface LogEntry {
  level: "info" | "warn" | "error";
  message: string;
  context?: Record<string, any>;
  timestamp: string;
}

export function log(entry: Omit<LogEntry, "timestamp">) {
  const logEntry: LogEntry = {
    ...entry,
    timestamp: new Date().toISOString()
  };

  console.log(JSON.stringify(logEntry));

  // Production: send to logging service
  if (process.env.NODE_ENV === "production") {
    // sendToLoggingService(logEntry);
  }
}

// 사용
log({
  level: "info",
  message: "Chat request processed",
  context: { userId: "123", latency: 1200, source: "gemini" }
});
```

### 메트릭스

```typescript
// 응답 시간 측정
app.use("*", async (c, next) => {
  const start = Date.now();
  await next();
  const latency = Date.now() - start;

  c.header("X-Response-Time", `${latency}ms`);

  log({
    level: "info",
    message: "Request completed",
    context: {
      method: c.req.method,
      path: c.req.path,
      status: c.res.status,
      latency
    }
  });
});
```

---

## 12. 테스트 전략

### API 테스트 (Vitest)

```typescript
// tests/chat.test.ts
import { describe, it, expect } from "vitest";
import app from "../src/index";

describe("Chat API", () => {
  it("should respond to valid message", async () => {
    const res = await app.request("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Hello" })
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.response).toBeDefined();
  });

  it("should reject empty message", async () => {
    const res = await app.request("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "" })
    });

    expect(res.status).toBe(400);
  });
});
```

### E2E 테스트 (Playwright)

```typescript
// e2e/chat.spec.ts
import { test, expect } from "@playwright/test";

test("user can send chat message", async ({ page }) => {
  await page.goto("/");

  await page.fill('[data-testid="chat-input"]', "Hello");
  await page.click('[data-testid="send-button"]');

  await expect(page.locator('[data-testid="assistant-message"]')).toBeVisible();
});
```

---

## 13. 확장 가능한 기능들

### 대화 히스토리 저장

```sql
CREATE TABLE chat_sessions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  tenant_id UUID REFERENCES tenants(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE chat_messages (
  id UUID PRIMARY KEY,
  session_id UUID REFERENCES chat_sessions(id),
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 피드백 수집

```typescript
app.post("/api/chat/:messageId/feedback", async (c) => {
  const { messageId } = c.req.param();
  const { rating, comment } = await c.req.json();

  await db.insert(feedback).values({
    messageId,
    rating,  // 1-5 or thumbs up/down
    comment,
    userId: c.get("user")?.id
  });

  return c.json({ success: true });
});
```

### 분석 대시보드

```typescript
// 인기 질문
const popularQueries = await db
  .select({ query: messages.content, count: sql`count(*)` })
  .from(messages)
  .where(eq(messages.role, "user"))
  .groupBy(messages.content)
  .orderBy(desc(sql`count(*)`))
  .limit(10);

// 응답 품질
const feedbackStats = await db
  .select({
    avgRating: sql`avg(rating)`,
    totalFeedback: sql`count(*)`
  })
  .from(feedback);
```

---

## Quick Start Template

```bash
# 새 프로젝트 시작
mkdir my-chatbot && cd my-chatbot

# 패키지 초기화
bun init

# 의존성 설치
bun add hono @hono/node-server @google/genai
bun add -d typescript @types/node tsx

# 프로젝트 구조 생성
mkdir -p src/{routes,middleware,lib} data

# 개발 서버 실행
bun run dev
```

---

## 체크리스트

### MVP 구축
- [ ] 프로젝트 구조 설정
- [ ] AI Provider 연동
- [ ] 기본 Chat API
- [ ] 프론트엔드 UI
- [ ] 로컬 테스트

### 프로덕션 준비
- [ ] 보안 미들웨어
- [ ] Rate Limiting
- [ ] 에러 핸들링
- [ ] 로깅 설정
- [ ] 환경변수 관리

### 배포
- [ ] Dockerfile 작성
- [ ] CI/CD 설정
- [ ] 시크릿 설정
- [ ] 모니터링 설정
- [ ] 도메인 연결

---

*Last Updated: 2026-01-10*
