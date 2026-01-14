import { useState, useEffect } from "react";
import { useCompareStore } from "../../lib/compare";

interface FloatingCompareButtonProps {
  onCompare: () => void;
}

export function FloatingCompareButton({ onCompare }: FloatingCompareButtonProps) {
  const { compareList, maxCompare } = useCompareStore();
  const [showTooltip, setShowTooltip] = useState(false);
  const [hasSeenTooltip, setHasSeenTooltip] = useState(false);

  // 첫 방문 시 툴팁 표시
  useEffect(() => {
    const seen = localStorage.getItem("compare-tooltip-seen");
    if (!seen) {
      const timer = setTimeout(() => {
        setShowTooltip(true);
      }, 2000);
      return () => clearTimeout(timer);
    } else {
      setHasSeenTooltip(true);
    }
  }, []);

  // 툴팁 닫기
  const dismissTooltip = () => {
    setShowTooltip(false);
    setHasSeenTooltip(true);
    localStorage.setItem("compare-tooltip-seen", "true");
  };

  // 비교 목록에 상품이 있으면 CompareBar가 보이므로 숨김
  if (compareList.length > 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* 온보딩 툴팁 */}
      {showTooltip && !hasSeenTooltip && (
        <div className="absolute bottom-full right-0 mb-3 w-64 animate-fade-in">
          <div className="relative rounded-lg bg-primary p-4 text-primary-foreground shadow-lg">
            <button
              onClick={dismissTooltip}
              className="absolute right-2 top-2 rounded-full p-1 hover:bg-primary-foreground/20"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-foreground/20">
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
                >
                  <rect x="3" y="3" width="7" height="7" />
                  <rect x="14" y="3" width="7" height="7" />
                  <rect x="14" y="14" width="7" height="7" />
                  <rect x="3" y="14" width="7" height="7" />
                </svg>
              </div>
              <div>
                <p className="font-semibold">상품 비교 기능</p>
                <p className="mt-1 text-sm opacity-90">
                  상품 카드의 <span className="font-bold">⊞</span> 버튼을 눌러 최대 {maxCompare}개까지 비교해보세요!
                </p>
              </div>
            </div>
            {/* 말풍선 화살표 */}
            <div className="absolute -bottom-2 right-8 h-4 w-4 rotate-45 bg-primary" />
          </div>
        </div>
      )}

      {/* 플로팅 버튼 */}
      <button
        onClick={onCompare}
        className={`group relative flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-all hover:scale-110 hover:shadow-xl ${
          !hasSeenTooltip ? "animate-pulse-slow" : ""
        }`}
      >
        {/* 비교 아이콘 */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="3" width="7" height="7" />
          <rect x="14" y="3" width="7" height="7" />
          <rect x="14" y="14" width="7" height="7" />
          <rect x="3" y="14" width="7" height="7" />
        </svg>

        {/* 뱃지 - 항상 0/3 표시 */}
        <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-orange-500 text-xs font-bold text-white">
          {compareList.length}/{maxCompare}
        </span>

        {/* 호버 시 텍스트 표시 */}
        <span className="absolute right-full mr-3 whitespace-nowrap rounded-lg bg-foreground px-3 py-2 text-sm font-medium text-background opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
          상품 비교하기
        </span>
      </button>
    </div>
  );
}
