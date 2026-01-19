# Changelog

모든 주요 변경 사항이 이 파일에 기록됩니다.

형식은 [Keep a Changelog](https://keepachangelog.com/ko/1.0.0/)를 기반으로 합니다.

## [Unreleased]

### Added
- 보안 미들웨어 모듈 (`apps/web/functions/security/middleware.ts`)
- Audit Log 시스템 및 관리자 조회 API (`/api/admin/audit-logs`)
- SECURITY_AUDIT.md 보안 감사 보고서
- CHANGELOG.md 변경 이력 관리

### Changed
- CORS 설정 강화 (허용된 Origin만 접근, 24시간 Preflight 캐싱)
- Rate Limiting 세분화 (일반 100/min, Chat 20/min, Auth 5/15min)
- Error Handler 개선 (프로덕션 에러 메시지 숨김)

### Security
- HSTS, X-Frame-Options, X-Content-Type-Options 헤더 추가
- CSP (Content Security Policy) 구현
- SSRF 방지 (내부 IP, 메타데이터 엔드포인트 차단)
- Bruteforce 방어 (인증 시도 제한)
- Cookie 보안 헬퍼 (HttpOnly, Secure, SameSite)

---

## [0.2.0] - 2026-01-18

### Added
- RLS 정책 강화 마이그레이션 (`008_rls_enhancements.sql`) [SSF-77]
- React ErrorBoundary 컴포넌트 [SSF-78]
- UI 컴포넌트 (LoadingSpinner, ErrorMessage, EmptyState) [SSF-79]
- 동의어 매핑 CRUD API (`/api/admin/synonyms/*`)
- 동의어 매핑 관리 UI (AdminProductMappings)

### Security
- `/chat/debug` 엔드포인트 제거 (API 키 노출 방지) [SEC-001]
- Admin/Stats API 인증 미들웨어 추가 [SEC-002]
- Session IDOR 취약점 수정 [SEC-003]
- 프론트엔드 Authorization 헤더 자동 추가 [SEC-004]

### Changed
- service_role 정책을 `TO service_role`로 제한
- 관리자 전용 뷰 정책 추가

---

## [0.1.0] - 2026-01-10

### Added
- 대출 가이드 챗봇 서비스 초기 버전
- Gemini 2.5 Flash 기반 AI 채팅
- 163개 대출 상품 정보 검색
- 키워드 기반 폴백 검색 (TF-IDF)
- 품질 분석 및 자동 버그 리포트 생성
- 토큰 사용량 통계 대시보드
- 다크모드 지원
- 상품 비교/즐겨찾기 기능

### Infrastructure
- Cloudflare Pages + Functions 배포
- Supabase 인증 및 데이터베이스
- Hono 프레임워크 API

---

## Linear 이슈 참조

| 버전 | 이슈 |
|------|------|
| 0.2.0 | SSF-77, SSF-78, SSF-79, SSF-83~89 |
| 0.1.0 | SSF-73~76 |

## 기여자

- Claude Code (AI Assistant)
