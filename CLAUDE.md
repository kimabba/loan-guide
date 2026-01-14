# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Korean loan guide chatbot - helps users find loan products from financial institutions (저축은행, 대부 등). Uses Gemini AI for intelligent chat with fallback keyword search.

## Commands

```bash
# Development (starts Vite + Cloudflare Pages dev server)
bun run dev

# Build for production
bun run build

# Type check / lint
bun run lint

# Deploy to Cloudflare Pages
bun run deploy
```

## Architecture

**Monorepo Structure**
- `apps/web/` - Main application (React frontend + Cloudflare Functions API)
- `packages/shared/` - Shared Supabase client
- `guides/` - Loan guide content as markdown (organized by institution type: 저축은행, 대부)

**Frontend** (`apps/web/src/`)
- React 18 + Vite + React Router + TailwindCSS
- State management: Zustand stores in `lib/` (theme, auth, compare, favorites)
- Pages: Home, Chat, Products, Stats, Reports, Announcements, Login

**Backend API** (`apps/web/functions/api/`)
- Hono framework on Cloudflare Pages Functions
- Single entry point: `[[path]].ts` handles all `/api/*` routes
- Chat uses Gemini 2.5 Flash with file search, falls back to keyword matching
- Loan data: `functions/loan_guides.json` (163 products)

**Key Data Flow**
- Chat requests → Gemini API with file search → extract mentioned guides → response
- Fallback: keyword-based search through loan_guides.json
- Statistics tracked in-memory (token usage, guide views, search queries)

## Environment Variables

Set in Cloudflare Dashboard or via `wrangler pages secret put`:
- `GEMINI_API_KEY` - Google Gemini API key
- `FILE_SEARCH_STORE_NAME` - Gemini file search store name
- `SUPABASE_URL` / `SUPABASE_ANON_KEY` - Supabase credentials

## Build Notes

- Build copies `apps/web/functions` to root `/functions` for Cloudflare Pages
- `nodejs_compat` flag required for Gemini SDK
- Smart placement enabled for Gemini API region routing
