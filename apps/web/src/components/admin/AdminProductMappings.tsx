// @ts-nocheck
import { useState, useEffect } from "react";

interface ProductCategory {
  depth2Type: string;
  jobType: string | null;
  count: number;
  companies: string[];
}

interface SynonymMapping {
  key: string;
  synonyms: string[];
  category: string;
}

interface FilterStats {
  totalProducts: number;
  categories: ProductCategory[];
  jobTypes: { type: string; count: number }[];
  loanTypes: { type: string; count: number }[];
}

export function AdminProductMappings() {
  const [stats, setStats] = useState<FilterStats | null>(null);
  const [mappings, setMappings] = useState<SynonymMapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "synonyms" | "categories">("overview");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const response = await fetch("/api/admin/product-mappings");
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
        setMappings(data.synonymMappings);
      }
    } catch (error) {
      console.error("Failed to fetch mappings:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // 동의어 매핑 데이터 (하드코딩 - API에서 가져올 수도 있음)
  const synonymMappings: SynonymMapping[] = [
    // 직업 구분
    { key: "4대가입", synonyms: ["4대보험", "4대", "사대보험", "직장인", "회사원", "근로자", "정규직"], category: "직업" },
    { key: "미가입", synonyms: ["4대보험없는", "4대없는", "보험없는", "미가입자"], category: "직업" },
    { key: "프리랜서", synonyms: ["자유직", "프리", "비정규직", "자유계약", "플랫폼노동자"], category: "직업" },
    { key: "개인사업자", synonyms: ["자영업", "자영업자", "사업자", "소상공인"], category: "직업" },
    { key: "무직", synonyms: ["무직자", "실업자", "미취업", "백수", "취준생"], category: "직업" },
    { key: "주부", synonyms: ["전업주부", "주부론", "가정주부"], category: "직업" },
    { key: "청년", synonyms: ["청년론", "사회초년생", "청년대출"], category: "직업" },
    { key: "개인회생", synonyms: ["회생", "회생자", "파산"], category: "특수" },
    // 대출 유형
    { key: "신용대출", synonyms: ["신용", "무담보", "신용론"], category: "대출유형" },
    { key: "담보대출", synonyms: ["담보", "주담대", "주택담보", "하우스론"], category: "대출유형" },
    { key: "햇살론", synonyms: ["햇살", "서민대출", "정부지원대출"], category: "대출유형" },
    { key: "사잇돌", synonyms: ["사잇돌대출", "중금리"], category: "대출유형" },
    { key: "오토론", synonyms: ["자동차담보", "차량담보", "자동차대출"], category: "대출유형" },
    // 금융 조건
    { key: "금리", synonyms: ["이자", "이율", "연이율"], category: "조건" },
    { key: "한도", synonyms: ["최대금액", "대출금액", "한도액"], category: "조건" },
  ];

  // 상품 분류 데이터 (하드코딩)
  const productCategories = [
    { depth2: "신용대출(4대가입)", jobType: "4대가입", loanType: "신용대출", count: 27 },
    { depth2: "신용대출(프리랜서)", jobType: "프리랜서", loanType: "신용대출", count: 12 },
    { depth2: "신용대출(개인사업자)", jobType: "개인사업자", loanType: "신용대출", count: 8 },
    { depth2: "신용대출(미가입)", jobType: "미가입", loanType: "신용대출", count: 7 },
    { depth2: "신용대출(주부론)", jobType: "주부", loanType: "신용대출", count: 4 },
    { depth2: "신용대출(청년론)", jobType: "청년", loanType: "신용대출", count: 4 },
    { depth2: "신용대출(개인회생)", jobType: "개인회생", loanType: "신용대출", count: 5 },
    { depth2: "신용대출(무직론)", jobType: "무직", loanType: "신용대출", count: 1 },
    { depth2: "햇살론(4대가입)", jobType: "4대가입", loanType: "햇살론", count: 14 },
    { depth2: "햇살론(프리랜서)", jobType: "프리랜서", loanType: "햇살론", count: 3 },
    { depth2: "햇살론(개인사업자)", jobType: "개인사업자", loanType: "햇살론", count: 3 },
    { depth2: "햇살론(미가입)", jobType: "미가입", loanType: "햇살론", count: 2 },
    { depth2: "사잇돌(4대가입)", jobType: "4대가입", loanType: "사잇돌", count: 8 },
    { depth2: "사잇돌(프리랜서)", jobType: "프리랜서", loanType: "사잇돌", count: 2 },
    { depth2: "사잇돌(개인사업자)", jobType: "개인사업자", loanType: "사잇돌", count: 2 },
    { depth2: "사잇돌(미가입)", jobType: "미가입", loanType: "사잇돌", count: 2 },
    { depth2: "오토론", jobType: null, loanType: "오토론", count: 26 },
    { depth2: "하우스론(본인명의)", jobType: null, loanType: "하우스론", count: 9 },
    { depth2: "하우스론(배우자명의)", jobType: null, loanType: "하우스론", count: 4 },
  ];

  const jobTypeSummary = [
    { type: "4대가입", count: 49, description: "4대보험 가입 직장인" },
    { type: "프리랜서", count: 17, description: "프리랜서/자유직" },
    { type: "개인사업자", count: 13, description: "자영업자/사업자" },
    { type: "미가입", count: 11, description: "4대보험 미가입자" },
    { type: "주부", count: 4, description: "전업주부" },
    { type: "청년", count: 4, description: "사회초년생/청년" },
    { type: "개인회생", count: 5, description: "회생/파산자" },
    { type: "무직", count: 1, description: "무직자" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">상품 분류 관리</h2>
          <p className="text-sm text-muted-foreground mt-1">
            검색 필터링 매핑 및 동의어 관리
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "overview"
                ? "bg-primary text-primary-foreground"
                : "bg-muted hover:bg-muted/80"
            }`}
          >
            개요
          </button>
          <button
            onClick={() => setActiveTab("synonyms")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "synonyms"
                ? "bg-primary text-primary-foreground"
                : "bg-muted hover:bg-muted/80"
            }`}
          >
            동의어 매핑
          </button>
          <button
            onClick={() => setActiveTab("categories")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "categories"
                ? "bg-primary text-primary-foreground"
                : "bg-muted hover:bg-muted/80"
            }`}
          >
            상품 분류
          </button>
        </div>
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-card rounded-xl p-6 border border-border/50">
            <div className="text-3xl font-bold text-primary">163</div>
            <div className="text-sm text-muted-foreground mt-1">전체 상품</div>
          </div>
          <div className="bg-card rounded-xl p-6 border border-border/50">
            <div className="text-3xl font-bold text-blue-500">8</div>
            <div className="text-sm text-muted-foreground mt-1">직업 유형</div>
          </div>
          <div className="bg-card rounded-xl p-6 border border-border/50">
            <div className="text-3xl font-bold text-green-500">6</div>
            <div className="text-sm text-muted-foreground mt-1">대출 유형</div>
          </div>
          <div className="bg-card rounded-xl p-6 border border-border/50">
            <div className="text-3xl font-bold text-purple-500">15</div>
            <div className="text-sm text-muted-foreground mt-1">동의어 그룹</div>
          </div>

          {/* 직업 유형별 분포 */}
          <div className="col-span-full bg-card rounded-xl p-6 border border-border/50">
            <h3 className="font-semibold mb-4">직업 유형별 상품 분포</h3>
            <div className="space-y-3">
              {jobTypeSummary.map((item) => (
                <div key={item.type} className="flex items-center gap-4">
                  <div className="w-24 text-sm font-medium">{item.type}</div>
                  <div className="flex-1 bg-muted rounded-full h-6 overflow-hidden">
                    <div
                      className="h-full bg-primary/80 rounded-full flex items-center justify-end pr-2"
                      style={{ width: `${(item.count / 49) * 100}%` }}
                    >
                      <span className="text-xs text-primary-foreground font-medium">
                        {item.count}
                      </span>
                    </div>
                  </div>
                  <div className="w-32 text-xs text-muted-foreground">
                    {item.description}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 검색 패턴 문제 사례 */}
          <div className="col-span-full bg-card rounded-xl p-6 border border-border/50">
            <h3 className="font-semibold mb-4 text-amber-500">주의가 필요한 검색 패턴</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-start gap-2 p-3 bg-amber-500/10 rounded-lg">
                <span className="text-amber-500">⚠️</span>
                <div>
                  <div className="font-medium">"4대보험 없는 직장인"</div>
                  <div className="text-muted-foreground">→ "미가입" 상품으로 매핑 필요 (현재: +10점 가산)</div>
                </div>
              </div>
              <div className="flex items-start gap-2 p-3 bg-amber-500/10 rounded-lg">
                <span className="text-amber-500">⚠️</span>
                <div>
                  <div className="font-medium">"자영업자 대출"</div>
                  <div className="text-muted-foreground">→ "개인사업자" 상품으로 매핑 필요</div>
                </div>
              </div>
              <div className="flex items-start gap-2 p-3 bg-amber-500/10 rounded-lg">
                <span className="text-amber-500">⚠️</span>
                <div>
                  <div className="font-medium">"회사원 신용대출"</div>
                  <div className="text-muted-foreground">→ "4대가입" 상품으로 매핑 필요</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Synonyms Tab */}
      {activeTab === "synonyms" && (
        <div className="space-y-4">
          {["직업", "대출유형", "조건", "특수"].map((category) => (
            <div key={category} className="bg-card rounded-xl p-6 border border-border/50">
              <h3 className="font-semibold mb-4 text-lg">
                {category === "직업" && "👔 직업 구분 동의어"}
                {category === "대출유형" && "💰 대출 유형 동의어"}
                {category === "조건" && "📋 금융 조건 동의어"}
                {category === "특수" && "⭐ 특수 상황 동의어"}
              </h3>
              <div className="space-y-3">
                {synonymMappings
                  .filter((m) => m.category === category)
                  .map((mapping) => (
                    <div
                      key={mapping.key}
                      className="flex flex-wrap items-center gap-2 p-3 bg-muted/50 rounded-lg"
                    >
                      <span className="px-3 py-1 bg-primary text-primary-foreground rounded-full text-sm font-medium">
                        {mapping.key}
                      </span>
                      <span className="text-muted-foreground">→</span>
                      {mapping.synonyms.map((syn) => (
                        <span
                          key={syn}
                          className="px-2 py-1 bg-background border border-border rounded text-sm"
                        >
                          {syn}
                        </span>
                      ))}
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Categories Tab */}
      {activeTab === "categories" && (
        <div className="bg-card rounded-xl border border-border/50 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-4 font-medium">상품 유형 (depth2)</th>
                <th className="text-left p-4 font-medium">직업 타입</th>
                <th className="text-left p-4 font-medium">대출 유형</th>
                <th className="text-center p-4 font-medium">상품 수</th>
                <th className="text-left p-4 font-medium">검색 키워드</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {productCategories.map((cat, idx) => (
                <tr key={idx} className="hover:bg-muted/30">
                  <td className="p-4 font-medium">{cat.depth2}</td>
                  <td className="p-4">
                    {cat.jobType ? (
                      <span className="px-2 py-1 bg-blue-500/10 text-blue-500 rounded text-xs">
                        {cat.jobType}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                  <td className="p-4">
                    <span className="px-2 py-1 bg-green-500/10 text-green-500 rounded text-xs">
                      {cat.loanType}
                    </span>
                  </td>
                  <td className="p-4 text-center font-mono">{cat.count}</td>
                  <td className="p-4">
                    <div className="flex flex-wrap gap-1">
                      {cat.jobType && synonymMappings
                        .find((m) => m.key === cat.jobType)
                        ?.synonyms.slice(0, 3)
                        .map((s) => (
                          <span key={s} className="text-xs text-muted-foreground">
                            {s}
                          </span>
                        ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
