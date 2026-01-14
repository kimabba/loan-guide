import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { ProductCard } from "../components/products/ProductCard";
import { ProductFilter } from "../components/products/ProductFilter";
import { CompareBar } from "../components/products/CompareBar";
import { CompareModal } from "../components/products/CompareModal";
import { GuideModal } from "../components/GuideModal";
import { PasteSearch } from "../components/products/PasteSearch";
import { useFavoritesStore } from "../lib/favorites";
import { useCompareStore } from "../lib/compare";
import { MatchResult } from "../lib/conditionParser";

interface Product {
  item_cd: string;
  pfi_name: string;
  depth1: string;
  depth2: string;
  fi_memo: string;
}

type ViewMode = "all" | "favorites";

export function ProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    searchParams.get("categories")?.split(",").filter(Boolean) || []
  );
  const [selectedProductTypes, setSelectedProductTypes] = useState<string[]>(
    searchParams.get("types")?.split(",").filter(Boolean) || []
  );
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>(
    searchParams.get("companies")?.split(",").filter(Boolean) || []
  );
  const [viewMode, setViewMode] = useState<ViewMode>(
    (searchParams.get("view") as ViewMode) || "all"
  );
  const [selectedGuide, setSelectedGuide] = useState<string | null>(null);
  const [compareModalOpen, setCompareModalOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [matchResults, setMatchResults] = useState<MatchResult[] | null>(null);
  const [fullProducts, setFullProducts] = useState<any[]>([]); // depth3 포함 전체 데이터

  const { favorites } = useFavoritesStore();
  const { compareList } = useCompareStore();

  // 상품 목록 로드
  useEffect(() => {
    setLoading(true);

    // API 엔드포인트 시도
    fetch("/api/guides")
      .then((res) => {
        if (!res.ok) throw new Error("API failed");
        return res.json();
      })
      .then((data) => {
        // API 응답이 { total, guides } 형식인 경우 처리
        if (data && data.guides && Array.isArray(data.guides)) {
          // API 응답 필드명 변환: company -> pfi_name, category -> depth1, product_type -> depth2, memo -> fi_memo
          const mapped = data.guides.map((g: any) => ({
            item_cd: g.item_cd,
            pfi_name: g.company || g.pfi_name,
            depth1: g.category || g.depth1,
            depth2: g.product_type || g.depth2,
            fi_memo: g.memo || g.fi_memo,
          }));
          setProducts(mapped);
          setFullProducts(data.guides); // 전체 데이터 저장 (depth3 포함)
        } else if (Array.isArray(data)) {
          setProducts(data);
          setFullProducts(data);
        } else {
          setProducts([]);
          setFullProducts([]);
        }
        setLoading(false);
      })
      .catch(() => {
        // API가 없으면 로컬 JSON 파일 로드
        console.log("API not available, loading from local JSON file");
        fetch("/loan_guides.json")
          .then((res) => res.json())
          .then((data) => {
            const arr = Array.isArray(data) ? data : [];
            setProducts(arr);
            setFullProducts(arr);
            setLoading(false);
          })
          .catch((err) => {
            console.error("Failed to load loan_guides.json:", err);
            setProducts([]);
            setLoading(false);
          });
      });
  }, []);

  // URL 파라미터 동기화
  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (selectedCategories.length)
      params.set("categories", selectedCategories.join(","));
    if (selectedProductTypes.length)
      params.set("types", selectedProductTypes.join(","));
    if (selectedCompanies.length)
      params.set("companies", selectedCompanies.join(","));
    if (viewMode !== "all") params.set("view", viewMode);
    setSearchParams(params, { replace: true });
  }, [
    search,
    selectedCategories,
    selectedProductTypes,
    selectedCompanies,
    viewMode,
    setSearchParams,
  ]);

  // 필터 옵션 계산
  const filterOptions = useMemo(() => {
    const categoryMap = new Map<string, number>();
    const productTypeMap = new Map<string, number>();
    const companyMap = new Map<string, number>();

    products.forEach((p) => {
      categoryMap.set(p.depth1, (categoryMap.get(p.depth1) || 0) + 1);
      productTypeMap.set(p.depth2, (productTypeMap.get(p.depth2) || 0) + 1);
      companyMap.set(p.pfi_name, (companyMap.get(p.pfi_name) || 0) + 1);
    });

    return {
      categories: Array.from(categoryMap.entries())
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => b.count - a.count),
      productTypes: Array.from(productTypeMap.entries())
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => b.count - a.count),
      companies: Array.from(companyMap.entries())
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => b.count - a.count),
    };
  }, [products]);

  // 매칭 점수 맵 생성
  const matchScoreMap = useMemo(() => {
    const map = new Map<string, number>();
    if (matchResults) {
      matchResults.forEach((r) => map.set(r.item_cd, r.score));
    }
    return map;
  }, [matchResults]);

  // 필터링된 상품 목록
  const filteredProducts = useMemo(() => {
    let result = products;

    // 복붙 검색 결과가 있으면 해당 상품만 표시
    if (matchResults && matchResults.length > 0) {
      const matchedIds = new Set(matchResults.map((r) => r.item_cd));
      result = result.filter((p) => matchedIds.has(p.item_cd));
      // 점수순 정렬
      result = result.sort((a, b) => {
        const scoreA = matchScoreMap.get(a.item_cd) || 0;
        const scoreB = matchScoreMap.get(b.item_cd) || 0;
        return scoreB - scoreA;
      });
      return result;
    }

    // 즐겨찾기 모드
    if (viewMode === "favorites") {
      result = result.filter((p) => favorites.includes(p.item_cd));
    }

    // 검색어 필터
    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.pfi_name.toLowerCase().includes(searchLower) ||
          p.depth1.toLowerCase().includes(searchLower) ||
          p.depth2.toLowerCase().includes(searchLower) ||
          p.fi_memo?.toLowerCase().includes(searchLower)
      );
    }

    // 카테고리 필터
    if (selectedCategories.length > 0) {
      result = result.filter((p) => selectedCategories.includes(p.depth1));
    }

    // 상품유형 필터
    if (selectedProductTypes.length > 0) {
      result = result.filter((p) => selectedProductTypes.includes(p.depth2));
    }

    // 금융사 필터
    if (selectedCompanies.length > 0) {
      result = result.filter((p) => selectedCompanies.includes(p.pfi_name));
    }

    return result;
  }, [
    products,
    viewMode,
    favorites,
    search,
    selectedCategories,
    selectedProductTypes,
    selectedCompanies,
    matchResults,
    matchScoreMap,
  ]);

  const handleCategoryChange = (category: string) => {
    setSelectedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    );
  };

  const handleProductTypeChange = (productType: string) => {
    setSelectedProductTypes((prev) =>
      prev.includes(productType)
        ? prev.filter((t) => t !== productType)
        : [...prev, productType]
    );
  };

  const handleCompanyChange = (company: string) => {
    setSelectedCompanies((prev) =>
      prev.includes(company)
        ? prev.filter((c) => c !== company)
        : [...prev, company]
    );
  };

  const clearAllFilters = () => {
    setSelectedCategories([]);
    setSelectedProductTypes([]);
    setSelectedCompanies([]);
    setSearch("");
  };

  const compareProducts = products
    .filter((p) => compareList.includes(p.item_cd))
    .map((p) => ({
      itemCd: p.item_cd,
      company: p.pfi_name,
      productType: p.depth2,
    }));

  return (
    <div className="min-h-[calc(100vh-56px)] bg-background pb-20">
      {/* 상세 모달 */}
      <GuideModal
        itemCd={selectedGuide}
        onClose={() => setSelectedGuide(null)}
      />

      {/* 비교 모달 */}
      <CompareModal
        isOpen={compareModalOpen}
        onClose={() => setCompareModalOpen(false)}
      />

      {/* 헤더 영역 */}
      <div className="border-b bg-card">
        <div className="mx-auto max-w-7xl px-4 py-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                대출 상품 탐색
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {filteredProducts.length}개 상품{" "}
                {products.length !== filteredProducts.length &&
                  `(전체 ${products.length}개)`}
              </p>
            </div>

            {/* 뷰 모드 토글 */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode("all")}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  viewMode === "all"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                전체 상품
              </button>
              <button
                onClick={() => setViewMode("favorites")}
                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  viewMode === "favorites"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
                즐겨찾기 ({favorites.length})
              </button>
            </div>
          </div>

          {/* 검색창 */}
          <div className="mt-4">
            <div className="relative">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="금융사명, 상품명, 키워드 검색..."
                className="w-full rounded-lg border bg-background px-4 py-3 pl-10 focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </div>
          </div>

          {/* 필터 토글 버튼 (모바일) */}
          <button
            onClick={() => setFilterOpen(!filterOpen)}
            className="mt-4 flex w-full items-center justify-between rounded-lg border bg-background px-4 py-2 text-sm sm:hidden"
          >
            <span className="font-medium">필터</span>
            <span className="text-muted-foreground">
              {selectedCategories.length +
                selectedProductTypes.length +
                selectedCompanies.length >
              0
                ? `${
                    selectedCategories.length +
                    selectedProductTypes.length +
                    selectedCompanies.length
                  }개 선택`
                : "선택 없음"}
            </span>
          </button>

          {/* 필터 영역 */}
          <div className={`mt-4 ${filterOpen ? "block" : "hidden"} sm:block`}>
            <ProductFilter
              categories={filterOptions.categories}
              productTypes={filterOptions.productTypes}
              companies={filterOptions.companies}
              selectedCategories={selectedCategories}
              selectedProductTypes={selectedProductTypes}
              selectedCompanies={selectedCompanies}
              onCategoryChange={handleCategoryChange}
              onProductTypeChange={handleProductTypeChange}
              onCompanyChange={handleCompanyChange}
              onClearAll={clearAllFilters}
            />
          </div>
        </div>
      </div>

      {/* 복붙 검색 아코디언 */}
      <div className="mx-auto max-w-7xl px-4 pt-4">
        <PasteSearch
          products={fullProducts}
          onMatchResults={setMatchResults}
        />

        {/* 매칭 결과 헤더 */}
        {matchResults && matchResults.length > 0 && (
          <div className="mt-4 flex items-center justify-between p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
            <div className="flex items-center gap-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-green-600 dark:text-green-400"
              >
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              <span className="font-medium text-green-700 dark:text-green-300">
                {matchResults.length}개 적합 상품 발견
              </span>
              <span className="text-sm text-green-600 dark:text-green-400">
                (적합도순 정렬)
              </span>
            </div>
            <button
              onClick={() => setMatchResults(null)}
              className="text-sm text-green-600 dark:text-green-400 hover:underline"
            >
              전체 상품 보기
            </button>
          </div>
        )}
      </div>

      {/* 상품 목록 */}
      <div className="mx-auto max-w-7xl px-4 py-6">
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-48 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <svg
              className="mb-4 text-muted-foreground"
              xmlns="http://www.w3.org/2000/svg"
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <h3 className="mb-2 text-lg font-medium text-foreground">
              {viewMode === "favorites"
                ? "즐겨찾기한 상품이 없습니다"
                : "검색 결과가 없습니다"}
            </h3>
            <p className="text-sm text-muted-foreground">
              {viewMode === "favorites"
                ? "상품 카드의 별 아이콘을 눌러 즐겨찾기에 추가해보세요"
                : "다른 검색어나 필터를 시도해보세요"}
            </p>
            {(selectedCategories.length > 0 ||
              selectedProductTypes.length > 0 ||
              selectedCompanies.length > 0 ||
              search) && (
              <button
                onClick={clearAllFilters}
                className="mt-4 text-sm text-primary hover:underline"
              >
                필터 초기화
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.item_cd}
                itemCd={product.item_cd}
                company={product.pfi_name}
                category={product.depth1}
                productType={product.depth2}
                summary={product.fi_memo || ""}
                matchScore={matchScoreMap.get(product.item_cd)}
                onClick={() => setSelectedGuide(product.item_cd)}
              />
            ))}
          </div>
        )}
      </div>

      {/* 비교 바 */}
      <CompareBar
        products={compareProducts}
        onCompare={() => setCompareModalOpen(true)}
      />
    </div>
  );
}
