import { useCompareStore } from "../../lib/compare";

interface CompareBarProps {
  onCompare: () => void;
  products: { itemCd: string; company: string; productType: string }[];
}

export function CompareBar({ onCompare, products }: CompareBarProps) {
  const { compareList, removeFromCompare, clearCompare, maxCompare } = useCompareStore();

  if (compareList.length === 0) return null;

  const compareProducts = compareList
    .map((itemCd) => products.find((p) => p.itemCd === itemCd))
    .filter(Boolean);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background shadow-lg">
      <div className="mx-auto max-w-7xl px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* 선택된 상품들 */}
          <div className="flex flex-1 items-center gap-3 overflow-x-auto">
            <span className="shrink-0 text-sm font-medium text-muted-foreground">
              비교 목록 ({compareList.length}/{maxCompare})
            </span>
            {compareProducts.map((product) =>
              product ? (
                <div
                  key={product.itemCd}
                  className="flex shrink-0 items-center gap-2 rounded-lg bg-muted px-3 py-1.5"
                >
                  <span className="text-sm font-medium">{product.company}</span>
                  <span className="text-xs text-muted-foreground">
                    {product.productType}
                  </span>
                  <button
                    onClick={() => removeFromCompare(product.itemCd)}
                    className="ml-1 rounded-full p-0.5 hover:bg-background"
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
                </div>
              ) : null
            )}
          </div>

          {/* 액션 버튼들 */}
          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={clearCompare}
              className="rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted"
            >
              초기화
            </button>
            <button
              onClick={onCompare}
              disabled={compareList.length < 2}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              비교하기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
