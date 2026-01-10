#!/usr/bin/env bun
/**
 * Linear API를 사용하여 대출 가이드 챗봇 프로젝트 이슈 생성
 *
 * 사용법:
 * 1. Linear API 키 발급: Linear → Settings → API → Personal API keys
 * 2. 환경변수 설정: export LINEAR_API_KEY="lin_api_xxxxx"
 * 3. 실행: bun run scripts/linear-setup.ts
 */

const LINEAR_API_URL = "https://api.linear.app/graphql";
const API_KEY = process.env.LINEAR_API_KEY;

if (!API_KEY) {
  console.error("❌ LINEAR_API_KEY 환경변수가 설정되지 않았습니다.");
  console.log("\n설정 방법:");
  console.log("1. Linear → Settings → API → Personal API keys");
  console.log("2. export LINEAR_API_KEY='lin_api_xxxxx'");
  console.log("3. bun run scripts/linear-setup.ts");
  process.exit(1);
}

// GraphQL 요청 헬퍼
async function linearQuery(query: string, variables?: Record<string, any>) {
  const res = await fetch(LINEAR_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: API_KEY!,
    },
    body: JSON.stringify({ query, variables }),
  });

  const json = await res.json();
  if (json.errors) {
    throw new Error(JSON.stringify(json.errors, null, 2));
  }
  return json.data;
}

// 팀 목록 조회
async function getTeams() {
  const data = await linearQuery(`
    query {
      teams {
        nodes {
          id
          name
          key
        }
      }
    }
  `);
  return data.teams.nodes;
}

// 프로젝트 생성
async function createProject(teamId: string, name: string, description: string) {
  const data = await linearQuery(`
    mutation CreateProject($input: ProjectCreateInput!) {
      projectCreate(input: $input) {
        success
        project {
          id
          name
          url
        }
      }
    }
  `, {
    input: {
      name,
      description,
      teamIds: [teamId],
    }
  });
  return data.projectCreate.project;
}

// 이슈 생성
async function createIssue(
  teamId: string,
  projectId: string,
  title: string,
  description: string,
  priority: number = 2,
  parentId?: string,
  labels?: string[]
) {
  const data = await linearQuery(`
    mutation CreateIssue($input: IssueCreateInput!) {
      issueCreate(input: $input) {
        success
        issue {
          id
          identifier
          title
          url
        }
      }
    }
  `, {
    input: {
      teamId,
      projectId,
      title,
      description,
      priority,
      ...(parentId && { parentId }),
      ...(labels && { labelIds: labels }),
    }
  });
  return data.issueCreate.issue;
}

// 현재 진행 상황 반영된 이슈 데이터
const phases = [
  {
    title: "[완료] Phase 1: 프로젝트 셋업 + Monorepo",
    description: `## Status: ✅ 완료

## 완료된 작업
- [x] Bun monorepo workspace 초기화
- [x] apps/api - Hono + Cloudflare Workers 생성
- [x] apps/web - Vite + React 생성
- [x] TailwindCSS 설정
- [x] packages/shared 타입 분리

## 결과물
- API: \`http://localhost:8787\`
- Web: \`http://localhost:5173\``,
    priority: 4, // 완료됨 - 낮은 우선순위
    subtasks: []
  },
  {
    title: "Phase 2: Supabase 인증 시스템",
    description: `## Goal
카카오/구글 로그인 작동, 보호된 라우트

## Tasks
- [ ] Supabase 프로젝트 생성
- [ ] Kakao OAuth 앱 등록 + Supabase 연동
- [ ] Google OAuth 설정 + Supabase 연동
- [ ] Hono auth 미들웨어 구현
- [ ] 로그인 페이지 UI
- [ ] 보호된 라우트 구현
- [ ] 인증 상태 전역 관리 (Zustand)

## Quality Gate
- 카카오 로그인 성공
- 구글 로그인 성공
- 로그아웃 후 보호된 페이지 접근 차단
- JWT 토큰 검증 작동`,
    priority: 1,
    subtasks: [
      "Supabase 프로젝트 생성",
      "Kakao OAuth 연동",
      "Google OAuth 연동",
      "Auth 미들웨어 구현",
      "로그인/로그아웃 UI",
    ]
  },
  {
    title: "Phase 3: 멀티테넌시 (지점 관리)",
    description: `## Goal
지점 생성, 사용자-지점 연결, RLS 정책

## Tasks
- [ ] DB 스키마 생성 (branches, user_profiles)
- [ ] RLS 정책 설정
- [ ] 지점 생성/초대 API
- [ ] 사용자 프로필 페이지
- [ ] 지점 관리 페이지 (관리자용)
- [ ] 권한 체계 정리 (admin, member)

## Quality Gate
- 지점 생성 성공
- 사용자 초대 → 가입 플로우 작동
- 다른 지점 데이터 접근 불가 확인`,
    priority: 2,
    subtasks: [
      "branches, user_profiles 테이블 생성",
      "RLS 정책 설정",
      "지점 CRUD API",
      "사용자 초대 기능",
      "지점 관리 UI",
    ]
  },
  {
    title: "[진행중] Phase 4: 챗봇 UI + 기본 검색",
    description: `## Status: 🔄 진행중 (키워드 검색 완료, AI 연동 예정)

## 완료된 작업
- [x] loan_guides.json 데이터 로드 (163개 상품)
- [x] 키워드 기반 검색 API (/chat)
- [x] 채팅 UI 컴포넌트
- [x] 가이드 상세보기 모달

## 남은 작업
- [ ] Supabase DB 마이그레이션
- [ ] OpenAI/Claude 연동 (AI 응답)
- [ ] pgvector 임베딩 (선택)
- [ ] 채팅 히스토리 저장
- [ ] 응답 스트리밍`,
    priority: 1,
    subtasks: [
      "AI 연동 (OpenAI/Claude)",
      "채팅 히스토리 저장",
      "응답 스트리밍 적용",
    ]
  },
  {
    title: "[완료] Phase 5: 공지사항 + 버그 리포트",
    description: `## Status: ✅ 완료 (In-memory, DB 연동 필요)

## 완료된 작업
- [x] 공지사항 API + UI
- [x] 버그 리포트 폼 + API
- [x] 유형별 필터링

## 남은 작업 (Supabase 연동 후)
- [ ] announcements 테이블 마이그레이션
- [ ] bug_reports 테이블 마이그레이션
- [ ] 이메일 발송 연동`,
    priority: 3,
    subtasks: [
      "DB 테이블 마이그레이션",
      "이메일 발송 연동 (Resend)",
    ]
  },
  {
    title: "[완료] 보안 강화",
    description: `## Status: ✅ 완료

## 적용된 보안
- [x] Rate Limiting (100/min, chat: 30/min, reports: 10/min)
- [x] Request Size Limit (10KB)
- [x] Security Headers (CSP, X-Frame-Options, XSS Protection)
- [x] Input Validation (XSS 방지, 길이 제한)
- [x] CORS 설정

## 프로덕션 추가 작업
- [ ] Cloudflare WAF 설정
- [ ] Supabase RLS 정책`,
    priority: 4,
    subtasks: []
  },
  {
    title: "[완료] UI 개선 + 다크모드",
    description: `## Status: ✅ 완료

## 완료된 작업
- [x] Header 네비게이션
- [x] 다크모드 (light/dark/system)
- [x] 홈페이지 리디자인
- [x] 인기 검색어 섹션
- [x] Footer`,
    priority: 4,
    subtasks: []
  },
  {
    title: "Phase 6: Cloudflare 배포",
    description: `## Goal
Cloudflare 배포, 도메인 연결

## Tasks
- [ ] Cloudflare Pages 배포 설정 (Web)
- [ ] Cloudflare Workers 배포 설정 (API)
- [ ] 환경변수 설정 (Secrets)
- [ ] 커스텀 도메인 연결
- [ ] WAF 규칙 설정
- [ ] E2E 테스트

## Quality Gate
- Production URL 접속 성공
- 전체 기능 E2E 테스트 통과`,
    priority: 2,
    subtasks: [
      "Cloudflare Pages 배포 (Web)",
      "Cloudflare Workers 배포 (API)",
      "환경변수 설정",
      "커스텀 도메인 연결",
      "WAF 설정",
    ]
  },
];

async function main() {
  console.log("🚀 Linear 프로젝트 및 이슈 생성 시작\n");

  // 1. 팀 선택
  console.log("📋 팀 목록 조회 중...");
  const teams = await getTeams();

  if (teams.length === 0) {
    console.error("❌ 팀이 없습니다. Linear에서 팀을 먼저 생성해주세요.");
    process.exit(1);
  }

  console.log("\n사용 가능한 팀:");
  teams.forEach((team: any, i: number) => {
    console.log(`  ${i + 1}. ${team.name} (${team.key})`);
  });

  // 첫 번째 팀 사용 (또는 환경변수로 지정)
  const teamId = process.env.LINEAR_TEAM_ID || teams[0].id;
  const team = teams.find((t: any) => t.id === teamId) || teams[0];
  console.log(`\n✅ 선택된 팀: ${team.name}\n`);

  // 2. 프로젝트 생성
  console.log("📁 프로젝트 생성 중...");
  const project = await createProject(
    team.id,
    "대출 가이드 챗봇 SaaS",
    "대출 상담 지점 직원용 AI 챗봇. React+Hono+Supabase+Cloudflare. 163개 대출 상품 검색, OAuth 로그인, 멀티테넌시 지원."
  );
  console.log(`✅ 프로젝트 생성: ${project.name}`);
  console.log(`   URL: ${project.url}\n`);

  // 3. Phase 이슈 생성
  console.log("📝 Phase 이슈 생성 중...\n");

  for (const phase of phases) {
    // 부모 이슈 생성
    const parentIssue = await createIssue(
      team.id,
      project.id,
      phase.title,
      phase.description,
      phase.priority
    );
    console.log(`✅ ${parentIssue.identifier}: ${parentIssue.title}`);

    // 서브태스크 생성
    for (const subtask of phase.subtasks) {
      const subIssue = await createIssue(
        team.id,
        project.id,
        subtask,
        "",
        3, // 낮은 우선순위
        parentIssue.id
      );
      console.log(`   └─ ${subIssue.identifier}: ${subIssue.title}`);
    }
    console.log("");
  }

  console.log("🎉 완료! Linear에서 프로젝트를 확인하세요.");
  console.log(`   ${project.url}`);
}

main().catch((err) => {
  console.error("❌ 오류 발생:", err.message);
  process.exit(1);
});
