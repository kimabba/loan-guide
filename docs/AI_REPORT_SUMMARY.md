# AI 리포트 기능 - 작업 요약 (2026-01-21)

## 📋 작업 내용

### 1. 문서 작성 ✅
- **FEATURE_AI_REPORT.md** - 상세 설계 문서
  - 기능 개요
  - API 엔드포인트 설계
  - 데이터베이스 스키마
  - UI 컴포넌트 설명
  - 절감액 계산 로직
  - 4주 구현 계획

### 2. 데이터베이스 설계 ✅
- **migrations/009_ai_reports.sql** - 완전한 스키마
  - `ai_reports` 테이블 (리포트 저장)
  - `report_shares` 테이블 (공유 기록)
  - `report_views` 테이블 (조회 로그)
  - `report_recommendation_cache` 테이블 (성능 최적화)
  - RLS 정책 (행 단위 보안)
  - 인덱스 (성능)
  - 자동 정리 함수
  - 통계 뷰

### 3. API 라우트 초안 ✅
- **functions/api/routes/ai-report.ts** - API 엔드포인트 구조
  ```
  POST   /api/ai-report/generate          - 리포트 생성
  GET    /api/ai-report/:reportId          - 리포트 조회
  POST   /api/ai-report/:reportId/send-email - 이메일 전송
  GET    /api/ai-report/:reportId/download  - PDF/이미지 다운로드
  POST   /api/ai-report/:reportId/share    - 공유 링크 생성
  GET    /api/ai-report/share/:token       - 공개 조회 (로그인 불필요)
  ```

### 4. Linear 작업 목록 업데이트 ✅
- **LINEAR_ISSUES.md** - 신규 작업 추가
  - Phase 1: 기초 (3개 이슈)
  - Phase 2: UI (3개 이슈)
  - Phase 3: PDF/이미지 (3개 이슈)
  - Phase 4: 공유 (3개 이슈)
  - Phase 5: 분석 (2개 이슈)
  - 총 14개 작업 (52시간)

---

## 🎯 다음 단계

### 즉시 (이번 주)
1. **DB 마이그레이션 실행**
   ```bash
   supabase migration up
   ```

2. **Phase 1 구현 시작**
   - [ ] API 엔드포인트 완성 (Hono 라우트)
   - [ ] Gemini 프롬프트 최적화
   - [ ] 절감액 계산 함수 구현

### 다음주 (Phase 2)
3. **React 페이지 및 폼 개발**
   - [ ] ReportForm (다단계 입력 폼)
   - [ ] ReportPreview (결과 시각화)
   - [ ] ReportPage (/report 라우팅)

### 그 다음주 (Phase 3)
4. **파일 생성 기능**
   - [ ] PDF 생성 (html2canvas + jsPDF)
   - [ ] 이미지 생성 (Canvas API)
   - [ ] Supabase Storage 저장

### 그 다음다음주 (Phase 4)
5. **공유 기능**
   - [ ] 이메일 전송 (SendGrid/Resend)
   - [ ] 공유 링크 (토큰 기반)
   - [ ] 조회 분석

---

## 🏗️ 아키텍처 개요

```
┌─────────────────────────────────────────────┐
│           고객 정보 입력 폼                    │
│  (ReportForm - 5단계)                       │
└──────────────┬──────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────┐
│      AI 리포트 생성 (Gemini)                  │
│ - 상품 추천 (3-5개)                          │
│ - 절감액 계산                                │
│ - 비교 분석                                 │
└──────────────┬──────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────┐
│      리포트 데이터 저장 (Supabase)            │
│ - ai_reports 테이블                         │
│ - share_token 생성                          │
└──────────────┬──────────────────────────────┘
               │
        ┌──────┴──────┬─────────┬────────────┐
        ▼             ▼         ▼            ▼
     조회          다운로드   이메일       공유링크
   (미리보기)   (PDF/이미지)  전송     (로그인불필요)
```

---

## 📊 주요 기술 스택

| 계층 | 기술 |
|------|------|
| 프론트엔드 | React 18 + React Router v6 |
| 상태관리 | Zustand |
| 스타일 | Tailwind CSS |
| 폼 | React Hook Form |
| 차트 | Chart.js / Recharts |
| PDF/이미지 | html2canvas + jsPDF |
| 백엔드 | Hono + Cloudflare Pages |
| AI | Gemini 2.5 Flash |
| DB | Supabase PostgreSQL |
| 스토리지 | Supabase Storage |
| 이메일 | SendGrid or Resend (선택 예정) |

---

## 💡 핵심 기능 상세

### 1. Gemini 통합
- 프롬프트: 고객 정보 기반 상품 추천
- 출력: JSON 형식의 추천 상품 + 분석
- 성능: 약 5-10초

### 2. 절감액 계산
- 공식: 원리금균등분할 계산식 사용
- 입력: 현재금리, 추천금리, 원금, 상환기간
- 출력: 월, 년, 전체 절감액

### 3. 공유 방식
- **링크**: 토큰 기반, 7일 유효
- **이메일**: HTML 템플릿
- **QR코드**: 스마트폰 공유
- **파일**: PDF/PNG 다운로드

### 4. 보안
- RLS: 소유자만 조회 가능
- 개인정보: 암호화 저장 (선택)
- 만료: 3개월 자동 삭제
- 감사: 모든 조회 로그 기록

---

## 📈 성과 지표

추적할 지표:
1. **생성**: 일일 리포트 생성 수
2. **공유**: 공유 링크 클릭 수
3. **조회**: 공개 링크 조회 수
4. **전환**: 리포트 → 신청까지의 경로
5. **인기상품**: 가장 많이 추천된 상품

---

## ⚠️ 주의사항

### 개인정보 보호
- [x] 고객정보 암호화 계획 (추후)
- [x] GDPR 준수 계획
- [x] 자동 삭제 정책

### 성능 최적화
- [x] 추천 캐시 (7일)
- [x] 인덱싱 (생성일, 토큰, 공개여부)
- [ ] CDN 캐싱 (파일)

### 사용자 경험
- [ ] 모바일 반응형
- [ ] 로딩 상태 표시
- [ ] 에러 핸들링
- [ ] 접근성 (WCAG)

---

## 📞 질문 & 피드백

- **Linear에 직접 연동 가능?** → API_KEY 설정 후 자동화 가능
- **이메일 서비스 선택?** → SendGrid(비용저) vs Resend(최신) → 선택 필요
- **이미지 생성 방식?** → html2canvas (간단) vs Canvas API (커스텀)
- **캐싱 전략?** → 추천결과는 7일, 파일은 CDN

---

## 📂 관련 파일

```
loan-guide/
├── docs/
│   └── FEATURE_AI_REPORT.md          ← 상세 설계
├── supabase/
│   └── migrations/
│       └── 009_ai_reports.sql        ← DB 스키마
├── apps/web/
│   └── functions/api/
│       └── routes/
│           └── ai-report.ts          ← API 라우트 (WIP)
├── LINEAR_ISSUES.md                  ← 작업 목록
└── CLAUDE.md                          ← 개발 가이드
```

---

## 🎬 시작하기

```bash
# 1. DB 마이그레이션
supabase migration up

# 2. 로컬 개발 시작
bun dev:web

# 3. API 테스트
curl -X POST http://localhost:8788/api/ai-report/generate \
  -H "Content-Type: application/json" \
  -d '{ "customerInfo": {...} }'

# 4. 빌드 & 배포
bun build
bun pages:deploy
```

---

**작성자**: GitHub Copilot  
**작성일**: 2026-01-21  
**상태**: 설계 완료, 구현 준비 중
