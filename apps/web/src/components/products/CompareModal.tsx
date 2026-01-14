import { useEffect, useState } from "react";
import { useCompareStore } from "../../lib/compare";

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

interface CompareModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CompareModal({ isOpen, onClose }: CompareModalProps) {
  const { compareList, clearCompare } = useCompareStore();
  const [guides, setGuides] = useState<GuideDetail[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen || compareList.length === 0) return;

    setLoading(true);

    // API 시도 후 실패하면 로컬 JSON에서 로드
    const fetchGuides = async () => {
      try {
        // 먼저 API 시도
        const apiResults = await Promise.all(
          compareList.map((itemCd) =>
            fetch(`/api/guides/${itemCd}`).then((res) => {
              if (!res.ok) throw new Error("API failed");
              return res.json();
            })
          )
        );
        setGuides(apiResults);
      } catch {
        // API 실패 시 로컬 JSON에서 로드
        try {
          const res = await fetch("/loan_guides.json");
          const allGuides = await res.json();
          const filteredGuides = compareList
            .map((itemCd) => allGuides.find((g: GuideDetail) => g.item_cd === itemCd))
            .filter(Boolean);
          setGuides(filteredGuides);
        } catch {
          setGuides([]);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchGuides();
  }, [isOpen, compareList]);

  if (!isOpen) return null;

  // 모든 상품의 섹션과 필드를 합쳐서 비교 테이블 생성
  const allSections = new Map<string, Set<string>>();
  guides.forEach((guide) => {
    guide.depth3?.forEach((section) => {
      if (!allSections.has(section.depth3_name)) {
        allSections.set(section.depth3_name, new Set());
      }
      section.depth4_key?.forEach((field) => {
        allSections.get(section.depth3_name)?.add(field.depth4_name);
      });
    });
  });

  const getFieldValue = (guide: GuideDetail, sectionName: string, fieldName: string) => {
    const section = guide.depth3?.find((s) => s.depth3_name === sectionName);
    const field = section?.depth4_key?.find((f) => f.depth4_name === fieldName);
    return field?.detail || "-";
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-6xl overflow-hidden rounded-lg bg-background shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-xl font-bold">상품 비교</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                clearCompare();
                onClose();
              }}
              className="rounded-lg px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted"
            >
              비교 초기화
            </button>
            <button
              onClick={onClose}
              className="rounded-full p-2 hover:bg-muted"
            >
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
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="max-h-[calc(90vh-80px)] overflow-auto p-6">
          {loading ? (
            <div className="space-y-4">
              <div className="h-8 w-full animate-pulse rounded bg-muted" />
              <div className="h-8 w-full animate-pulse rounded bg-muted" />
              <div className="h-8 w-full animate-pulse rounded bg-muted" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] border-collapse text-sm">
                {/* 상품 헤더 */}
                <thead>
                  <tr className="border-b">
                    <th className="sticky left-0 z-10 w-32 bg-background px-4 py-3 text-left font-medium text-muted-foreground">
                      항목
                    </th>
                    {guides.map((guide) => (
                      <th
                        key={guide.item_cd}
                        className="min-w-[200px] px-4 py-3 text-left"
                      >
                        <div className="font-bold text-foreground">
                          {guide.pfi_name}
                        </div>
                        <div className="text-sm font-normal text-muted-foreground">
                          {guide.depth2}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {/* 기본 정보 */}
                  <tr className="border-b bg-muted/30">
                    <td className="sticky left-0 z-10 bg-muted/30 px-4 py-2 font-medium">
                      카테고리
                    </td>
                    {guides.map((guide) => (
                      <td key={guide.item_cd} className="px-4 py-2">
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                          {guide.depth1}
                        </span>
                      </td>
                    ))}
                  </tr>

                  <tr className="border-b">
                    <td className="sticky left-0 z-10 bg-background px-4 py-2 font-medium">
                      요약
                    </td>
                    {guides.map((guide) => (
                      <td
                        key={guide.item_cd}
                        className="px-4 py-2 text-muted-foreground"
                      >
                        <div className="line-clamp-3 whitespace-pre-wrap">
                          {guide.fi_memo || "-"}
                        </div>
                      </td>
                    ))}
                  </tr>

                  {/* 섹션별 비교 */}
                  {Array.from(allSections.entries()).map(
                    ([sectionName, fields]) => (
                      <>
                        <tr
                          key={`section-${sectionName}`}
                          className="border-b bg-primary/5"
                        >
                          <td
                            colSpan={guides.length + 1}
                            className="px-4 py-2 font-semibold text-primary"
                          >
                            {sectionName}
                          </td>
                        </tr>
                        {Array.from(fields).map((fieldName, idx) => (
                          <tr
                            key={`${sectionName}-${fieldName}`}
                            className={idx % 2 === 0 ? "bg-muted/30" : ""}
                          >
                            <td className="sticky left-0 z-10 bg-inherit px-4 py-2 font-medium">
                              {fieldName}
                            </td>
                            {guides.map((guide) => (
                              <td
                                key={guide.item_cd}
                                className="px-4 py-2"
                              >
                                <div className="whitespace-pre-wrap">
                                  {getFieldValue(guide, sectionName, fieldName)}
                                </div>
                              </td>
                            ))}
                          </tr>
                        ))}
                      </>
                    )
                  )}

                  {/* 수정일 */}
                  <tr className="border-t">
                    <td className="sticky left-0 z-10 bg-background px-4 py-2 font-medium text-muted-foreground">
                      최종 수정일
                    </td>
                    {guides.map((guide) => (
                      <td
                        key={guide.item_cd}
                        className="px-4 py-2 text-xs text-muted-foreground"
                      >
                        {guide.updated_dt?.slice(0, 10) || "-"}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
