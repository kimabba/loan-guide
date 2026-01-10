import { Hono } from "hono";


export const announcementsRoutes = new Hono();

export interface Announcement {
  id: string;
  type: "update" | "notice" | "maintenance" | "new_feature";
  title: string;
  content: string;
  important: boolean;
  createdAt: string;
}

// Sample announcements data
const announcements: Announcement[] = [
  {
    id: "1",
    type: "new_feature",
    title: "대출 가이드 챗봇 서비스 오픈",
    content: `안녕하세요, 대출 가이드 서비스를 이용해 주셔서 감사합니다.

오늘부터 대출 가이드 챗봇 서비스가 정식 오픈되었습니다.

**주요 기능:**
- 163개 대출 상품 정보 검색
- 키워드 기반 맞춤 상품 추천
- 상세 대출 조건 확인

많은 이용 부탁드립니다.`,
    important: true,
    createdAt: "2025-01-10T09:00:00Z",
  },
  {
    id: "2",
    type: "update",
    title: "OK저축은행 상품 정보 업데이트",
    content: `OK저축은행의 대출 상품 정보가 업데이트되었습니다.

**변경 사항:**
- OK비상금대출 금리 조정 (연 15.9% → 연 14.9%)
- OK프리론 한도 변경 (최대 3,000만원 → 최대 5,000만원)

자세한 내용은 챗봇에서 확인해 주세요.`,
    important: false,
    createdAt: "2025-01-09T14:30:00Z",
  },
  {
    id: "3",
    type: "maintenance",
    title: "시스템 점검 안내 (1/15)",
    content: `서비스 품질 향상을 위한 시스템 점검이 예정되어 있습니다.

**점검 일시:** 2025년 1월 15일 02:00 ~ 06:00 (4시간)
**영향 범위:** 전체 서비스 일시 중단

점검 시간 동안 서비스 이용이 불가하오니 양해 부탁드립니다.`,
    important: true,
    createdAt: "2025-01-08T10:00:00Z",
  },
  {
    id: "4",
    type: "notice",
    title: "개인정보처리방침 변경 안내",
    content: `개인정보처리방침이 일부 변경되었습니다.

**주요 변경 사항:**
- 수집 정보 항목 명확화
- 보유 기간 변경 (1년 → 6개월)
- 제3자 제공 조항 삭제

변경된 방침은 2025년 2월 1일부터 적용됩니다.`,
    important: false,
    createdAt: "2025-01-07T11:00:00Z",
  },
  {
    id: "5",
    type: "new_feature",
    title: "다크 모드 지원 시작",
    content: `사용자 편의를 위해 다크 모드를 지원합니다.

우측 상단의 테마 버튼을 클릭하여 라이트/다크/시스템 모드 중 선택하실 수 있습니다.

시스템 모드 선택 시 기기 설정에 따라 자동으로 테마가 변경됩니다.`,
    important: false,
    createdAt: "2025-01-06T16:00:00Z",
  },
];

// Get all announcements
announcementsRoutes.get("/", (c) => {
  const type = c.req.query("type");
  const important = c.req.query("important");

  let filtered = [...announcements];

  if (type) {
    filtered = filtered.filter((a) => a.type === type);
  }

  if (important === "true") {
    filtered = filtered.filter((a) => a.important);
  }

  // Sort by date (newest first)
  filtered.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return c.json({
    total: filtered.length,
    announcements: filtered,
  });
});

// Get single announcement
announcementsRoutes.get("/:id", (c) => {
  const id = c.req.param("id");
  const announcement = announcements.find((a) => a.id === id);

  if (!announcement) {
    return c.json({ error: "공지사항을 찾을 수 없습니다" }, 404);
  }

  return c.json(announcement);
});
