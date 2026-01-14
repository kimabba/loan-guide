#!/usr/bin/env bun
/**
 * Linear 정밀 진단 스크립트
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

async function main() {
  console.log("🔍 Linear 정밀 진단 시작...\n");

  const data = await linearQuery(`
    query {
      viewer {
        name
        organization { name urlKey }
      }
      project(id: "d8f08ca8-e2aa-4411-87b6-4bb6472d1233") {
        name
        issues {
          nodes {
            identifier
            title
            state { name }
            comments {
              nodes {
                body
                createdAt
              }
            }
          }
        }
      }
    }
  `);

  console.log(`👤 사용자: ${data.viewer.name}`);
  console.log(`🏢 조직: ${data.viewer.organization.name} (${data.viewer.organization.urlKey})`);
  console.log(`📁 프로젝트: ${data.project.name}\n`);

  console.log("📝 이슈 및 코멘트 상태:");
  data.project.issues.nodes.forEach((issue: any) => {
    console.log(`[${issue.identifier}] ${issue.title} (${issue.state.name})`);
    if (issue.comments.nodes.length > 0) {
      console.log(`   └─ ✅ 코멘트 있음 (${issue.comments.nodes.length}개)`);
      const last = issue.comments.nodes[issue.comments.nodes.length - 1];
      console.log(`   └─ 최신내용: ${last.body.substring(0, 50)}...`);
    } else {
      console.log(`   └─ ❌ 코멘트 없음`);
    }
  });
}

main().catch(console.error);
