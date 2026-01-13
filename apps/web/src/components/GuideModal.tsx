import { useEffect, useState } from "react";

interface GuideModalProps {
  itemCd: string | null;
  onClose: () => void;
}

interface GuideDetail {
  item_cd: string;
  pfi_name: string;
  depth1: string;
  depth2: string;
  fi_memo: string;
  updated_dt: string;
  depth3: Section[];
}

interface Section {
  depth3_name: string;
  depth4_key: Field[];
}

interface Field {
  depth4_name: string;
  detail: string;
}

// Icons
const CloseIcon = () => (
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
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </svg>
);

const BuildingIcon = () => (
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
    <rect width="16" height="20" x="4" y="2" rx="2" ry="2" />
    <path d="M9 22v-4h6v4" />
    <path d="M8 6h.01" />
    <path d="M16 6h.01" />
    <path d="M12 6h.01" />
    <path d="M12 10h.01" />
    <path d="M12 14h.01" />
    <path d="M16 10h.01" />
    <path d="M16 14h.01" />
    <path d="M8 10h.01" />
    <path d="M8 14h.01" />
  </svg>
);

const CalendarIcon = () => (
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
    <path d="M8 2v4" />
    <path d="M16 2v4" />
    <rect width="18" height="18" x="3" y="4" rx="2" />
    <path d="M3 10h18" />
  </svg>
);

const ChevronDownIcon = () => (
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
    <path d="m6 9 6 6 6-6" />
  </svg>
);

export function GuideModal({ itemCd, onClose }: GuideModalProps) {
  const [guide, setGuide] = useState<GuideDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<number>>(
    new Set()
  );

  useEffect(() => {
    if (!itemCd) return;

    setLoading(true);
    setError(null);
    setExpandedSections(new Set([0])); // First section expanded by default

    fetch(`/api/guides/${itemCd}`)
      .then((res) => {
        if (!res.ok) throw new Error("가이드를 찾을 수 없습니다");
        return res.json();
      })
      .then((data) => {
        setGuide(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [itemCd]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  const toggleSection = (idx: number) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) {
        next.delete(idx);
      } else {
        next.add(idx);
      }
      return next;
    });
  };

  if (!itemCd) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-xl bg-background border border-border/50 shadow-2xl shadow-primary/5 fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-border/50 px-6 py-5 bg-secondary/30">
          <div className="flex items-start gap-4">
            {/* Icon */}
            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center text-primary">
              <BuildingIcon />
            </div>

            {/* Title */}
            <div>
              {guide && (
                <>
                  <h2 className="text-xl font-semibold text-foreground">
                    {guide.pfi_name}
                  </h2>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                      {guide.depth1}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
                      {guide.depth2}
                    </span>
                  </div>
                </>
              )}
              {loading && (
                <div className="space-y-2">
                  <div className="h-6 w-48 animate-pulse rounded-lg bg-muted" />
                  <div className="h-4 w-32 animate-pulse rounded-lg bg-muted" />
                </div>
              )}
            </div>
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="linear-btn-ghost h-9 w-9 p-0 rounded-lg"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Content */}
        <div className="max-h-[calc(90vh-120px)] overflow-y-auto scrollbar-thin p-6">
          {loading && (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="h-4 w-1/4 animate-pulse rounded-lg bg-muted" />
                  <div className="h-24 w-full animate-pulse rounded-lg bg-muted" />
                </div>
              ))}
            </div>
          )}

          {error && (
            <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-4 text-destructive flex items-center gap-3">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {error}
            </div>
          )}

          {guide && (
            <div className="space-y-5">
              {/* Memo */}
              {guide.fi_memo && (
                <div className="rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/10 p-5">
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                    {guide.fi_memo}
                  </p>
                </div>
              )}

              {/* Sections (Accordion) */}
              <div className="space-y-3">
                {guide.depth3?.map((section, idx) => {
                  const isExpanded = expandedSections.has(idx);
                  return (
                    <div
                      key={idx}
                      className="linear-card overflow-hidden"
                    >
                      {/* Section Header */}
                      <button
                        onClick={() => toggleSection(idx)}
                        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-secondary/50 transition-colors"
                      >
                        <span className="font-medium text-foreground">
                          {section.depth3_name}
                        </span>
                        <span
                          className={`text-muted-foreground transition-transform duration-200 ${
                            isExpanded ? "rotate-180" : ""
                          }`}
                        >
                          <ChevronDownIcon />
                        </span>
                      </button>

                      {/* Section Content */}
                      {isExpanded && (
                        <div className="border-t border-border/50">
                          {section.depth4_key?.map((field, fieldIdx) => (
                            <div
                              key={fieldIdx}
                              className={`flex ${
                                fieldIdx !== section.depth4_key.length - 1
                                  ? "border-b border-border/30"
                                  : ""
                              }`}
                            >
                              <div className="w-1/4 min-w-[120px] px-4 py-3 bg-secondary/30 border-r border-border/30">
                                <span className="text-xs font-medium text-muted-foreground">
                                  {field.depth4_name}
                                </span>
                              </div>
                              <div className="flex-1 px-4 py-3">
                                <div className="whitespace-pre-wrap text-sm text-foreground/90 leading-relaxed">
                                  {field.detail}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Updated Date */}
              {guide.updated_dt && (
                <div className="flex items-center justify-end gap-1.5 text-xs text-muted-foreground">
                  <CalendarIcon />
                  최종 수정: {guide.updated_dt.slice(0, 10)}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
