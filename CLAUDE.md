# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**론 파인더 (Loan Finder)** - Korean loan guide chatbot helping users find loan products from financial institutions (저축은행, 대부 등). Uses Gemini 2.5 Flash AI for intelligent chat with file search and fallback keyword matching.

## Commands

```bash
# Development
bun run dev              # Wrangler Pages: localhost:8788
bun run dev:web          # Vite only: localhost:5173 (API proxy to :8080)

# Build & Deploy
bun run build            # Full production build
bun run deploy           # Deploy to Cloudflare Pages

# Quality
bun run lint             # tsc --noEmit
bun run clean            # Remove all build artifacts
```

## Architecture

```
loan-guide/
├── apps/web/                   # Main application
│   ├── src/                    # React frontend
│   │   ├── components/         # UI components
│   │   ├── lib/                # Zustand stores, utilities
│   │   └── pages/              # Route pages
│   └── functions/              # Cloudflare Functions API
│       ├── api/[[path]].ts     # All API routes (Hono)
│       └── security/           # Security middleware
├── packages/shared/            # Shared Supabase client
└── guides/                     # Loan guide markdown files
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/status` | GET | Health check |
| `/api/guides` | GET | All products (163개) |
| `/api/guides/:id` | GET | Product detail |
| `/api/guides/search/:query` | GET | Product search |
| `/api/chat` | POST | AI chat (Gemini → fallback) |
| `/api/chat/sessions` | GET | User chat sessions |
| `/api/chat/feedback` | POST | Message feedback |
| `/api/reports` | GET/POST | Saved reports |
| `/api/announcements` | GET | System announcements |
| `/api/stats/*` | GET | Analytics (admin) |
| `/api/admin/*` | GET/POST | Admin operations |

## Data Flow

```
User Query
    │
    ▼
┌─────────────────────────────┐
│  Off-topic Filter           │ → 거절 응답
└─────────────────────────────┘
    │
    ▼
┌─────────────────────────────┐
│  Gemini 2.5 Flash           │ ← 3회 재시도
│  + File Search              │
└─────────────────────────────┘
    │ (실패 시)
    ▼
┌─────────────────────────────┐
│  Keyword Fallback           │ → loan_guides.json 검색
└─────────────────────────────┘
```

## Environment Variables

Set via Cloudflare Dashboard or `wrangler pages secret put`:
- `GEMINI_API_KEY` - Google Gemini API key
- `FILE_SEARCH_STORE_NAME` - Gemini file search store name
- `SUPABASE_URL` / `SUPABASE_ANON_KEY` - Supabase credentials

## Rate Limiting

| Layer | Limit | Description |
|-------|-------|-------------|
| Frontend (`lib/api.ts`) | 4 RPM | Gemini free tier safety |
| Backend General | 100/min/IP | All endpoints |
| Backend Chat | 20/min/IP | Chat endpoint only |
| Backend Auth | 5/min/IP | Bruteforce protection |

## Key Files

| File | Purpose |
|------|---------|
| `apps/web/functions/api/[[path]].ts` | All API routes |
| `apps/web/functions/loan_guides.json` | Product data (API 사용) |
| `apps/web/src/lib/api.ts` | Frontend API client |
| `apps/web/src/lib/tagExtractor.ts` | Product tag extraction |
| `apps/web/src/lib/conditionParser.ts` | User condition matching |

**Data Sync Note**: `loan_guides.json` exists in multiple locations. `bun run build` copies `apps/web/functions/` to root `/functions/`.

## Build Notes

- Build copies `apps/web/functions` to root `/functions` for Cloudflare Pages
- `nodejs_compat` flag required for Gemini SDK
- Smart placement enabled for Gemini API region routing

## Styling

- TailwindCSS with dark mode
- Primary color: purple (`primary`)
- Korean language for all user-facing text

## Linear Integration

```
Team ID: 11691a61-a0f9-44f3-92ff-15ba42ce636f
Done State ID: a2985654-7395-4cc7-8334-097c6adc148d
```

**Commit format**: `feat(scope): 설명 [SSF-XX]`

**Related docs**: `LINEAR_ISSUES.md`, `SECURITY_AUDIT.md`, `CHANGELOG.md`
