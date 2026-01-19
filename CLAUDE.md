# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**론 파인더 (Loan Finder)** - Korean loan guide chatbot helping users find loan products from financial institutions (저축은행, 대부 등). Uses Gemini 2.5 Flash AI for intelligent chat with file search and fallback keyword matching.

## Commands

```bash
# Development (Vite + Cloudflare Pages dev server)
bun run dev

# Build for production
bun run build

# Type check / lint
bun run lint

# Deploy to Cloudflare Pages
bun run deploy

# Clean all build artifacts
bun run clean
```

## Architecture

**Monorepo Structure**
- `apps/web/` - Main application (React frontend + Cloudflare Functions API)
- `packages/shared/` - Shared Supabase client
- `guides/` - Loan guide content as markdown (저축은행, 대부)

**Frontend** (`apps/web/src/`)
- React 18 + Vite + React Router + TailwindCSS
- State management: Zustand stores in `lib/` (theme, auth, compare, favorites)
- Version info in `version.ts` (APP_NAME, APP_VERSION, CHANGELOG)

**Backend API** (`apps/web/functions/api/`)
- Hono framework on Cloudflare Pages Functions
- Single entry: `[[path]].ts` handles all `/api/*` routes
- Chat: Gemini 2.5 Flash with file search → extract guides → response
- Loan data: `functions/loan_guides.json` (163 products)

**Key Systems**
- **Tag Extractor** (`lib/tagExtractor.ts`): Extracts employment type, product type, and feature tags from loan products
- **Condition Parser** (`lib/conditionParser.ts`): Parses user-pasted text to match loan conditions
- **Compare Store** (`lib/compare.ts`): Manages product comparison (max 3)

## Data Flow

```
User Query → Gemini API (file search) → Extract mentioned guides → Response
         ↓ (fallback)
    Keyword search through loan_guides.json
```

## Environment Variables

Set via Cloudflare Dashboard or `wrangler pages secret put`:
- `GEMINI_API_KEY` - Google Gemini API key
- `FILE_SEARCH_STORE_NAME` - Gemini file search store name
- `SUPABASE_URL` / `SUPABASE_ANON_KEY` - Supabase credentials

## Build Notes

- Build copies `apps/web/functions` to root `/functions` for Cloudflare Pages
- `nodejs_compat` flag required for Gemini SDK
- Smart placement enabled for Gemini API region routing

## Key Patterns

**Filter System**: Accordion-style filters with employment type (직군), product type, category, and company filters. Tags are extracted from product data using keyword matching.

**Styling**: TailwindCSS with dark mode support. Primary color is purple (`primary`). Use `hover:bg-primary/10` for hover effects.

**Korean Language**: All user-facing text is in Korean. Comments can be in Korean or English.

## 작업 관리 지침 (Linear Integration)

### 필수 워크플로우
모든 작업은 다음 순서를 따릅니다:

1. **계획 단계**: Linear에 이슈 생성 (또는 기존 이슈 확인)
2. **작업 단계**: 이슈 참조하며 코드 작업
3. **완료 단계**: Linear 이슈 Done 처리 + 커밋 메시지에 이슈 ID 포함

### Linear API 정보
```
API Key: (환경변수 LINEAR_API_KEY 참조)
Team ID: 11691a61-a0f9-44f3-92ff-15ba42ce636f
Done State ID: a2985654-7395-4cc7-8334-097c6adc148d
```

> **Note**: Linear API Key는 `.env.local` 또는 환경변수로 관리합니다.

### 이슈 생성 규칙
- **제목 형식**: `[카테고리] 작업 설명`
  - `[SEC]` - 보안, `[FE]` - 프론트엔드, `[BE]` - 백엔드
  - `[FEAT]` - 기능, `[FIX]` - 버그 수정, `[PERF]` - 성능
- **우선순위**: 1(긴급) ~ 4(낮음)
- **설명**: Markdown 형식으로 작업 내용, 파일, 완료 기준 명시

### 커밋 메시지 규칙
```
feat(scope): 설명 [SSF-XX]
fix(scope): 설명 [SSF-XX]
```

### 작업 추적 문서
- `LINEAR_ISSUES.md` - 이슈 목록 및 상태 추적
- `SECURITY_AUDIT.md` - 보안 감사 결과
- `CHANGELOG.md` - 버전별 변경 이력 (Keep a Changelog 형식)

### CHANGELOG 업데이트 규칙
작업 완료 시 CHANGELOG.md의 `[Unreleased]` 섹션에 추가:
- `Added` - 새 기능
- `Changed` - 기존 기능 변경
- `Fixed` - 버그 수정
- `Security` - 보안 관련
- `Deprecated` - 향후 제거 예정
- `Removed` - 제거된 기능

## 개발 팁

### 코드 품질
- 작업 전 항상 `bun run lint` 실행
- 작업 후 `bun run build` 로 빌드 확인
- 보안 관련 작업 시 `npm audit` 실행

### 세션 관리
- 긴 작업 시 중간 커밋으로 진행 상황 저장
- 컨텍스트 손실 방지를 위해 작업 요약을 LINEAR_ISSUES.md에 기록

### 디버깅
- API 에러: Cloudflare Dashboard > Functions > Logs 확인
- 프론트엔드: React DevTools + Network 탭 활용
- Supabase: Dashboard > Logs에서 RLS 정책 오류 확인
