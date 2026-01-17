# Linear 이슈 목록 - 출시 전 체크리스트

## 완료된 보안 수정 (이번 세션)

### [DONE] SEC-001: /chat/debug 엔드포인트 제거
- **우선순위**: Critical
- **상태**: 완료
- **설명**: API 키 prefix가 노출되는 디버그 엔드포인트 제거
- **파일**: `apps/web/functions/api/[[path]].ts`

### [DONE] SEC-002: Admin/Stats API 인증 추가
- **우선순위**: Critical
- **상태**: 완료
- **설명**: `/stats/*`, `/admin/*` 엔드포인트에 관리자 인증 미들웨어 적용
- **파일**: `apps/web/functions/api/[[path]].ts`

### [DONE] SEC-003: Session IDOR 취약점 수정
- **우선순위**: High
- **상태**: 완료
- **설명**: `/chat/sessions` 엔드포인트에 사용자 본인 세션만 조회하도록 수정
- **파일**: `apps/web/functions/api/[[path]].ts`

### [DONE] SEC-004: 프론트엔드 인증 토큰 전달
- **우선순위**: High
- **상태**: 완료
- **설명**: Admin 페이지에서 API 호출 시 Authorization 헤더 자동 추가
- **파일**: `apps/web/src/lib/api.ts`, `StatsPage.tsx`, `AdminProductMappings.tsx`

---

## 미해결 이슈 (우선순위별)

### Phase 1: 긴급 (출시 전 필수)

#### SEC-005: 환경변수 보안 강화
- **우선순위**: High
- **라벨**: security, backend
- **설명**:
  - `SUPABASE_ANON_KEY`가 클라이언트에 노출됨 (anon key는 의도된 것이지만 RLS 정책 검토 필요)
  - Cloudflare 환경변수 암호화 상태 확인
- **작업**:
  - [ ] Supabase RLS 정책 전체 검토
  - [ ] 민감한 테이블에 적절한 RLS 적용 확인
- **예상 소요**: 2-3시간

#### FE-001: React Error Boundary 추가
- **우선순위**: High
- **라벨**: frontend, stability
- **설명**: 런타임 에러 발생 시 앱 전체가 크래시되는 것을 방지
- **작업**:
  - [ ] `ErrorBoundary` 컴포넌트 생성
  - [ ] 주요 라우트에 Error Boundary 적용
  - [ ] 에러 발생 시 사용자 친화적 UI 표시
- **파일**: `apps/web/src/components/ErrorBoundary.tsx`
- **예상 소요**: 1-2시간

#### FE-002: 로딩/에러 상태 일관성
- **우선순위**: Medium
- **라벨**: frontend, ux
- **설명**: 일부 페이지에서 로딩/에러 상태 처리가 누락됨
- **작업**:
  - [ ] 모든 API 호출 컴포넌트에 로딩 스피너 추가
  - [ ] 에러 메시지 토스트/알림 통일
- **예상 소요**: 2-3시간

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
- [ ] Error Boundary 추가
- [ ] 환경변수 보안 검토
- [ ] 프로덕션 환경 테스트

### 권장 (출시 후 1주일)
- [ ] 접근성 기본 개선
- [ ] SEO 메타 태그
- [ ] 성능 모니터링 설정

### 선택 (출시 후)
- [ ] 테스트 코드 작성
- [ ] 추가 기능 개발
