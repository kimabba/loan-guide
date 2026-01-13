import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  parseConditionsFromText,
  findMatchingProducts,
  EMPLOYMENT_TYPE_LABELS,
  type ParsedConditions,
  type ParseResult,
  type MatchResult,
  type MatchWeights,
} from "../lib/conditionParser";
import { GuideModal } from "../components/GuideModal";

// 기본 가중치
const DEFAULT_WEIGHTS: MatchWeights = {
  age: 20,
  income: 25,
  employmentType: 20,
  employmentPeriod: 15,
  desiredAmount: 10,
  creditGrade: 10,
};

// 상품 타입
interface Product {
  item_cd: string;
  pfi_name: string;
  depth1: string;
  depth2: string;
  fi_memo: string;
  depth3?: any[];
}

export function MatchPage() {
  const navigate = useNavigate();

  // 상태
  const [inputText, setInputText] = useState("");
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [editedConditions, setEditedConditions] = useState<ParsedConditions | null>(null);
  const [matchResults, setMatchResults] = useState<MatchResult[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [productsLoaded, setProductsLoaded] = useState(false);
  const [selectedGuide, setSelectedGuide] = useState<string | null>(null);
  const [showWeightSettings, setShowWeightSettings] = useState(false);
  const [weights, setWeights] = useState<MatchWeights>(DEFAULT_WEIGHTS);
  const [step, setStep] = useState<"input" | "confirm" | "results">("input");

  // 상품 데이터 로드
  const loadProducts = useCallback(async () => {
    if (productsLoaded) return products;

    try {
      // API 시도
      const res = await fetch("/api/guides");
      if (res.ok) {
        const data = await res.json();
        let loadedProducts: Product[] = [];

        if (data && data.guides && Array.isArray(data.guides)) {
          loadedProducts = data.guides.map((g: any) => ({
            item_cd: g.item_cd,
            pfi_name: g.company || g.pfi_name,
            depth1: g.category || g.depth1,
            depth2: g.product_type || g.depth2,
            fi_memo: g.memo || g.fi_memo,
          }));
        } else if (Array.isArray(data)) {
          loadedProducts = data;
        }

        // depth3 정보 로드를 위해 로컬 JSON도 로드
        const localRes = await fetch("/loan_guides.json");
        if (localRes.ok) {
          const localData = await localRes.json();
          // depth3 정보 병합
          loadedProducts = loadedProducts.map(p => {
            const local = localData.find((l: any) => l.item_cd === p.item_cd);
            return local ? { ...p, depth3: local.depth3 } : p;
          });
        }

        setProducts(loadedProducts);
        setProductsLoaded(true);
        return loadedProducts;
      }
    } catch (e) {
      console.log("API failed, using local JSON");
    }

    // 로컬 JSON 로드
    try {
      const res = await fetch("/loan_guides.json");
      const data = await res.json();
      const loadedProducts = Array.isArray(data) ? data : [];
      setProducts(loadedProducts);
      setProductsLoaded(true);
      return loadedProducts;
    } catch (e) {
      console.error("Failed to load products:", e);
      return [];
    }
  }, [productsLoaded, products]);

  // 텍스트 파싱
  const handleParse = useCallback(() => {
    if (!inputText.trim()) return;

    const result = parseConditionsFromText(inputText);
    setParseResult(result);
    setEditedConditions(result.conditions);
    setStep("confirm");
  }, [inputText]);

  // 매칭 실행
  const handleMatch = useCallback(async () => {
    if (!editedConditions) return;

    setLoading(true);
    const loadedProducts = await loadProducts();

    // 매칭 실행 (최소 점수 기준 없이 모든 적합 상품 반환)
    const results = findMatchingProducts(
      editedConditions,
      loadedProducts,
      weights,
      0  // 최소 점수 0으로 설정하여 모든 상품 평가
    );

    // 적합한 상품만 필터링 (unmatchedConditions가 없는 것)
    const eligibleResults = results.filter(r => r.unmatchedConditions.length === 0);

    setMatchResults(eligibleResults);
    setStep("results");
    setLoading(false);
  }, [editedConditions, loadProducts, weights]);

  // 조건 수정 핸들러
  const updateCondition = useCallback((field: keyof ParsedConditions, value: any) => {
    setEditedConditions(prev => prev ? { ...prev, [field]: value } : null);
  }, []);

  // 가중치 수정 핸들러
  const updateWeight = useCallback((field: keyof MatchWeights, value: number) => {
    setWeights(prev => ({ ...prev, [field]: value }));
  }, []);

  // 다시 시작
  const handleReset = useCallback(() => {
    setInputText("");
    setParseResult(null);
    setEditedConditions(null);
    setMatchResults([]);
    setStep("input");
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* 헤더 */}
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
          >
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
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
            뒤로
          </button>
          <h1 className="text-lg font-semibold">상품 매칭</h1>
        </div>
      </header>

      <main className="container py-6">
        {/* 단계 표시 */}
        <div className="mb-8 flex items-center justify-center gap-2">
          {[
            { key: "input", label: "정보 입력" },
            { key: "confirm", label: "조건 확인" },
            { key: "results", label: "매칭 결과" },
          ].map((s, i) => (
            <div key={s.key} className="flex items-center gap-2">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                  step === s.key
                    ? "bg-primary text-primary-foreground"
                    : ["input", "confirm", "results"].indexOf(step) > i
                    ? "bg-primary/20 text-primary"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {i + 1}
              </div>
              <span
                className={`text-sm ${
                  step === s.key ? "font-medium" : "text-muted-foreground"
                }`}
              >
                {s.label}
              </span>
              {i < 2 && (
                <div className="mx-2 h-px w-8 bg-border" />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: 입력 */}
        {step === "input" && (
          <div className="mx-auto max-w-2xl">
            <div className="rounded-lg border bg-card p-6">
              <h2 className="mb-4 text-xl font-semibold">고객 정보 붙여넣기</h2>
              <p className="mb-4 text-sm text-muted-foreground">
                고객의 정보를 아래에 붙여넣으면 자동으로 조건을 인식합니다.
                <br />
                예: "35세 직장인 연봉 4500만원 재직 2년 3000만원 대출 희망"
              </p>

              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={`예시:
김철수 / 35세 / 직장인 / 연소득 4500만원
재직기간 2년 / 대출금액 3000만원 희망
신용등급 4등급`}
                className="mb-4 h-48 w-full resize-none rounded-md border bg-background p-4 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />

              {/* 예시 버튼들 */}
              <div className="mb-4 flex flex-wrap gap-2">
                <span className="text-xs text-muted-foreground">예시:</span>
                {[
                  "35세 직장인 연봉 4500만원 재직 2년",
                  "28세 4대보험 미가입 월급 300만원",
                  "45세 자영업자 연소득 6000만원",
                ].map((example, i) => (
                  <button
                    key={i}
                    onClick={() => setInputText(example)}
                    className="rounded-full bg-muted px-3 py-1 text-xs hover:bg-muted/80"
                  >
                    {example.slice(0, 20)}...
                  </button>
                ))}
              </div>

              <button
                onClick={handleParse}
                disabled={!inputText.trim()}
                className="w-full rounded-md bg-primary py-3 font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                조건 인식하기
              </button>

              {/* 개인정보 안내 */}
              <p className="mt-4 text-center text-xs text-muted-foreground">
                ⚠️ 입력된 정보는 서버에 저장되지 않으며, 브라우저에서만 처리됩니다.
              </p>
            </div>
          </div>
        )}

        {/* Step 2: 조건 확인 */}
        {step === "confirm" && parseResult && editedConditions && (
          <div className="mx-auto max-w-2xl">
            <div className="rounded-lg border bg-card p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-semibold">인식된 조건 확인</h2>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    parseResult.confidence >= 0.8
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      : parseResult.confidence >= 0.5
                      ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                      : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                  }`}
                >
                  인식률 {Math.round(parseResult.confidence * 100)}%
                </span>
              </div>

              {parseResult.details.length === 0 && (
                <div className="mb-4 rounded-md bg-yellow-50 p-4 text-sm text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400">
                  조건을 인식하지 못했습니다. 아래에서 직접 입력해주세요.
                </div>
              )}

              {/* 인식된 조건 표시 및 수정 */}
              <div className="space-y-4">
                {/* 나이 */}
                <div className="flex items-center gap-4">
                  <label className="w-24 text-sm font-medium">나이</label>
                  <input
                    type="number"
                    value={editedConditions.age || ""}
                    onChange={(e) => updateCondition("age", e.target.value ? parseInt(e.target.value) : undefined)}
                    placeholder="예: 35"
                    className="flex-1 rounded-md border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
                  />
                  <span className="text-sm text-muted-foreground">세</span>
                </div>

                {/* 연소득 */}
                <div className="flex items-center gap-4">
                  <label className="w-24 text-sm font-medium">연소득</label>
                  <input
                    type="number"
                    value={editedConditions.annualIncome || ""}
                    onChange={(e) => updateCondition("annualIncome", e.target.value ? parseInt(e.target.value) : undefined)}
                    placeholder="예: 4500"
                    className="flex-1 rounded-md border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
                  />
                  <span className="text-sm text-muted-foreground">만원</span>
                </div>

                {/* 고용형태 */}
                <div className="flex items-center gap-4">
                  <label className="w-24 text-sm font-medium">고용형태</label>
                  <select
                    value={editedConditions.employmentType || ""}
                    onChange={(e) => updateCondition("employmentType", e.target.value || undefined)}
                    className="flex-1 rounded-md border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
                  >
                    <option value="">선택 안함</option>
                    {Object.entries(EMPLOYMENT_TYPE_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 재직기간 */}
                <div className="flex items-center gap-4">
                  <label className="w-24 text-sm font-medium">재직기간</label>
                  <input
                    type="number"
                    value={editedConditions.employmentPeriod || ""}
                    onChange={(e) => updateCondition("employmentPeriod", e.target.value ? parseInt(e.target.value) : undefined)}
                    placeholder="예: 24"
                    className="flex-1 rounded-md border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
                  />
                  <span className="text-sm text-muted-foreground">개월</span>
                </div>

                {/* 희망금액 */}
                <div className="flex items-center gap-4">
                  <label className="w-24 text-sm font-medium">희망금액</label>
                  <input
                    type="number"
                    value={editedConditions.desiredAmount || ""}
                    onChange={(e) => updateCondition("desiredAmount", e.target.value ? parseInt(e.target.value) : undefined)}
                    placeholder="예: 3000"
                    className="flex-1 rounded-md border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
                  />
                  <span className="text-sm text-muted-foreground">만원</span>
                </div>

                {/* 신용등급 */}
                <div className="flex items-center gap-4">
                  <label className="w-24 text-sm font-medium">신용등급</label>
                  <select
                    value={editedConditions.creditGrade || ""}
                    onChange={(e) => updateCondition("creditGrade", e.target.value ? parseInt(e.target.value) : undefined)}
                    className="flex-1 rounded-md border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
                  >
                    <option value="">선택 안함</option>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((grade) => (
                      <option key={grade} value={grade}>
                        {grade}등급
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 가중치 설정 */}
              <div className="mt-6 border-t pt-4">
                <button
                  onClick={() => setShowWeightSettings(!showWeightSettings)}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={`transition-transform ${showWeightSettings ? "rotate-90" : ""}`}
                  >
                    <path d="m9 18 6-6-6-6" />
                  </svg>
                  매칭 우선순위 설정
                </button>

                {showWeightSettings && (
                  <div className="mt-4 space-y-3 rounded-md bg-muted/50 p-4">
                    <p className="text-xs text-muted-foreground">
                      각 조건의 가중치를 조절하여 매칭 우선순위를 변경할 수 있습니다.
                    </p>
                    {[
                      { key: "age" as const, label: "나이" },
                      { key: "income" as const, label: "연소득" },
                      { key: "employmentType" as const, label: "고용형태" },
                      { key: "employmentPeriod" as const, label: "재직기간" },
                      { key: "desiredAmount" as const, label: "희망금액" },
                      { key: "creditGrade" as const, label: "신용등급" },
                    ].map(({ key, label }) => (
                      <div key={key} className="flex items-center gap-3">
                        <span className="w-20 text-xs">{label}</span>
                        <input
                          type="range"
                          min="0"
                          max="50"
                          value={weights[key]}
                          onChange={(e) => updateWeight(key, parseInt(e.target.value))}
                          className="flex-1"
                        />
                        <span className="w-8 text-right text-xs">{weights[key]}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 버튼 */}
              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => setStep("input")}
                  className="flex-1 rounded-md border py-3 font-medium transition-colors hover:bg-muted"
                >
                  다시 입력
                </button>
                <button
                  onClick={handleMatch}
                  disabled={loading}
                  className="flex-1 rounded-md bg-primary py-3 font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                >
                  {loading ? "매칭 중..." : "상품 찾기"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: 결과 */}
        {step === "results" && (
          <div className="mx-auto max-w-4xl">
            {/* 요약 */}
            <div className="mb-6 rounded-lg border bg-card p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">
                    적합한 상품 {matchResults.length}개
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    입력하신 조건에 맞는 상품입니다.
                  </p>
                </div>
                <button
                  onClick={handleReset}
                  className="rounded-md border px-4 py-2 text-sm hover:bg-muted"
                >
                  다시 검색
                </button>
              </div>

              {/* 적용된 조건 요약 */}
              {editedConditions && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {editedConditions.age && (
                    <span className="rounded-full bg-primary/10 px-3 py-1 text-xs text-primary">
                      {editedConditions.age}세
                    </span>
                  )}
                  {editedConditions.annualIncome && (
                    <span className="rounded-full bg-primary/10 px-3 py-1 text-xs text-primary">
                      연소득 {editedConditions.annualIncome.toLocaleString()}만원
                    </span>
                  )}
                  {editedConditions.employmentType && (
                    <span className="rounded-full bg-primary/10 px-3 py-1 text-xs text-primary">
                      {EMPLOYMENT_TYPE_LABELS[editedConditions.employmentType]}
                    </span>
                  )}
                  {editedConditions.employmentPeriod && (
                    <span className="rounded-full bg-primary/10 px-3 py-1 text-xs text-primary">
                      재직 {editedConditions.employmentPeriod}개월
                    </span>
                  )}
                  {editedConditions.desiredAmount && (
                    <span className="rounded-full bg-primary/10 px-3 py-1 text-xs text-primary">
                      희망 {editedConditions.desiredAmount.toLocaleString()}만원
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* 결과 없음 */}
            {matchResults.length === 0 && (
              <div className="rounded-lg border bg-card p-8 text-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="48"
                  height="48"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="mx-auto mb-4 text-muted-foreground"
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
                <h3 className="mb-2 text-lg font-medium">적합한 상품이 없습니다</h3>
                <p className="text-sm text-muted-foreground">
                  조건을 조정하거나 일부 조건을 제거해 보세요.
                </p>
                <button
                  onClick={() => setStep("confirm")}
                  className="mt-4 rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground"
                >
                  조건 수정하기
                </button>
              </div>
            )}

            {/* 결과 목록 */}
            <div className="space-y-4">
              {matchResults.map((result, index) => (
                <div
                  key={result.item_cd}
                  onClick={() => setSelectedGuide(result.item_cd)}
                  className="cursor-pointer rounded-lg border bg-card p-4 transition-all hover:border-primary hover:shadow-md"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {/* 순위 및 금융사 */}
                      <div className="mb-2 flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                          {index + 1}
                        </span>
                        <span className="font-semibold">{result.product.pfi_name}</span>
                        <span className="rounded bg-muted px-2 py-0.5 text-xs">
                          {result.product.depth1}
                        </span>
                      </div>

                      {/* 상품 유형 */}
                      <p className="mb-2 text-sm text-muted-foreground">
                        {result.product.depth2}
                      </p>

                      {/* 충족 조건 */}
                      {result.matchedConditions.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {result.matchedConditions.map((cond, i) => (
                            <span
                              key={i}
                              className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            >
                              ✓ {cond}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* 판단 불가 조건 */}
                      {result.unknownConditions.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {result.unknownConditions.map((cond, i) => (
                            <span
                              key={i}
                              className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                            >
                              ? {cond}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* 점수 */}
                    <div className="ml-4 text-right">
                      <div
                        className={`text-2xl font-bold ${
                          result.score >= 80
                            ? "text-green-600 dark:text-green-400"
                            : result.score >= 60
                            ? "text-yellow-600 dark:text-yellow-400"
                            : "text-red-600 dark:text-red-400"
                        }`}
                      >
                        {result.score}
                      </div>
                      <div className="text-xs text-muted-foreground">적합도</div>
                    </div>
                  </div>

                  {/* 메모 */}
                  {result.product.fi_memo && (
                    <p className="mt-3 line-clamp-2 border-t pt-3 text-xs text-muted-foreground">
                      {result.product.fi_memo.replace(/\r\n/g, " ").slice(0, 150)}...
                    </p>
                  )}
                </div>
              ))}
            </div>

            {/* 안내 문구 */}
            <p className="mt-6 text-center text-xs text-muted-foreground">
              ※ 매칭 결과는 참고용이며, 실제 대출 승인 여부는 금융사 심사에 따라 달라질 수 있습니다.
            </p>
          </div>
        )}
      </main>

      {/* 상품 상세 모달 */}
      {selectedGuide && (
        <GuideModal itemCd={selectedGuide} onClose={() => setSelectedGuide(null)} />
      )}
    </div>
  );
}
