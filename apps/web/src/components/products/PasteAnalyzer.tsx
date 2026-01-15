import { useState, useCallback } from "react";

interface AnalysisResult {
  // 기본 정보
  name?: string;
  age?: number;
  occupation?: string;
  income?: string;
  creditScore?: string;

  // 대출 관련
  loanPurpose?: string;
  loanAmount?: string;

  // 소유 여부
  hasVehicle?: boolean;
  vehicleInfo?: string;
  hasCollateral?: boolean;
  collateralInfo?: string;
  hasProperty?: boolean;
  propertyInfo?: string;

  // 추가 정보
  has4Insurance?: boolean;
  employmentType?: string;
  employmentPeriod?: string;
}

interface PasteAnalyzerProps {
  onAnalysisComplete?: (result: AnalysisResult) => void;
  onFilterProducts?: (filters: { categories?: string[]; productTypes?: string[] }) => void;
}

// 아이콘 컴포넌트들
const ClipboardIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="8" height="4" x="8" y="2" rx="1" ry="1"/>
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
  </svg>
);

const SparklesIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/>
  </svg>
);

const CarIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9L18 10l-2-4H8L6 10l-2.5 1.1C2.7 11.3 2 12.1 2 13v3c0 .6.4 1 1 1h2"/>
    <circle cx="7" cy="17" r="2"/>
    <circle cx="17" cy="17" r="2"/>
  </svg>
);

const HomeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
    <polyline points="9,22 9,12 15,12 15,22"/>
  </svg>
);

const ShieldIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/>
  </svg>
);

const CheckIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20,6 9,17 4,12"/>
  </svg>
);

const XIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
  </svg>
);

export function PasteAnalyzer({ onAnalysisComplete, onFilterProducts }: PasteAnalyzerProps) {
  const [text, setText] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const analyzeText = useCallback((inputText: string): AnalysisResult => {
    const result: AnalysisResult = {};
    const lowerText = inputText.toLowerCase();

    // 이름 추출 (이름:, 성명:, 고객명: 등)
    const nameMatch = inputText.match(/(?:이름|성명|고객명|고객)\s*[:\s]\s*([가-힣]{2,4})/);
    if (nameMatch) result.name = nameMatch[1];

    // 나이/연령 추출
    const ageMatch = inputText.match(/(?:나이|연령|만)\s*[:\s]?\s*(\d{1,3})\s*(?:세|살)?/);
    if (ageMatch) result.age = parseInt(ageMatch[1]);

    // 직업/직종 추출
    const occupationPatterns = [
      /(?:직업|직종|직장)\s*[:\s]\s*([가-힣a-zA-Z]+)/,
      /(자영업|사업자|프리랜서|무직|주부|학생|회사원|공무원|군인|전문직)/
    ];
    for (const pattern of occupationPatterns) {
      const match = inputText.match(pattern);
      if (match) {
        result.occupation = match[1];
        break;
      }
    }

    // 소득 추출
    const incomeMatch = inputText.match(/(?:소득|월급|급여|연봉|수입)\s*[:\s]?\s*([\d,]+)\s*(?:만원|원)?/);
    if (incomeMatch) result.income = incomeMatch[1] + "만원";

    // 신용등급/점수 추출
    const creditMatch = inputText.match(/(?:신용|등급|점수|NICE|KCB)\s*[:\s]?\s*(\d{1,4}|[1-9]등급|[가-힣]+등급)/i);
    if (creditMatch) result.creditScore = creditMatch[1];

    // 대출 목적 추출
    const purposePatterns = [
      /(생활자금|사업자금|전세자금|주택자금|차량구입|학자금|결혼자금|의료비|긴급자금|기타)/,
      /(?:목적|용도)\s*[:\s]\s*([가-힣]+)/
    ];
    for (const pattern of purposePatterns) {
      const match = inputText.match(pattern);
      if (match) {
        result.loanPurpose = match[1];
        break;
      }
    }

    // 대출 금액 추출
    const amountMatch = inputText.match(/(?:금액|희망금액|대출금|필요금액)\s*[:\s]?\s*([\d,]+)\s*(?:만원|원)?/);
    if (amountMatch) result.loanAmount = amountMatch[1] + "만원";

    // 차량 소유여부 추출
    if (lowerText.includes("차량") || lowerText.includes("자동차") || lowerText.includes("자차")) {
      const vehicleOwned = /(차량|자동차|자차)\s*(소유|있|보유|o|○|예|yes)/i.test(inputText);
      const vehicleNotOwned = /(차량|자동차|자차)\s*(없|무|x|×|아니|no)/i.test(inputText);

      if (vehicleOwned) {
        result.hasVehicle = true;
        const vehicleInfoMatch = inputText.match(/(?:차량|자동차|차종)\s*[:\s]?\s*([가-힣a-zA-Z0-9\s]+?)(?:\s|$|,)/);
        if (vehicleInfoMatch) result.vehicleInfo = vehicleInfoMatch[1].trim();
      } else if (vehicleNotOwned) {
        result.hasVehicle = false;
      } else {
        // 차량 관련 키워드가 있지만 소유 여부가 명확하지 않으면 언급만 있는 것으로 처리
        result.hasVehicle = undefined;
      }
    }

    // 담보 소유여부 추출
    if (lowerText.includes("담보") || lowerText.includes("부동산") || lowerText.includes("아파트") || lowerText.includes("주택")) {
      const collateralOwned = /(담보|부동산|아파트|주택)\s*(소유|있|보유|o|○|예|yes)/i.test(inputText);
      const collateralNotOwned = /(담보|부동산|아파트|주택)\s*(없|무|x|×|아니|no)/i.test(inputText);

      if (collateralOwned) {
        result.hasCollateral = true;
        result.hasProperty = true;
        const propertyMatch = inputText.match(/(?:담보|부동산|아파트|주택)\s*[:\s]?\s*([가-힣a-zA-Z0-9\s]+?)(?:\s|$|,)/);
        if (propertyMatch) {
          result.collateralInfo = propertyMatch[1].trim();
          result.propertyInfo = propertyMatch[1].trim();
        }
      } else if (collateralNotOwned) {
        result.hasCollateral = false;
        result.hasProperty = false;
      }
    }

    // 4대보험 여부 추출
    if (lowerText.includes("4대보험") || lowerText.includes("사대보험")) {
      const has4Ins = /(4대보험|사대보험)\s*(가입|있|o|○|예|yes)/i.test(inputText);
      const no4Ins = /(4대보험|사대보험)\s*(없|무|미가입|x|×|아니|no)/i.test(inputText);

      if (has4Ins) result.has4Insurance = true;
      else if (no4Ins) result.has4Insurance = false;
    }

    // 고용형태 추출
    const employmentTypes = ["정규직", "계약직", "일용직", "아르바이트", "파트타임", "프리랜서", "자영업", "개인사업자", "법인사업자"];
    for (const type of employmentTypes) {
      if (inputText.includes(type)) {
        result.employmentType = type;
        break;
      }
    }

    // 재직기간 추출
    const periodMatch = inputText.match(/(?:재직|근무|근속)\s*(?:기간)?\s*[:\s]?\s*(\d+)\s*(?:년|개월)/);
    if (periodMatch) result.employmentPeriod = periodMatch[0];

    return result;
  }, []);

  const handleAnalyze = useCallback(() => {
    if (!text.trim()) return;

    setIsAnalyzing(true);

    // 분석 시뮬레이션 (실제로는 즉시 처리)
    setTimeout(() => {
      const analysisResult = analyzeText(text);
      setResult(analysisResult);
      setIsAnalyzing(false);
      setIsExpanded(true);

      // 콜백 호출
      if (onAnalysisComplete) {
        onAnalysisComplete(analysisResult);
      }

      // 분석 결과에 따라 상품 필터 추천
      if (onFilterProducts) {
        const filters: { categories?: string[]; productTypes?: string[] } = {};

        if (analysisResult.hasVehicle) {
          filters.productTypes = ["자동차담보대출"];
        }
        if (analysisResult.hasCollateral || analysisResult.hasProperty) {
          filters.productTypes = [...(filters.productTypes || []), "부동산담보대출"];
        }
        if (!analysisResult.has4Insurance) {
          // 4대보험 없는 경우 해당 상품 추천
          filters.categories = ["무직자대출", "프리랜서대출"];
        }

        if (filters.categories?.length || filters.productTypes?.length) {
          onFilterProducts(filters);
        }
      }
    }, 800);
  }, [text, analyzeText, onAnalysisComplete, onFilterProducts]);

  const handlePaste = useCallback(async () => {
    try {
      const clipboardText = await navigator.clipboard.readText();
      setText(clipboardText);
    } catch {
      // 클립보드 접근 불가 시 무시
    }
  }, []);

  const handleClear = useCallback(() => {
    setText("");
    setResult(null);
    setIsExpanded(false);
  }, []);

  return (
    <div className="rounded-xl border bg-gradient-to-br from-primary/5 via-background to-primary/5 p-4 shadow-sm">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <ClipboardIcon />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">복붙 검색</h3>
            <p className="text-xs text-muted-foreground">고객 정보를 붙여넣고 분석하세요</p>
          </div>
        </div>
        {result && (
          <button
            onClick={handleClear}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            초기화
          </button>
        )}
      </div>

      {/* 입력 영역 */}
      <div className="space-y-3">
        <div className="relative">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="고객 정보를 여기에 붙여넣으세요...&#10;예: 이름: 홍길동, 나이: 35세, 직업: 회사원, 차량: 소유, 담보: 없음"
            className="w-full min-h-[100px] rounded-lg border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-muted-foreground/60"
          />
          <button
            onClick={handlePaste}
            className="absolute top-2 right-2 flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-colors"
          >
            <ClipboardIcon />
            붙여넣기
          </button>
        </div>

        {/* 분석하기 버튼 - 눈에 띄게 */}
        <button
          onClick={handleAnalyze}
          disabled={!text.trim() || isAnalyzing}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary/80 px-6 py-4 font-semibold text-primary-foreground shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 hover:from-primary/90 hover:to-primary/70 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none transition-all duration-300 animate-pulse-gentle"
        >
          {isAnalyzing ? (
            <>
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
              분석 중...
            </>
          ) : (
            <>
              <SparklesIcon />
              <span className="text-lg">분석하기</span>
            </>
          )}
        </button>
      </div>

      {/* 분석 결과 */}
      {result && isExpanded && (
        <div className="mt-4 space-y-3 animate-fade-in">
          <div className="h-px bg-border" />

          <h4 className="font-semibold text-sm text-foreground flex items-center gap-2">
            <SparklesIcon />
            분석 결과
          </h4>

          <div className="grid grid-cols-2 gap-2 text-sm">
            {/* 기본 정보 */}
            {result.name && (
              <div className="rounded-lg bg-muted/50 px-3 py-2">
                <span className="text-muted-foreground">이름:</span>
                <span className="ml-2 font-medium">{result.name}</span>
              </div>
            )}
            {result.age && (
              <div className="rounded-lg bg-muted/50 px-3 py-2">
                <span className="text-muted-foreground">나이:</span>
                <span className="ml-2 font-medium">{result.age}세</span>
              </div>
            )}
            {result.occupation && (
              <div className="rounded-lg bg-muted/50 px-3 py-2">
                <span className="text-muted-foreground">직업:</span>
                <span className="ml-2 font-medium">{result.occupation}</span>
              </div>
            )}
            {result.income && (
              <div className="rounded-lg bg-muted/50 px-3 py-2">
                <span className="text-muted-foreground">소득:</span>
                <span className="ml-2 font-medium">{result.income}</span>
              </div>
            )}
            {result.creditScore && (
              <div className="rounded-lg bg-muted/50 px-3 py-2">
                <span className="text-muted-foreground">신용:</span>
                <span className="ml-2 font-medium">{result.creditScore}</span>
              </div>
            )}
            {result.employmentType && (
              <div className="rounded-lg bg-muted/50 px-3 py-2">
                <span className="text-muted-foreground">고용형태:</span>
                <span className="ml-2 font-medium">{result.employmentType}</span>
              </div>
            )}
          </div>

          {/* 소유 여부 - 눈에 띄는 카드 형태 */}
          <div className="space-y-2">
            <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">자산 보유 현황</h5>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {/* 차량 소유 */}
              <div className={`rounded-xl border-2 p-3 transition-colors ${
                result.hasVehicle === true
                  ? "border-green-500 bg-green-50 dark:bg-green-950/30"
                  : result.hasVehicle === false
                    ? "border-red-300 bg-red-50/50 dark:bg-red-950/20"
                    : "border-muted bg-muted/30"
              }`}>
                <div className="flex items-center gap-2 mb-1">
                  <div className={`p-1.5 rounded-lg ${
                    result.hasVehicle === true
                      ? "bg-green-500 text-white"
                      : result.hasVehicle === false
                        ? "bg-red-400 text-white"
                        : "bg-muted-foreground/20 text-muted-foreground"
                  }`}>
                    <CarIcon />
                  </div>
                  <span className="font-medium text-sm">차량</span>
                </div>
                <div className="flex items-center gap-1 text-sm">
                  {result.hasVehicle === true ? (
                    <>
                      <CheckIcon />
                      <span className="text-green-600 dark:text-green-400 font-medium">소유</span>
                    </>
                  ) : result.hasVehicle === false ? (
                    <>
                      <XIcon />
                      <span className="text-red-500 dark:text-red-400">미소유</span>
                    </>
                  ) : (
                    <span className="text-muted-foreground">정보 없음</span>
                  )}
                </div>
                {result.vehicleInfo && (
                  <p className="mt-1 text-xs text-muted-foreground">{result.vehicleInfo}</p>
                )}
              </div>

              {/* 담보/부동산 소유 */}
              <div className={`rounded-xl border-2 p-3 transition-colors ${
                result.hasCollateral === true
                  ? "border-green-500 bg-green-50 dark:bg-green-950/30"
                  : result.hasCollateral === false
                    ? "border-red-300 bg-red-50/50 dark:bg-red-950/20"
                    : "border-muted bg-muted/30"
              }`}>
                <div className="flex items-center gap-2 mb-1">
                  <div className={`p-1.5 rounded-lg ${
                    result.hasCollateral === true
                      ? "bg-green-500 text-white"
                      : result.hasCollateral === false
                        ? "bg-red-400 text-white"
                        : "bg-muted-foreground/20 text-muted-foreground"
                  }`}>
                    <HomeIcon />
                  </div>
                  <span className="font-medium text-sm">부동산/담보</span>
                </div>
                <div className="flex items-center gap-1 text-sm">
                  {result.hasCollateral === true ? (
                    <>
                      <CheckIcon />
                      <span className="text-green-600 dark:text-green-400 font-medium">소유</span>
                    </>
                  ) : result.hasCollateral === false ? (
                    <>
                      <XIcon />
                      <span className="text-red-500 dark:text-red-400">미소유</span>
                    </>
                  ) : (
                    <span className="text-muted-foreground">정보 없음</span>
                  )}
                </div>
                {result.collateralInfo && (
                  <p className="mt-1 text-xs text-muted-foreground">{result.collateralInfo}</p>
                )}
              </div>

              {/* 4대보험 */}
              <div className={`rounded-xl border-2 p-3 transition-colors ${
                result.has4Insurance === true
                  ? "border-green-500 bg-green-50 dark:bg-green-950/30"
                  : result.has4Insurance === false
                    ? "border-orange-300 bg-orange-50/50 dark:bg-orange-950/20"
                    : "border-muted bg-muted/30"
              }`}>
                <div className="flex items-center gap-2 mb-1">
                  <div className={`p-1.5 rounded-lg ${
                    result.has4Insurance === true
                      ? "bg-green-500 text-white"
                      : result.has4Insurance === false
                        ? "bg-orange-400 text-white"
                        : "bg-muted-foreground/20 text-muted-foreground"
                  }`}>
                    <ShieldIcon />
                  </div>
                  <span className="font-medium text-sm">4대보험</span>
                </div>
                <div className="flex items-center gap-1 text-sm">
                  {result.has4Insurance === true ? (
                    <>
                      <CheckIcon />
                      <span className="text-green-600 dark:text-green-400 font-medium">가입</span>
                    </>
                  ) : result.has4Insurance === false ? (
                    <>
                      <XIcon />
                      <span className="text-orange-500 dark:text-orange-400">미가입</span>
                    </>
                  ) : (
                    <span className="text-muted-foreground">정보 없음</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 추천 안내 */}
          {(result.hasVehicle || result.hasCollateral || result.has4Insurance === false) && (
            <div className="rounded-lg bg-primary/5 border border-primary/20 p-3">
              <p className="text-xs font-medium text-primary mb-1">추천 상품 유형</p>
              <div className="flex flex-wrap gap-1">
                {result.hasVehicle && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                    <CarIcon /> 자동차담보대출
                  </span>
                )}
                {result.hasCollateral && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                    <HomeIcon /> 부동산담보대출
                  </span>
                )}
                {result.has4Insurance === false && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/10 px-2 py-0.5 text-xs text-orange-600 dark:text-orange-400">
                    무직자/프리랜서 대출
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
