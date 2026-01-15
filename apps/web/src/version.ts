// 앱 버전 정보

export const APP_VERSION = "1.0.0";
export const APP_NAME = "대출 가이드";

export interface ChangelogEntry {
  version: string;
  date: string;
  changes: {
    type: "feat" | "fix" | "improve" | "docs";
    description: string;
  }[];
}

// 업데이트 히스토리 (최신순)
export const CHANGELOG: ChangelogEntry[] = [
  {
    version: "1.0.0",
    date: "2025-01-15",
    changes: [
      { type: "feat", description: "해시태그 기반 상품 필터링 시스템 추가" },
      { type: "feat", description: "채팅 히스토리 저장 및 품질 분석 시스템" },
      { type: "feat", description: "사용자 피드백 버튼 (도움됨/안됨/오류)" },
      { type: "improve", description: "필터 확장/축소 기능 개선" },
      { type: "improve", description: "복붙 검색을 아코디언 형식으로 변경" },
    ],
  },
  {
    version: "0.9.0",
    date: "2025-01-14",
    changes: [
      { type: "feat", description: "Gemini 2.5 Flash 기반 AI 채팅 상담" },
      { type: "feat", description: "163개 대출 상품 가이드 데이터베이스" },
      { type: "feat", description: "상품 비교 기능 (최대 3개)" },
      { type: "feat", description: "즐겨찾기 기능" },
      { type: "feat", description: "복붙 검색 (조건 자동 분석)" },
      { type: "feat", description: "다크모드 지원" },
    ],
  },
];

// 변경 타입별 라벨
export const CHANGE_TYPE_LABELS: Record<ChangelogEntry["changes"][0]["type"], { label: string; color: string }> = {
  feat: { label: "새 기능", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" },
  fix: { label: "버그 수정", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300" },
  improve: { label: "개선", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" },
  docs: { label: "문서", color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" },
};

// 최신 버전 정보
export function getLatestVersion() {
  return CHANGELOG[0];
}

// 버전 문자열
export function getVersionString() {
  return `v${APP_VERSION}`;
}
