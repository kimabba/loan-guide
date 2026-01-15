// 대출 상품에서 태그를 추출하는 유틸리티

export interface ProductTags {
  employmentType: string[];  // 고용형태
  productType: string[];     // 상품유형
  features: string[];        // 특징
}

// 고용형태 태그 매핑
const EMPLOYMENT_KEYWORDS: Record<string, string> = {
  "4대가입": "#4대가입",
  "4대보험": "#4대가입",
  "미가입": "#미가입",
  "4대미가입": "#미가입",
  "프리랜서": "#프리랜서",
  "개인사업자": "#개인사업자",
  "법인대표": "#법인대표",
  "자영업": "#자영업자",
  "주부": "#주부",
  "무직": "#무직",
  "일용직": "#일용직",
  "계약직": "#계약직",
  "아르바이트": "#아르바이트",
  "알바": "#아르바이트",
  "공무원": "#공무원",
  "군인": "#군인",
  "연금": "#연금수령자",
  "연금수령": "#연금수령자",
};

// 상품유형 태그 매핑
const PRODUCT_TYPE_KEYWORDS: Record<string, string> = {
  "신용대출": "#신용대출",
  "햇살론": "#햇살론",
  "사잇돌": "#사잇돌",
  "오토론": "#오토론",
  "하우스론": "#하우스론",
  "담보대출": "#담보대출",
  "전세자금": "#전세자금",
  "비상금": "#비상금대출",
  "마이너스": "#마이너스통장",
  "카드론": "#카드론",
  "학자금": "#학자금대출",
};

// 특징 태그 매핑
const FEATURE_KEYWORDS: Record<string, string> = {
  "만기일시": "#만기일시가능",
  "DSR무관": "#DSR무관",
  "DSR제외": "#DSR무관",
  "재직확인면제": "#재직확인면제",
  "재직확인 면제": "#재직확인면제",
  "소득증빙": "#소득증빙필요",
  "무서류": "#무서류",
  "당일승인": "#당일승인",
  "즉시승인": "#즉시승인",
  "비대면": "#비대면",
  "저금리": "#저금리",
  "고한도": "#고한도",
  "중수료 면제": "#수수료면제",
  "중수료면제": "#수수료면제",
  "신용등급무관": "#신용등급무관",
  "저신용": "#저신용가능",
};

// 텍스트에서 태그 추출
function extractTagsFromText(text: string | undefined | null, keywordMap: Record<string, string>): string[] {
  if (!text) return [];

  const tags = new Set<string>();
  const lowerText = text.toLowerCase();

  for (const [keyword, tag] of Object.entries(keywordMap)) {
    if (lowerText.includes(keyword.toLowerCase())) {
      tags.add(tag);
    }
  }

  return Array.from(tags);
}

// 상품에서 모든 태그 추출
export function extractProductTags(product: {
  depth2?: string;
  fi_memo?: string;
  depth3?: Array<{
    depth4_key?: Array<{
      detail?: string;
    }>;
  }>;
} | null | undefined): ProductTags {
  if (!product) {
    return { employmentType: [], productType: [], features: [] };
  }

  // depth2와 fi_memo에서 텍스트 수집
  let searchText = `${product.depth2 || ""} ${product.fi_memo || ""}`;

  // depth3의 상세 내용에서도 수집
  if (product.depth3) {
    for (const d3 of product.depth3) {
      if (d3.depth4_key) {
        for (const d4 of d3.depth4_key) {
          if (d4.detail) {
            searchText += ` ${d4.detail}`;
          }
        }
      }
    }
  }

  return {
    employmentType: extractTagsFromText(searchText, EMPLOYMENT_KEYWORDS),
    productType: extractTagsFromText(product.depth2 || "", PRODUCT_TYPE_KEYWORDS),
    features: extractTagsFromText(searchText, FEATURE_KEYWORDS),
  };
}

// 모든 태그를 하나의 배열로 반환
export function getAllTags(product: {
  depth2?: string;
  fi_memo?: string;
  depth3?: Array<{
    depth4_key?: Array<{
      detail?: string;
    }>;
  }>;
} | null | undefined): string[] {
  if (!product) return [];

  const tags = extractProductTags(product);
  return [
    ...tags.employmentType,
    ...tags.productType,
    ...tags.features,
  ];
}

// 태그 카테고리별 색상
export function getTagColor(tag: string): { bg: string; text: string } {
  // 고용형태 태그
  if (["#4대가입", "#미가입", "#프리랜서", "#개인사업자", "#법인대표", "#자영업자", "#주부", "#무직", "#일용직", "#계약직", "#아르바이트", "#공무원", "#군인", "#연금수령자"].includes(tag)) {
    return { bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-700 dark:text-blue-300" };
  }

  // 상품유형 태그
  if (["#신용대출", "#햇살론", "#사잇돌", "#오토론", "#하우스론", "#담보대출", "#전세자금", "#비상금대출", "#마이너스통장", "#카드론", "#학자금대출"].includes(tag)) {
    return { bg: "bg-purple-100 dark:bg-purple-900/30", text: "text-purple-700 dark:text-purple-300" };
  }

  // 특징 태그
  return { bg: "bg-green-100 dark:bg-green-900/30", text: "text-green-700 dark:text-green-300" };
}

// 인기 태그 집계
export function getPopularTags(products: Array<{
  depth2?: string;
  fi_memo?: string;
  depth3?: Array<{
    depth4_key?: Array<{
      detail?: string;
    }>;
  }>;
} | null | undefined> | null | undefined): { tag: string; count: number }[] {
  if (!products || !Array.isArray(products)) return [];

  const tagCounts = new Map<string, number>();

  for (const product of products) {
    if (!product) continue;
    const tags = getAllTags(product);
    for (const tag of tags) {
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
    }
  }

  return Array.from(tagCounts.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count);
}
