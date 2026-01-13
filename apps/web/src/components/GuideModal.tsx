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

export function GuideModal({ itemCd, onClose }: GuideModalProps) {
  const [guide, setGuide] = useState<GuideDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!itemCd) return;

    setLoading(true);
    setError(null);

    fetch(`/api/guides/${itemCd}`)
      .then((res) => {
        if (!res.ok) throw new Error("API failed");
        return res.json();
      })
      .then((data) => {
        setGuide(data);
        setLoading(false);
      })
      .catch(() => {
        // API가 없으면 로컬 JSON 파일에서 찾기
        fetch("/loan_guides.json")
          .then((res) => res.json())
          .then((data: GuideDetail[]) => {
            const found = data.find((g) => g.item_cd === itemCd);
            if (found) {
              setGuide(found);
            } else {
              setError("가이드를 찾을 수 없습니다");
            }
            setLoading(false);
          })
          .catch(() => {
            setError("가이드를 찾을 수 없습니다");
            setLoading(false);
          });
      });
  }, [itemCd]);

  if (!itemCd) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-lg bg-background shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            {guide && (
              <>
                <h2 className="text-xl font-bold">{guide.pfi_name}</h2>
                <p className="text-sm text-muted-foreground">
                  {guide.depth1} · {guide.depth2}
                </p>
              </>
            )}
            {loading && <div className="h-6 w-48 animate-pulse rounded bg-muted" />}
          </div>
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

        {/* Content */}
        <div className="max-h-[calc(90vh-80px)] overflow-y-auto p-6">
          {loading && (
            <div className="space-y-4">
              <div className="h-4 w-full animate-pulse rounded bg-muted" />
              <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
              <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
            </div>
          )}

          {error && (
            <div className="rounded-lg bg-destructive/10 p-4 text-destructive">
              {error}
            </div>
          )}

          {guide && (
            <div className="space-y-6">
              {/* 메모 */}
              {guide.fi_memo && (
                <div className="rounded-lg bg-primary/5 p-4">
                  <p className="whitespace-pre-wrap text-sm">{guide.fi_memo}</p>
                </div>
              )}

              {/* 섹션들 */}
              {guide.depth3?.map((section, idx) => (
                <div key={idx} className="space-y-3">
                  <h3 className="font-semibold text-primary">
                    {section.depth3_name}
                  </h3>
                  <div className="overflow-hidden rounded-lg border">
                    <table className="w-full text-sm">
                      <tbody>
                        {section.depth4_key?.map((field, fieldIdx) => (
                          <tr
                            key={fieldIdx}
                            className={fieldIdx % 2 === 0 ? "bg-muted/30" : ""}
                          >
                            <td className="w-1/4 border-r px-3 py-2 font-medium">
                              {field.depth4_name}
                            </td>
                            <td className="px-3 py-2">
                              <div className="whitespace-pre-wrap">
                                {field.detail}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}

              {/* 수정일 */}
              {guide.updated_dt && (
                <div className="text-right text-xs text-muted-foreground">
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
