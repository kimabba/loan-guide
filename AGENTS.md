# AGENTS.md

This file guides agentic coding assistants working in this repository.

## Project Structure

**Monorepo**: Bun workspaces with apps/* and packages/*
- `apps/web` - React SPA (Vite + TypeScript + Tailwind CSS)
- `apps/worker` - Cloudflare Workers API (Hono)
- `packages/shared` - Shared types and utilities

## Build & Lint Commands

### Root (Monorepo)
```bash
bun dev                # Run worker dev server
bun dev:worker         # Run worker dev server (explicit)
bun dev:web            # Run web dev server
bun build              # Build both web and worker
bun build:web          # Build web app
bun build:worker       # Build worker
bun deploy             # Deploy to Cloudflare Workers
bun deploy:pages       # Deploy to Cloudflare Pages
bun lint               # Run TypeScript type check (all packages)
bun clean              # Clean all build artifacts
```

### Web App
```bash
cd apps/web
bun dev                # Start dev server on port 5173
bun build              # Build for production (tsc + vite build)
bun preview            # Preview production build
bun lint               # TypeScript type check only
bun pages:dev          # Wrangler Pages dev
bun pages:deploy       # Deploy to Pages
```

### Worker
```bash
cd apps/worker
bun dev                # Start Wrangler dev server
bun build              # Build (dry-run deploy to dist/)
bun deploy             # Deploy to Workers
bun deploy:secrets     # Deploy secrets (GEMINI_API_KEY, FILE_SEARCH_STORE_NAME)
bun lint               # TypeScript type check only
```

### Testing
**No tests configured yet** - Add vitest/jest if adding tests.

## Code Style Guidelines

### TypeScript
- **Strict mode enabled** (`strict: true`)
- **Type checking only** - No ESLint/Prettier configured
- Use `tsc --noEmit` for linting (already in `bun lint`)
- **Never suppress type errors** with `as any`, `@ts-ignore`, or `@ts-expect-error`

### Imports
- **Web app**: Use `@/*` alias for src directory imports
  ```tsx
  import { useAuthStore } from "@/lib/auth";
  ```
- **Worker**: Use relative imports
  ```ts
  import { Env } from "../index";
  ```
- React hooks first, then other imports
- Use named exports for components
- Use default export for pages/components as needed

### Naming Conventions
| Type          | Convention          | Example                     |
|---------------|---------------------|-----------------------------|
| Files         | PascalCase          | `Header.tsx`, `ChatPage.tsx` |
| Components    | PascalCase          | `function Header()`         |
| Utilities     | camelCase           | `api.ts`, `auth.ts`         |
| Functions     | camelCase           | `sendMessage`, `applyTheme`  |
| Variables     | camelCase           | `const messages = []`       |
| Interfaces    | PascalCase          | `interface AuthState`        |
| Types         | PascalCase          | `type Theme = "light" \| "dark"` |

### Component Patterns
```tsx
// Named export preferred
export function ComponentName() {
  const { value } = useStore();

  return <div>{value}</div>;
}

// Default export acceptable for pages
export default function PageName() {
  return <div>...</div>;
}
```

### State Management
- **Zustand** for global state (auth, theme)
- **React hooks** for component state
- Persist middleware for localStorage
```tsx
import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useStore = create<Store>()(
  persist(
    (set) => ({ ... }),
    { name: "storage-key" }
  )
);
```

### API Layer (Web)
- Centralized API functions in `lib/api.ts`
```tsx
const API_URL = import.meta.env.VITE_API_URL || "";

export async function apiRequest<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const url = `${API_URL}${endpoint}`;
  const res = await fetch(url, options);

  if (!res.ok) {
    throw new Error(`API error: ${res.status}`);
  }

  return res.json();
}

export const api = {
  get: <T>(endpoint: string) => apiRequest<T>(endpoint),
  post: <T>(endpoint: string, data: unknown) =>
    apiRequest<T>(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),
};
```

### Backend (Worker)
- **Hono** for routing and middleware
- Custom middleware in `middleware/security.ts`:
  - Rate limiting (in-memory Map, per-IP)
  - Security headers (CSP, HSTS, X-Frame-Options)
  - Input sanitization (HTML escape, control char removal)
  - Input validation (return `{ valid, error?, sanitized? }`)
- API routes: `/api/chat`, `/api/guides`, `/api/reports`, `/api/announcements`
- Environment bindings in `Env` type

### Error Handling
```tsx
// Frontend
try {
  const data = await api.post<T>("/endpoint", body);
  // Success
} catch {
  // User-friendly error message only
  setMessages(prev => [...prev, { content: "오류가 발생했습니다." }]);
}

// Backend
export function validateMessage(message: unknown): ValidationResult {
  if (typeof message !== "string") {
    return { valid: false, error: "Message must be a string" };
  }
  if (message.length > 1000) {
    return { valid: false, error: "Message too long" };
  }
  return { valid: true, sanitized: sanitizeString(message) };
}
```

### Styling (Tailwind CSS)
- Dark mode via class strategy (`["class"]`)
- CSS variables for theming (see `tailwind.config.js`)
- Use semantic color tokens: `background`, `foreground`, `primary`, `muted`, `border`
- Responsive utilities: `hidden sm:flex`, `max-w-3xl`, etc.

### Security
- **All user inputs must be validated** using `validate*` functions from `middleware/security.ts`
- Sanitize strings before display/use
- Rate limits: 100/min for API, 30/min for `/api/chat`, 10/min for `/api/reports`
- Request size limit: 10KB for API endpoints
- Never trust client-side data - validate on server

### Internationalization
- UI text in Korean
- Error messages in Korean
- Comments in Korean allowed

### Environment Variables
- **Web**: `VITE_API_URL` (via `.env`)
- **Worker**: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `GEMINI_API_KEY`, `FILE_SEARCH_STORE_NAME`, `ENVIRONMENT`
- Secrets deployed via `bun run deploy:secrets` for Worker

## Quick Reference

- **Package manager**: Bun (not npm/yarn)
- **Framework**: React 18 + React Router v6
- **Build tool**: Vite (web), Wrangler (worker)
- **Backend**: Hono on Cloudflare Workers
- **Database**: Supabase (auth + data)
- **AI**: Google Gemini 2.5 Flash with File Search API
- **Type check**: `bun lint` (runs `tsc --noEmit`)
- **No tests**: Add vitest before adding tests
- **No linting**: TypeScript compiler only
