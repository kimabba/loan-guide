# 기술 스택 자동 요약 (Generated)

생성 시각: 2026-01-19T08:52:47.923Z

## 루트 프로젝트

- 이름: loan-guide-chatbot
- 워크스페이스: apps/*, packages/*
- 공통 Dependencies:
  - @google/genai: ^1.35.0
- 공통 DevDependencies:
  - typescript: ^5.3.3

## 워크스페이스

### web

- 경로: `apps/web`
- 버전: 0.1.0
- 주요 스크립트:
  - dev: `vite`
  - build: `tsc -b && vite build`
  - preview: `vite preview`
  - lint: `tsc --noEmit`
  - pages:dev: `wrangler pages dev dist --compatibility-date=2024-12-01 --compatibility-flags=nodejs_compat`
  - pages:deploy: `wrangler pages deploy dist --project-name=loan-guide`
- 주요 라이브러리:
  - react: ^18.3.1
  - react-dom: ^18.3.1
  - react-router-dom: ^6.22.0
  - zustand: ^4.5.0
  - hono: ^4.3.0
  - @supabase/supabase-js: ^2.90.1
  - @google/genai: ^1.35.0
- TypeScript 설정:
  - strict: true
  - jsx: react-jsx
  - module: ESNext
  - target: ES2020
  - paths:
    - @/* -> ./src/*
- Cloudflare 설정 (wrangler.toml):
  - pages_build_output_dir: dist
  - compatibility_date: 2024-12-01
  - compatibility_flags: nodejs_compat
  - env.preview 정의 여부: 있음
  - env.production 정의 여부: 있음

### shared

- 경로: `packages/shared`
- 버전: 0.1.0
- 주요 스크립트:
  - lint: `tsc --noEmit`
- TypeScript 설정:
  - strict: true
  - module: ESNext
  - target: ES2020
