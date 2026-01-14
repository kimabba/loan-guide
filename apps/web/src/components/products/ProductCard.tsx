import { useFavoritesStore } from "../../lib/favorites";
import { useCompareStore } from "../../lib/compare";

interface ProductCardProps {
  itemCd: string;
  company: string;
  category: string;
  productType: string;
  summary: string;
  matchScore?: number;
  onClick: () => void;
}

export function ProductCard({
  itemCd,
  company,
  category,
  productType,
  summary,
  matchScore,
  onClick,
}: ProductCardProps) {
  const { isFavorite, toggleFavorite } = useFavoritesStore();
  const { isInCompare, addToCompare, removeFromCompare, compareList, maxCompare } =
    useCompareStore();

  const favorite = isFavorite(itemCd);
  const inCompare = isInCompare(itemCd);

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFavorite(itemCd);
  };

  const handleCompareClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (inCompare) {
      removeFromCompare(itemCd);
    } else {
      const success = addToCompare(itemCd);
      if (!success) {
        alert(`최대 ${maxCompare}개까지 비교할 수 있습니다.`);
      }
    }
  };

  return (
    <div
      onClick={onClick}
      className="group relative cursor-pointer rounded-lg border bg-card p-4 transition-all hover:border-primary hover:shadow-md"
    >
      {/* 상단 버튼들 */}
      <div className="absolute right-2 top-2 flex gap-1">
        {/* 즐겨찾기 버튼 */}
        <button
          onClick={handleFavoriteClick}
          className={`rounded-full p-1.5 transition-colors ${
            favorite
              ? "bg-yellow-100 text-yellow-500 dark:bg-yellow-900/30"
              : "bg-muted text-muted-foreground hover:bg-yellow-100 hover:text-yellow-500"
          }`}
          title={favorite ? "즐겨찾기 해제" : "즐겨찾기 추가"}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill={favorite ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        </button>

        {/* 비교 버튼 */}
        <button
          onClick={handleCompareClick}
          className={`rounded-full p-1.5 transition-colors ${
            inCompare
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary"
          }`}
          title={inCompare ? "비교에서 제거" : "비교하기"}
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
          >
            <rect x="3" y="3" width="7" height="7" />
            <rect x="14" y="3" width="7" height="7" />
            <rect x="3" y="14" width="7" height="7" />
            <rect x="14" y="14" width="7" height="7" />
          </svg>
        </button>
      </div>

      {/* 카테고리 뱃지 & 매칭 점수 */}
      <div className="mb-2 flex items-center gap-2">
        <span className="inline-block rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
          {category}
        </span>
        {matchScore !== undefined && (
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
              matchScore >= 80
                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                : matchScore >= 60
                ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                : "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
            }`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="currentColor"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            {matchScore}%
          </span>
        )}
      </div>

      {/* 금융사명 */}
      <h3 className="mb-1 pr-16 text-lg font-semibold text-foreground group-hover:text-primary">
        {company}
      </h3>

      {/* 상품유형 */}
      <p className="mb-2 text-sm font-medium text-muted-foreground">{productType}</p>

      {/* 요약 */}
      <p className="line-clamp-2 text-sm text-muted-foreground">{summary}</p>

      {/* 하단 액션 */}
      <div className="mt-3 flex items-center justify-between border-t pt-3">
        <span className="text-xs text-muted-foreground">상세보기 →</span>
        {inCompare && (
          <span className="text-xs font-medium text-primary">
            비교 {compareList.indexOf(itemCd) + 1}/{maxCompare}
          </span>
        )}
      </div>
    </div>
  );
}
