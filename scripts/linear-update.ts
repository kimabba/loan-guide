#!/usr/bin/env bun
/**
 * Linear 이슈 상태 업데이트
 */

const LINEAR_API_URL = "https://api.linear.app/graphql";
const API_KEY = process.env.LINEAR_API_KEY;

if (!API_KEY) {
  console.error("LINEAR_API_KEY 환경변수가 필요합니다.");
  process.exit(1);
}

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
  if (json.errors) throw new Error(JSON.stringify(json.errors, null, 2));
  return json.data;
}

// 프로젝트의 이슈 목록 조회
async function getProjectIssues(projectName: string) {
  const data = await linearQuery(`
    query {
      projects(filter: { name: { contains: "${projectName}" } }) {
        nodes {
          id
          name
          issues {
            nodes {
              id
              identifier
              title
              state {
                name
              }
            }
          }
        }
      }
    }
  `);
  return data.projects.nodes[0];
}

// 코멘트 추가
async function addComment(issueId: string, body: string) {
  const data = await linearQuery(`
    mutation AddComment($input: CommentCreateInput!) {\n      commentCreate(input: $input) {\n        success\n      }\n    }\n  `, {
    input: { issueId, body }
  });
  return data.commentCreate.success;
}

async function main() {
  console.log("📋 Linear 프로젝트 조회 중...\n");

  const project = await getProjectIssues("대출 가이드");

  if (!project) {
    console.error("프로젝트를 찾을 수 없습니다.");
    process.exit(1);
  }

  console.log(`프로젝트: ${project.name}`);
  
  const uiComment = `## 📊 UI/UX 및 모바일 최적화 작업 완료 (${new Date().toLocaleDateString('ko-KR')})

### 1. 테마 시스템 개선
- ✅ "System" 모드 제거, "Light/Dark" 2종 체계로 단순화
- ✅ 테마 전환 로직 최적화 (zustand persist 연동)

### 2. 메인 페이지 리뉴얼 및 기능 복구
- ✅ 불필요한 이모지(💳, 🏦 등) 및 장식 요소 전면 제거
- ✅ "이용 방법", "주요 기능" 섹션 디자인 간소화 (텍스트/숫자 뱃지 중심)
- ✅ **상품 목록 섹션 복구**: 챗봇 시작하기 하단에 대표 상품 6종 리스트 추가
- ✅ 데이터 동기화: \`public/loan_guides.json\` 경로 수정 및 파일 배치

### 3. 모바일 레이아웃 최적화
- ✅ **메뉴 통합**: 상단 네비게이션을 우측 드롭다운 '메뉴' 버튼으로 통합
- ✅ **반응형 대응**: 모바일 화면에서 로고 텍스트 및 메뉴 글자 자동 숨김 처리
- ✅ 요소 간 간격 및 배치를 조정하여 모바일 겹침 현상 해결

### GitHub
- https://github.com/kimabba/loan-guide`;

  // UI 관련 이슈 찾기
  const uiIssue = project.issues.nodes.find((i: any) => 
    i.title.includes("UI 개선") || i.identifier === "SSF-26"
  );

  if (uiIssue) {
    console.log(`📝 이슈 업데이트: ${uiIssue.identifier} - ${uiIssue.title}`);
    await addComment(uiIssue.id, uiComment);
    console.log("✅ 상세 작업 내용 코멘트 추가 완료\n");
  }

  console.log("📋 전체 이슈 목록:");
  for (const issue of project.issues.nodes) {
    const status = issue.state?.name || "Unknown";
    console.log(`  ${issue.identifier}: ${issue.title} [${status}]`);
  }

  console.log("\n🎉 Linear 업데이트 완료!");
}

main().catch(console.error);
