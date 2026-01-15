import { useState } from "react";

interface FilterChipProps {
  label: string;
  active: boolean;
  count?: number;
  onClick: () => void;
}

function FilterChip({ label, active, count, onClick }: FilterChipProps) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
        active
          ? "bg-primary text-primary-foreground"
          : "bg-muted text-muted-foreground hover:bg-muted/80"
      }`}
    >
      {label}
      {count !== undefined && (
        <span
          className={`text-xs ${active ? "text-primary-foreground/80" : "text-muted-foreground/80"}`}
        >
          ({count})
        </span>
      )}
    </button>
  );
}

interface ExpandableFilterSectionProps {
  title: string;
  items: { value: string; count: number }[];
  selectedItems: string[];
  onItemChange: (item: string) => void;
  initialVisibleCount: number;
}

function ExpandableFilterSection({
  title,
  items,
  selectedItems,
  onItemChange,
  initialVisibleCount,
}: ExpandableFilterSectionProps) {
  const [expanded, setExpanded] = useState(false);
  const visibleItems = expanded ? items : items.slice(0, initialVisibleCount);
  const hasMore = items.length > initialVisibleCount;

  return (
    <div>
      <h4 className="mb-2 text-sm font-medium text-foreground">{title}</h4>
      <div className="flex flex-wrap gap-2">
        {visibleItems.map((item) => (
          <FilterChip
            key={item.value}
            label={item.value}
            count={item.count}
            active={selectedItems.includes(item.value)}
            onClick={() => onItemChange(item.value)}
          />
        ))}
        {hasMore && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-primary hover:text-primary/80 transition-colors"
          >
            {expanded ? (
              <>
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
                  <polyline points="18 15 12 9 6 15" />
                </svg>
                접기
              </>
            ) : (
              <>
                +{items.length - initialVisibleCount}개 더
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
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

interface ProductFilterProps {
  categories: { value: string; count: number }[];
  productTypes: { value: string; count: number }[];
  companies: { value: string; count: number }[];
  selectedCategories: string[];
  selectedProductTypes: string[];
  selectedCompanies: string[];
  onCategoryChange: (category: string) => void;
  onProductTypeChange: (productType: string) => void;
  onCompanyChange: (company: string) => void;
  onClearAll: () => void;
}

export function ProductFilter({
  categories,
  productTypes,
  companies,
  selectedCategories,
  selectedProductTypes,
  selectedCompanies,
  onCategoryChange,
  onProductTypeChange,
  onCompanyChange,
  onClearAll,
}: ProductFilterProps) {
  const hasFilters =
    selectedCategories.length > 0 ||
    selectedProductTypes.length > 0 ||
    selectedCompanies.length > 0;

  return (
    <div className="space-y-4">
      {/* 필터 초기화 버튼 */}
      {hasFilters && (
        <div className="flex justify-end">
          <button
            onClick={onClearAll}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            필터 초기화
          </button>
        </div>
      )}

      {/* 카테고리 필터 */}
      <ExpandableFilterSection
        title="카테고리"
        items={categories}
        selectedItems={selectedCategories}
        onItemChange={onCategoryChange}
        initialVisibleCount={10}
      />

      {/* 상품유형 필터 */}
      <ExpandableFilterSection
        title="상품 유형"
        items={productTypes}
        selectedItems={selectedProductTypes}
        onItemChange={onProductTypeChange}
        initialVisibleCount={10}
      />

      {/* 금융사 필터 */}
      <ExpandableFilterSection
        title="금융사"
        items={companies}
        selectedItems={selectedCompanies}
        onItemChange={onCompanyChange}
        initialVisibleCount={12}
      />
    </div>
  );
}
