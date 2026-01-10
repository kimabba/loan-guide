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
    mutation AddComment($input: CommentCreateInput!) {
      commentCreate(input: $input) {
        success
      }
    }
  `, {
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
  console.log(`이슈 수: ${project.issues.nodes.length}\n`);

  // 현재 진행 상황 요약 코멘트
  const updateComment = `## 📊 진행 상황 업데이트 (${new Date().toLocaleDateString('ko-KR')})

### 완료된 작업
- ✅ Gemini File Search API 연동 완료
- ✅ Workers 단일 배포 구조 구현
- ✅ Cloud Run 배포 준비 (Dockerfile, cloudbuild.yaml)
- ✅ 로컬 테스트 성공 (Gemini AI 응답 확인)

### 현재 상태
- Cloudflare Workers: 배포됨 (Gemini 지역 제한으로 fallback 동작)
- Cloud Run: 코드 준비 완료, GCP 결제 계정 연결 대기

### 다음 작업
- [ ] GCP 결제 계정 연결
- [ ] Cloud Run 배포 (서울 리전)
- [ ] Supabase 인증 연동

### GitHub
- https://github.com/kimabba/loan-guide`;

  // 배포 관련 이슈에 코멘트 추가
  const deployIssue = project.issues.nodes.find((i: any) =>
    i.title.includes("배포") || i.title.includes("Cloudflare")
  );

  if (deployIssue) {
    console.log(`📝 이슈 업데이트: ${deployIssue.identifier} - ${deployIssue.title}`);
    await addComment(deployIssue.id, updateComment);
    console.log("✅ 코멘트 추가 완료\n");
  }

  // 이슈 목록 출력
  console.log("📋 전체 이슈 목록:");
  for (const issue of project.issues.nodes) {
    const status = issue.state?.name || "Unknown";
    console.log(`  ${issue.identifier}: ${issue.title} [${status}]`);
  }

  console.log("\n🎉 Linear 업데이트 완료!");
}

main().catch(console.error);
