import { useFavoritesStore } from "../../lib/favorites";
import { useCompareStore } from "../../lib/compare";

interface ProductCardProps {
  itemCd: string;
  company: string;
  category: string;
  productType: string;
  summary: string;
  onClick: () => void;
}

export function ProductCard({
  itemCd,
  company,
  category,
  productType,
  summary,
  onClick,
}: ProductCardProps) {
  const { isFavorite, toggleFavorite } = useFavoritesStore();
  const { isInCompare, addToCompare, removeFromCompare, maxCompare } =
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
      className="group linear-card p-6 cursor-pointer flex flex-col h-full"
    >
      <div className="flex justify-between items-start mb-6">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
            {category}
          </span>
          <h3 className="text-lg font-bold tracking-tight text-foreground transition-colors group-hover:text-primary">
            {company}
          </h3>
        </div>
        
        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={handleFavoriteClick}
            className={`p-1.5 rounded-md border transition-colors ${
              favorite ? "bg-yellow-500/10 border-yellow-500/50 text-yellow-500" : "bg-background border-border hover:border-foreground/20 text-muted-foreground"
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill={favorite ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
          </button>
          <button
            onClick={handleCompareClick}
            className={`p-1.5 rounded-md border transition-colors ${
              inCompare ? "bg-primary/10 border-primary/50 text-primary" : "bg-background border-border hover:border-foreground/20 text-muted-foreground"
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>
          </button>
        </div>
      </div>

      <div className="flex-1 space-y-3">
        <div className="inline-block px-2 py-0.5 rounded border border-border bg-secondary/30 text-[11px] font-medium text-muted-foreground">
          {productType}
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3 group-hover:text-foreground/80 transition-colors">
          {summary}
        </p>
      </div>

      <div className="mt-8 pt-4 border-t border-border/20 flex items-center justify-between">
        <span className="text-[11px] font-bold tracking-tighter uppercase text-muted-foreground/40 group-hover:text-primary transition-colors">
          View Details →
        </span>
        {inCompare && (
          <span className="text-[10px] font-bold text-primary px-2 py-0.5 rounded-full bg-primary/5 border border-primary/20">
            COMPARE
          </span>
        )}
      </div>
    </div>
  );
}