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
      <div>
        <h4 className="mb-2 text-sm font-medium text-foreground">카테고리</h4>
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <FilterChip
              key={cat.value}
              label={cat.value}
              count={cat.count}
              active={selectedCategories.includes(cat.value)}
              onClick={() => onCategoryChange(cat.value)}
            />
          ))}
        </div>
      </div>

      {/* 상품유형 필터 */}
      <div>
        <h4 className="mb-2 text-sm font-medium text-foreground">상품 유형</h4>
        <div className="flex flex-wrap gap-2">
          {productTypes.slice(0, 10).map((type) => (
            <FilterChip
              key={type.value}
              label={type.value}
              count={type.count}
              active={selectedProductTypes.includes(type.value)}
              onClick={() => onProductTypeChange(type.value)}
            />
          ))}
          {productTypes.length > 10 && (
            <span className="inline-flex items-center px-2 text-sm text-muted-foreground">
              +{productTypes.length - 10}개 더
            </span>
          )}
        </div>
      </div>

      {/* 금융사 필터 */}
      <div>
        <h4 className="mb-2 text-sm font-medium text-foreground">금융사</h4>
        <div className="flex flex-wrap gap-2">
          {companies.slice(0, 12).map((company) => (
            <FilterChip
              key={company.value}
              label={company.value}
              count={company.count}
              active={selectedCompanies.includes(company.value)}
              onClick={() => onCompanyChange(company.value)}
            />
          ))}
          {companies.length > 12 && (
            <span className="inline-flex items-center px-2 text-sm text-muted-foreground">
              +{companies.length - 12}개 더
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
