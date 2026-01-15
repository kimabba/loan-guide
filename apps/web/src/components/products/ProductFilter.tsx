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

interface AccordionFilterSectionProps {
  title: string;
  items: { value: string; count: number }[];
  selectedItems: string[];
  onItemChange: (item: string) => void;
  defaultOpen?: boolean;
}

function AccordionFilterSection({
  title,
  items,
  selectedItems,
  onItemChange,
  defaultOpen = false,
}: AccordionFilterSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const selectedCount = selectedItems.filter(s => items.some(i => i.value === s)).length;

  return (
    <div className="border-b border-border/50">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between py-3 px-2 -mx-2 rounded-lg text-left transition-colors hover:bg-muted/50 cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">{title}</span>
          {selectedCount > 0 && (
            <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
              {selectedCount}
            </span>
          )}
        </div>
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
          className={`text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {isOpen && (
        <div className="pb-3">
          <div className="flex flex-wrap gap-2">
            {items.map((item) => (
              <FilterChip
                key={item.value}
                label={item.value}
                count={item.count}
                active={selectedItems.includes(item.value)}
                onClick={() => onItemChange(item.value)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface ProductFilterProps {
  categories: { value: string; count: number }[];
  productTypes: { value: string; count: number }[];
  companies: { value: string; count: number }[];
  employmentTypes?: { value: string; count: number }[];
  selectedCategories: string[];
  selectedProductTypes: string[];
  selectedCompanies: string[];
  selectedEmploymentTypes?: string[];
  onCategoryChange: (category: string) => void;
  onProductTypeChange: (productType: string) => void;
  onCompanyChange: (company: string) => void;
  onEmploymentTypeChange?: (employmentType: string) => void;
  onClearAll: () => void;
}

export function ProductFilter({
  categories,
  productTypes,
  companies,
  employmentTypes = [],
  selectedCategories,
  selectedProductTypes,
  selectedCompanies,
  selectedEmploymentTypes = [],
  onCategoryChange,
  onProductTypeChange,
  onCompanyChange,
  onEmploymentTypeChange,
  onClearAll,
}: ProductFilterProps) {
  const hasFilters =
    selectedCategories.length > 0 ||
    selectedProductTypes.length > 0 ||
    selectedCompanies.length > 0 ||
    selectedEmploymentTypes.length > 0;

  return (
    <div className="rounded-xl border bg-card">
      {/* 헤더 */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <span className="text-sm font-semibold text-foreground">필터</span>
        {hasFilters && (
          <button
            onClick={onClearAll}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            초기화
          </button>
        )}
      </div>

      <div className="px-4">
        {/* 카테고리 필터 */}
        <AccordionFilterSection
          title="카테고리"
          items={categories}
          selectedItems={selectedCategories}
          onItemChange={onCategoryChange}
          defaultOpen={true}
        />

        {/* 직군 필터 */}
        {employmentTypes.length > 0 && onEmploymentTypeChange && (
          <AccordionFilterSection
            title="직군"
            items={employmentTypes}
            selectedItems={selectedEmploymentTypes}
            onItemChange={onEmploymentTypeChange}
            defaultOpen={false}
          />
        )}

        {/* 상품유형 필터 */}
        <AccordionFilterSection
          title="상품 유형"
          items={productTypes}
          selectedItems={selectedProductTypes}
          onItemChange={onProductTypeChange}
          defaultOpen={false}
        />

        {/* 금융사 필터 */}
        <AccordionFilterSection
          title="금융사"
          items={companies}
          selectedItems={selectedCompanies}
          onItemChange={onCompanyChange}
          defaultOpen={false}
        />
      </div>
    </div>
  );
}
