# Linear 이슈 목록 - 출시 전 체크리스트

> 마지막 업데이트: 2026-01-18

## 완료된 이슈

### 보안 강화 (2026-01-18)

| 이슈 ID | 제목 | 상태 |
|---------|------|------|
| SSF-83 | [SEC] CORS/Preflight + Security Headers 강화 | ✅ Done |
| SSF-85 | [SEC] Rate Limiting + Bruteforce 방어 강화 | ✅ Done |
| SSF-86 | [SEC] SSRF 방지 + Input Validation 강화 | ✅ Done |
| SSF-87 | [SEC] Audit Logging + Error 노출 차단 | ✅ Done |
| SSF-88 | [SEC] Cookie 보안 + 세션 관리 가이드 | ✅ Done |
| SSF-89 | [SEC] 의존성 취약점 점검 결과 | ✅ Done |

### 기능 개발 (2026-01-18)

| 이슈 ID | 제목 | 상태 |
|---------|------|------|
| SSF-77 | [BE] RLS 정책 강화 마이그레이션 | ✅ Done |
| SSF-78 | [FE] React ErrorBoundary 컴포넌트 | ✅ Done |
| SSF-79 | [FE] UI 컴포넌트 (Loading, Error, Empty) | ✅ Done |

### 이전 보안 수정

| 이슈 | 제목 | 상태 |
|------|------|------|
| SEC-001 | /chat/debug 엔드포인트 제거 | ✅ Done |
| SEC-002 | Admin/Stats API 인증 추가 | ✅ Done |
| SEC-003 | Session IDOR 취약점 수정 | ✅ Done |
| SEC-004 | 프론트엔드 인증 토큰 전달 | ✅ Done |

---

## 미해결 이슈 (우선순위별)

### Phase 1: 긴급 (출시 전 필수)

#### SEC-005: 환경변수 보안 강화 ✅ (RLS 강화로 완료)
- **우선순위**: High → **완료**
- **라벨**: security, backend
- **완료 내용**:
  - [x] Supabase RLS 정책 전체 검토 (008_rls_enhancements.sql)
  - [x] 민감한 테이블에 적절한 RLS 적용 확인
  - [x] service_role 정책 `TO service_role`로 제한

#### FE-001: React Error Boundary 추가 ✅
- **우선순위**: High → **완료** (SSF-78)
- **라벨**: frontend, stability
- **완료 내용**:
  - [x] `ErrorBoundary` 컴포넌트 생성
  - [x] 주요 라우트에 Error Boundary 적용
  - [x] 에러 발생 시 사용자 친화적 UI 표시
- **파일**: `apps/web/src/components/ErrorBoundary.tsx`

#### FE-002: 로딩/에러 상태 일관성 ✅
- **우선순위**: Medium → **완료** (SSF-79)
- **라벨**: frontend, ux
- **완료 내용**:
  - [x] LoadingSpinner 컴포넌트 생성
  - [x] ErrorMessage 컴포넌트 생성
  - [x] EmptyState 컴포넌트 생성
- **파일**: `apps/web/src/components/ui/`

---

### Phase 2: 중요 (출시 후 1주일 내)

#### A11Y-001: 접근성 개선
- **우선순위**: Medium
- **라벨**: accessibility, frontend
- **설명**: WCAG 2.1 AA 기준 미달
- **작업**:
  - [ ] 모든 interactive 요소에 ARIA 라벨 추가
  - [ ] 키보드 네비게이션 지원 (Tab, Enter, Escape)
  - [ ] 색상 대비 검토 (contrast ratio 4.5:1 이상)
  - [ ] 스크린 리더 테스트
- **예상 소요**: 4-6시간

#### SEO-001: 메타 태그 및 SEO 최적화
- **우선순위**: Medium
- **라벨**: seo, frontend
- **설명**: 검색 엔진 최적화 미흡
- **작업**:
  - [ ] `react-helmet` 또는 `@tanstack/react-router` 메타 태그 추가
  - [ ] Open Graph / Twitter Card 메타 태그
  - [ ] 각 페이지별 title, description 설정
  - [ ] sitemap.xml 생성
  - [ ] robots.txt 설정
- **예상 소요**: 3-4시간

#### PERF-001: 번들 사이즈 최적화
- **우선순위**: Medium
- **라벨**: performance, frontend
- **설명**: 초기 로딩 성능 개선
- **작업**:
  - [ ] 코드 스플리팅 (React.lazy)
  - [ ] 이미지 최적화
  - [ ] 불필요한 의존성 제거
  - [ ] Lighthouse 성능 점수 확인
- **예상 소요**: 3-4시간

---

### Phase 3: 개선 (출시 후 2-4주 내)

#### FEAT-001: 관리자 대시보드 개선
- **우선순위**: Low
- **라벨**: feature, admin
- **설명**: 관리자 기능 확장
- **작업**:
  - [ ] 실시간 통계 업데이트 (WebSocket 또는 polling)
  - [ ] 데이터 내보내기 (CSV/Excel)
  - [ ] 사용자 관리 기능
- **예상 소요**: 1-2주

#### FEAT-002: 채팅 기능 개선
- **우선순위**: Low
- **라벨**: feature, chat
- **설명**: 사용자 경험 개선
- **작업**:
  - [ ] 채팅 히스토리 저장/불러오기
  - [ ] 채팅 내보내기
  - [ ] 추천 질문 기능
- **예상 소요**: 1주

#### TEST-001: 테스트 코드 작성
- **우선순위**: Low
- **라벨**: testing, quality
- **설명**: 테스트 커버리지 확보
- **작업**:
  - [ ] API 엔드포인트 유닛 테스트
  - [ ] 프론트엔드 컴포넌트 테스트
  - [ ] E2E 테스트 (Playwright)
- **예상 소요**: 2-3주

---

## 이슈 템플릿

### Bug 템플릿
```
## 설명
[버그에 대한 간단한 설명]

## 재현 단계
1.
2.
3.

## 예상 동작
[예상되는 정상 동작]

## 실제 동작
[현재 발생하는 문제]

## 환경
- Browser:
- OS:
- 버전:

## 스크린샷
[해당되는 경우]
```

### Feature 템플릿
```
## 기능 요약
[기능에 대한 한 줄 요약]

## 배경
[왜 이 기능이 필요한지]

## 상세 요구사항
- [ ] 요구사항 1
- [ ] 요구사항 2

## 기술적 고려사항
[구현 시 고려해야 할 기술적 사항]

## 디자인
[디자인 링크 또는 설명]
```

---

## 출시 체크리스트

### 필수 (출시 전)
- [x] Critical 보안 이슈 해결
- [x] High 보안 이슈 해결
- [x] Error Boundary 추가 (SSF-78)
- [x] 환경변수 보안 검토 (RLS 강화)
- [x] 보안 미들웨어 적용 (SSF-83~88)
- [ ] 프로덕션 환경 테스트

### 권장 (출시 후 1주일)
- [ ] 접근성 기본 개선
- [ ] SEO 메타 태그
- [ ] 성능 모니터링 설정

### 선택 (출시 후)
- [ ] 테스트 코드 작성
- [ ] 추가 기능 개발
- [ ] 의존성 취약점 업그레이드 (SSF-89)

---

## 관련 문서

- [CHANGELOG.md](./CHANGELOG.md) - 버전별 변경 이력
- [SECURITY_AUDIT.md](./SECURITY_AUDIT.md) - 보안 감사 보고서
- [CLAUDE.md](./CLAUDE.md) - 작업 관리 지침
