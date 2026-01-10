# Implementation Plan: 대출 가이드 챗봇 SaaS

**Status**: 🔄 In Progress
**Started**: 2026-01-10
**Last Updated**: 2026-01-10
**Estimated Completion**: 2026-01-17

---

## 📋 Overview

### Feature Description
대출 상담 지점 직원들을 위한 AI 챗봇 SaaS. 163개 대출 상품 가이드를 자연어로 검색하고 즉시 답변을 받을 수 있는 서비스.

### Success Criteria
- [ ] 카카오/구글 소셜 로그인 작동
- [ ] 지점별 사용자 관리 가능
- [ ] 자연어 질문 → 관련 가이드 응답
- [ ] 공지사항 조회 가능
- [ ] 버그 리포트 제출 가능
- [ ] 5명 단위 요금제 적용

### User Impact
- 대출 상담 시간 단축 (가이드 검색 → 즉시 답변)
- 신입 직원 온보딩 시간 감소
- 가이드 업데이트 실시간 반영

---

## 🏗️ Architecture

```
┌──────────────────┐     ┌──────────────────┐
│   Frontend       │     │   Backend API    │
│   React + Vite   │────>│   Hono           │
│   TailwindCSS    │     │   Cloudflare     │
│   shadcn/ui      │     │   Workers        │
│   Cloudflare     │     │                  │
│   Pages          │     │                  │
└──────────────────┘     └──────────────────┘
                                │
                                ▼
                         ┌──────────────────┐
                         │   Supabase       │
                         │   - Auth         │
                         │   - PostgreSQL   │
                         │   - pgvector     │
                         └──────────────────┘
                                │
                                ▼
                         ┌──────────────────┐
                         │   AI API         │
                         │   OpenAI/Claude  │
                         └──────────────────┘
```

### Tech Stack

| Layer | Technology |
|-------|------------|
| Runtime | Bun |
| API Framework | Hono |
| Frontend | React 18 + Vite |
| Styling | TailwindCSS + shadcn/ui |
| Hosting | Cloudflare Pages + Workers |
| Database | Supabase PostgreSQL |
| Vector Search | pgvector |
| Auth | Supabase Auth (Kakao, Google) |
| AI | OpenAI GPT-4 or Claude API |

---

## 📦 Dependencies

### External Services
- Supabase Project (Free tier)
- Cloudflare Account (Free tier)
- OpenAI API Key or Anthropic API Key
- Kakao Developers App
- Google Cloud Console OAuth

---

## 🚀 Implementation Phases

### Phase 1: Project Setup + Monorepo
**Goal**: Bun monorepo 구조 생성, 기본 프로젝트 실행
**Estimated Time**: 2시간
**Status**: ⏳ Pending

#### Tasks

**🔴 RED: 검증 테스트 먼저**
- [ ] **Test 1.1**: API 서버 health check 테스트
- [ ] **Test 1.2**: 프론트엔드 빌드 테스트

**🟢 GREEN: 구현**
- [ ] **Task 1.1**: Bun workspace 초기화
- [ ] **Task 1.2**: apps/api - Hono 프로젝트 생성
- [ ] **Task 1.3**: apps/web - Vite + React 프로젝트 생성
- [ ] **Task 1.4**: TailwindCSS + shadcn/ui 설정
- [ ] **Task 1.5**: Cloudflare wrangler 설정

**🔵 REFACTOR**
- [ ] **Task 1.6**: 공통 타입 packages/shared 분리

#### Quality Gate ✋
- [ ] `bun install` 성공
- [ ] `bun run dev` - API 서버 실행
- [ ] `bun run dev` - Web 개발 서버 실행
- [ ] API health check 응답 확인

---

### Phase 2: Authentication (Supabase + OAuth)
**Goal**: 카카오/구글 로그인 작동, 보호된 라우트
**Estimated Time**: 3시간
**Status**: ⏳ Pending

#### Tasks

**🔴 RED**
- [ ] **Test 2.1**: 인증 미들웨어 테스트
- [ ] **Test 2.2**: 로그인/로그아웃 플로우 테스트

**🟢 GREEN**
- [ ] **Task 2.1**: Supabase 프로젝트 생성
- [ ] **Task 2.2**: Kakao OAuth 앱 등록 + Supabase 연동
- [ ] **Task 2.3**: Google OAuth 설정 + Supabase 연동
- [ ] **Task 2.4**: Hono auth 미들웨어 구현
- [ ] **Task 2.5**: 로그인 페이지 UI
- [ ] **Task 2.6**: 보호된 라우트 구현

**🔵 REFACTOR**
- [ ] **Task 2.7**: 인증 상태 전역 관리 (Zustand)

#### Quality Gate ✋
- [ ] 카카오 로그인 성공
- [ ] 구글 로그인 성공
- [ ] 로그아웃 후 보호된 페이지 접근 차단
- [ ] JWT 토큰 검증 작동

---

### Phase 3: Multi-tenancy (Branch Management)
**Goal**: 지점 생성, 사용자-지점 연결, RLS 정책
**Estimated Time**: 3시간
**Status**: ⏳ Pending

#### Tasks

**🔴 RED**
- [ ] **Test 3.1**: 지점 CRUD API 테스트
- [ ] **Test 3.2**: RLS 정책 테스트 (다른 지점 데이터 접근 차단)

**🟢 GREEN**
- [ ] **Task 3.1**: DB 스키마 생성 (branches, user_profiles)
- [ ] **Task 3.2**: RLS 정책 설정
- [ ] **Task 3.3**: 지점 생성/초대 API
- [ ] **Task 3.4**: 사용자 프로필 페이지
- [ ] **Task 3.5**: 지점 관리 페이지 (관리자용)

**🔵 REFACTOR**
- [ ] **Task 3.6**: 권한 체계 정리 (admin, member)

#### Quality Gate ✋
- [ ] 지점 생성 성공
- [ ] 사용자 초대 → 가입 플로우 작동
- [ ] 다른 지점 데이터 접근 불가 확인

---

### Phase 4: Loan Guide Chatbot (Core Feature)
**Goal**: 자연어 질문 → 관련 가이드 응답
**Estimated Time**: 5시간
**Status**: ⏳ Pending

#### Tasks

**🔴 RED**
- [ ] **Test 4.1**: 가이드 검색 API 테스트
- [ ] **Test 4.2**: 벡터 유사도 검색 테스트
- [ ] **Test 4.3**: 챗봇 응답 생성 테스트

**🟢 GREEN**
- [ ] **Task 4.1**: loan_guides 테이블 생성 + 데이터 마이그레이션
- [ ] **Task 4.2**: pgvector 확장 활성화
- [ ] **Task 4.3**: 가이드 임베딩 생성 스크립트
- [ ] **Task 4.4**: 벡터 검색 API 구현
- [ ] **Task 4.5**: AI 응답 생성 API (RAG)
- [ ] **Task 4.6**: 채팅 UI 컴포넌트
- [ ] **Task 4.7**: 채팅 히스토리 저장

**🔵 REFACTOR**
- [ ] **Task 4.8**: 응답 스트리밍 적용
- [ ] **Task 4.9**: 프롬프트 최적화

#### Quality Gate ✋
- [ ] "OK저축은행 신용대출 조건" 질문 → 관련 가이드 응답
- [ ] 응답 시간 3초 이내
- [ ] 채팅 히스토리 저장/조회 작동

---

### Phase 5: Announcements + Bug Reports
**Goal**: 공지사항 조회, 버그 리포트 제출
**Estimated Time**: 2시간
**Status**: ⏳ Pending

#### Tasks

**🔴 RED**
- [ ] **Test 5.1**: 공지사항 CRUD 테스트
- [ ] **Test 5.2**: 버그 리포트 제출 테스트

**🟢 GREEN**
- [ ] **Task 5.1**: announcements 테이블 생성
- [ ] **Task 5.2**: 공지사항 목록/상세 페이지
- [ ] **Task 5.3**: bug_reports 테이블 생성
- [ ] **Task 5.4**: 버그 리포트 폼 UI
- [ ] **Task 5.5**: 이메일 발송 연동 (Resend or Supabase)

**🔵 REFACTOR**
- [ ] **Task 5.6**: 새 공지 알림 뱃지

#### Quality Gate ✋
- [ ] 공지사항 목록 조회 작동
- [ ] 버그 리포트 제출 → 이메일 수신 확인

---

### Phase 6: Deployment + Polish
**Goal**: Cloudflare 배포, 도메인 연결
**Estimated Time**: 2시간
**Status**: ⏳ Pending

#### Tasks

- [ ] **Task 6.1**: Cloudflare Pages 배포 설정
- [ ] **Task 6.2**: Cloudflare Workers 배포 설정
- [ ] **Task 6.3**: 환경변수 설정
- [ ] **Task 6.4**: 커스텀 도메인 연결
- [ ] **Task 6.5**: WAF 규칙 설정

#### Quality Gate ✋
- [ ] Production URL 접속 성공
- [ ] 전체 기능 E2E 테스트 통과

---

## 📊 Progress Tracking

| Phase | Status | Estimated | Actual |
|-------|--------|-----------|--------|
| 1. Setup | ⏳ | 2h | - |
| 2. Auth | ⏳ | 3h | - |
| 3. Multi-tenancy | ⏳ | 3h | - |
| 4. Chatbot | ⏳ | 5h | - |
| 5. Announcements | ⏳ | 2h | - |
| 6. Deploy | ⏳ | 2h | - |
| **Total** | | **17h** | - |

---

## 📝 Notes & Learnings

(구현하면서 기록)

---

## ⚠️ Risks

| Risk | Mitigation |
|------|------------|
| pgvector 성능 | 인덱스 최적화, 캐싱 |
| AI API 비용 | 토큰 제한, 캐싱 |
| OAuth 설정 복잡 | 문서 참고, 테스트 철저 |
