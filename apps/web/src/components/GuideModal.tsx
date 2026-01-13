import { useEffect, useState, useCallback } from "react";

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

const MAX_OPEN_SECTIONS = 2;

export function GuideModal({ itemCd, onClose }: GuideModalProps) {
  const [guide, setGuide] = useState<GuideDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openSections, setOpenSections] = useState<number[]>([0]); // 첫 번째 섹션만 기본 열림

  useEffect(() => {
    if (!itemCd) return;

    setLoading(true);
    setError(null);
    setOpenSections([0]); // 새 가이드 로드 시 초기화

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

  // 아코디언 토글 - 최대 2개만 열림
  const toggleSection = useCallback((idx: number) => {
    setOpenSections((prev) => {
      if (prev.includes(idx)) {
        // 이미 열려있으면 닫기
        return prev.filter((i) => i !== idx);
      } else {
        // 새로 열기 - 최대 개수 초과 시 가장 오래된 것 닫기
        const newOpen = [...prev, idx];
        if (newOpen.length > MAX_OPEN_SECTIONS) {
          return newOpen.slice(-MAX_OPEN_SECTIONS);
        }
        return newOpen;
      }
    });
  }, []);

  // 복사 방지 핸들러들
  const preventCopy = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    alert("복사가 제한되어 있습니다.");
  }, []);

  const preventContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
  }, []);

  const preventDragStart = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const preventKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Ctrl+C, Ctrl+A, Ctrl+P 방지
    if (e.ctrlKey || e.metaKey) {
      if (["c", "a", "p", "s"].includes(e.key.toLowerCase())) {
        e.preventDefault();
      }
    }
    // PrintScreen 방지 (제한적)
    if (e.key === "PrintScreen") {
      e.preventDefault();
    }
  }, []);

  if (!itemCd) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-lg bg-background shadow-xl"
        onClick={(e) => e.stopPropagation()}
        onCopy={preventCopy}
        onContextMenu={preventContextMenu}
        onDragStart={preventDragStart}
        onKeyDown={preventKeyDown}
        tabIndex={0}
        style={{ userSelect: "none", WebkitUserSelect: "none" }}
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
            {loading && (
              <div className="h-6 w-48 animate-pulse rounded bg-muted" />
            )}
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
            <div className="space-y-3">
              {/* 메모 */}
              {guide.fi_memo && (
                <div className="rounded-lg bg-primary/5 p-4">
                  <p className="whitespace-pre-wrap text-sm">{guide.fi_memo}</p>
                </div>
              )}

              {/* 안내 메시지 */}
              <p className="text-xs text-muted-foreground">
                * 최대 {MAX_OPEN_SECTIONS}개 섹션만 동시에 열 수 있습니다
              </p>

              {/* 아코디언 섹션들 */}
              {guide.depth3?.map((section, idx) => {
                const isOpen = openSections.includes(idx);
                return (
                  <div
                    key={idx}
                    className="overflow-hidden rounded-lg border"
                  >
                    {/* 아코디언 헤더 */}
                    <button
                      onClick={() => toggleSection(idx)}
                      className="flex w-full items-center justify-between bg-muted/30 px-4 py-3 text-left transition-colors hover:bg-muted/50"
                    >
                      <span className="font-semibold text-primary">
                        {section.depth3_name}
                      </span>
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
                        className={`transition-transform duration-200 ${
                          isOpen ? "rotate-180" : ""
                        }`}
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </button>

                    {/* 아코디언 내용 */}
                    <div
                      className={`overflow-hidden transition-all duration-300 ${
                        isOpen ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
                      }`}
                    >
                      <table className="w-full text-sm">
                        <tbody>
                          {section.depth4_key?.map((field, fieldIdx) => (
                            <tr
                              key={fieldIdx}
                              className={fieldIdx % 2 === 0 ? "bg-muted/20" : ""}
                            >
                              <td className="w-1/4 border-r border-t px-3 py-2 font-medium">
                                {field.depth4_name}
                              </td>
                              <td className="border-t px-3 py-2">
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
                );
              })}

              {/* 수정일 */}
              {guide.updated_dt && (
                <div className="pt-2 text-right text-xs text-muted-foreground">
                  최종 수정: {guide.updated_dt.slice(0, 10)}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 복사 방지 안내 */}
        <div className="border-t px-6 py-2 text-center text-xs text-muted-foreground">
          본 자료는 저작권 보호를 받습니다. 무단 복제 및 배포를 금합니다.
        </div>
      </div>

      {/* 프린트 방지 CSS */}
      <style>{`
        @media print {
          body * {
            display: none !important;
          }
          body::after {
            content: "프린트가 제한되어 있습니다.";
            display: block;
            font-size: 24px;
            text-align: center;
            padding: 50px;
          }
        }
      `}</style>
    </div>
  );
}
