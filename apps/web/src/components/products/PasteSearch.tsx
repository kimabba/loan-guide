import { useState, useEffect } from "react";
import {
  parseConditionsFromText,
  findMatchingProducts,
  ParsedConditions,
  MatchResult,
  EMPLOYMENT_TYPE_LABELS,
  EmploymentType,
} from "../../lib/conditionParser";

interface PasteSearchProps {
  products: any[];
  onMatchResults: (results: MatchResult[] | null) => void;
}

export function PasteSearch({ products, onMatchResults }: PasteSearchProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState("");
  const [parsedConditions, setParsedConditions] =
    useState<ParsedConditions | null>(null);
  const [parseConfidence, setParseConfidence] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [matchCount, setMatchCount] = useState<number | null>(null);

  // 아코디언 닫을 때 결과 초기화
  useEffect(() => {
    if (!isOpen) {
      setMatchCount(null);
    }
  }, [isOpen]);

  const handleAnalyze = () => {
    if (!inputText.trim()) return;

    setIsAnalyzing(true);

    // 약간의 딜레이로 UI 피드백
    setTimeout(() => {
      const result = parseConditionsFromText(inputText);
      setParsedConditions(result.conditions);
      setParseConfidence(result.confidence);
      setIsAnalyzing(false);
    }, 300);
  };

  const handleSearch = () => {
    if (!parsedConditions) return;

    const results = findMatchingProducts(parsedConditions, products);
    setMatchCount(results.length);
    onMatchResults(results);

    // 결과가 있으면 아코디언 접기
    if (results.length > 0) {
      setIsOpen(false);
    }
  };

  const handleClear = () => {
    setInputText("");
    setParsedConditions(null);
    setParseConfidence(0);
    setMatchCount(null);
    onMatchResults(null);
  };

  const formatValue = (
    key: keyof ParsedConditions,
    value: any
  ): string => {
    switch (key) {
      case "age":
        return `${value}세`;
      case "gender":
        return value === "male" ? "남성" : "여성";
      case "annualIncome":
        return `${value.toLocaleString()}만원`;
      case "monthlyIncome":
        return `${value.toLocaleString()}만원`;
      case "employmentType":
        return EMPLOYMENT_TYPE_LABELS[value as EmploymentType] || value;
      case "employmentPeriod":
        const years = Math.floor(value / 12);
        const months = value % 12;
        return years > 0
          ? `${years}년 ${months > 0 ? `${months}개월` : ""}`
          : `${months}개월`;
      case "desiredAmount":
        return `${value.toLocaleString()}만원`;
      case "creditScore":
        return `${value}점`;
      case "creditGrade":
        return `${value}등급`;
      case "hasInsurance":
        return value ? "가입" : "미가입";
      case "existingLoans":
        return `${value.toLocaleString()}만원`;
      default:
        return String(value);
    }
  };

  const conditionLabels: Record<string, string> = {
    age: "나이",
    gender: "성별",
    annualIncome: "연소득",
    monthlyIncome: "월소득",
    employmentType: "고용형태",
    employmentPeriod: "재직기간",
    desiredAmount: "희망금액",
    creditScore: "신용점수",
    creditGrade: "신용등급",
    hasInsurance: "4대보험",
    existingLoans: "기존대출",
  };

  const parsedEntries = parsedConditions
    ? Object.entries(parsedConditions).filter(
        ([key, value]) => key !== "rawText" && value !== undefined
      )
    : [];

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      {/* 아코디언 헤더 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 text-primary">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
              <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
              <path d="m9 14 2 2 4-4" />
            </svg>
          </div>
          <div className="text-left">
            <span className="font-medium text-foreground">복붙 검색</span>
            <span className="ml-2 text-sm text-muted-foreground">
              고객 정보를 붙여넣어 적합 상품 찾기
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {matchCount !== null && (
            <span className="px-2 py-1 text-xs font-medium rounded-full bg-primary/10 text-primary">
              {matchCount}개 매칭
            </span>
          )}
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
            className={`text-muted-foreground transition-transform duration-200 ${
              isOpen ? "rotate-180" : ""
            }`}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </button>

      {/* 아코디언 내용 */}
      <div
        className={`transition-all duration-300 ease-in-out overflow-hidden ${
          isOpen ? "max-h-[600px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="px-4 pb-4 border-t">
          {/* 입력 영역 */}
          <div className="mt-4">
            <label className="block text-sm font-medium text-foreground mb-2">
              고객 정보 붙여넣기
            </label>
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={`CRM에서 복사한 고객 정보를 붙여넣기 하세요.

예시:
주민번호: 671210-1
연봉: 8000만원
입사일: 2022-01-15
4대가입`}
              className="w-full h-32 px-3 py-2 rounded-lg border bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* 분석 버튼 */}
          <div className="mt-3 flex gap-2">
            <button
              onClick={handleAnalyze}
              disabled={!inputText.trim() || isAnalyzing}
              className="flex-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isAnalyzing ? (
                <span className="flex items-center justify-center gap-2">
                  <svg
                    className="animate-spin h-4 w-4"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  분석 중...
                </span>
              ) : (
                "분석하기"
              )}
            </button>
            {(parsedConditions || inputText) && (
              <button
                onClick={handleClear}
                className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors"
              >
                초기화
              </button>
            )}
          </div>

          {/* 분석 결과 */}
          {parsedConditions && parsedEntries.length > 0 && (
            <div className="mt-4 p-3 rounded-lg bg-muted/50">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-foreground">
                  분석 결과
                </h4>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    parseConfidence >= 0.8
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      : parseConfidence >= 0.5
                      ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                      : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                  }`}
                >
                  신뢰도 {Math.round(parseConfidence * 100)}%
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {parsedEntries.map(([key, value]) => (
                  <div
                    key={key}
                    className="flex flex-col p-2 rounded bg-background"
                  >
                    <span className="text-xs text-muted-foreground">
                      {conditionLabels[key] || key}
                    </span>
                    <span className="text-sm font-medium text-foreground">
                      {formatValue(key as keyof ParsedConditions, value)}
                    </span>
                  </div>
                ))}
              </div>

              {/* 상품 찾기 버튼 */}
              <button
                onClick={handleSearch}
                className="w-full mt-3 px-4 py-2.5 rounded-lg bg-green-600 text-white font-medium text-sm hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
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
                적합 상품 찾기
              </button>
            </div>
          )}

          {/* 분석 결과 없음 */}
          {parsedConditions && parsedEntries.length === 0 && (
            <div className="mt-4 p-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 text-center">
              <p className="text-sm text-yellow-700 dark:text-yellow-400">
                인식된 조건이 없습니다. 다른 형식으로 입력해 보세요.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
