import { useState } from "react";
import { Link } from "react-router-dom";

type ReportType = "bug" | "guide_fix" | "feature" | "other";

const reportTypes: { value: ReportType; label: string; description: string }[] = [
  { value: "bug", label: "버그 신고", description: "오류나 문제가 발생했어요" },
  { value: "guide_fix", label: "가이드 수정", description: "가이드 내용이 잘못되었어요" },
  { value: "feature", label: "기능 제안", description: "새로운 기능을 제안해요" },
  { value: "other", label: "기타", description: "그 외 문의사항" },
];

interface Screenshot {
  file: File;
  preview: string;
}

export function ReportPage() {
  const [type, setType] = useState<ReportType>("bug");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [email, setEmail] = useState("");
  const [guideId, setGuideId] = useState("");
  const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleScreenshotSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newScreenshots: Screenshot[] = [];
    const maxFiles = 3 - screenshots.length;

    for (let i = 0; i < Math.min(files.length, maxFiles); i++) {
      const file = files[i];
      if (file.type.startsWith("image/")) {
        newScreenshots.push({
          file,
          preview: URL.createObjectURL(file),
        });
      }
    }

    setScreenshots((prev) => [...prev, ...newScreenshots]);
    e.target.value = "";
  };

  const removeScreenshot = (index: number) => {
    setScreenshots((prev) => {
      const newScreenshots = [...prev];
      URL.revokeObjectURL(newScreenshots[index].preview);
      newScreenshots.splice(index, 1);
      return newScreenshots;
    });
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const screenshotData = await Promise.all(
        screenshots.map(async (s) => ({
          name: s.file.name,
          data: await fileToBase64(s.file),
        }))
      );

      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          title,
          description,
          email: email || undefined,
          guideId: guideId || undefined,
          screenshots: screenshotData.length > 0 ? screenshotData : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "제출에 실패했습니다");
      }

      screenshots.forEach((s) => URL.revokeObjectURL(s.preview));
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "제출에 실패했습니다");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center px-5 py-16 sm:px-6 sm:py-20">
        <div className="w-full max-w-md text-center space-y-5 sm:space-y-6">
          <div className="mx-auto h-14 w-14 sm:h-16 sm:w-16 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-green-600 dark:text-green-400 sm:w-8 sm:h-8"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold">제출 완료!</h1>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            소중한 의견 감사합니다.<br />
            검토 후 빠르게 반영하겠습니다.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2 sm:pt-4">
            <Link
              to="/chat"
              className="rounded-xl bg-primary px-5 py-2.5 sm:px-4 sm:py-2 text-primary-foreground hover:bg-primary/90"
            >
              챗봇으로 돌아가기
            </Link>
            <button
              onClick={() => {
                setSubmitted(false);
                setTitle("");
                setDescription("");
                setGuideId("");
                setScreenshots([]);
              }}
              className="rounded-xl border px-5 py-2.5 sm:px-4 sm:py-2 hover:bg-muted"
            >
              추가 제출
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center px-5 py-6 sm:px-6 sm:py-8">
      <div className="w-full max-w-2xl space-y-6 sm:space-y-8">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">버그 리포트 / 피드백</h1>
          <p className="mt-1.5 sm:mt-1 text-sm sm:text-base text-muted-foreground leading-relaxed">
            문제가 있거나 개선할 점이 있다면 알려주세요
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
          {/* Report Type */}
          <div className="space-y-3">
            <label className="text-sm font-medium">신고 유형</label>
            <div className="grid gap-2.5 sm:gap-3 grid-cols-2">
              {reportTypes.map((rt) => (
                <button
                  key={rt.value}
                  type="button"
                  onClick={() => setType(rt.value)}
                  className={`rounded-xl border p-3 sm:p-4 text-left transition-colors ${
                    type === rt.value
                      ? "border-primary bg-primary/5"
                      : "hover:border-muted-foreground/50"
                  }`}
                >
                  <div className="font-medium text-sm sm:text-base">{rt.label}</div>
                  <div className="text-xs sm:text-sm text-muted-foreground mt-0.5 leading-relaxed">
                    {rt.description}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Guide ID (optional, for guide_fix) */}
          {type === "guide_fix" && (
            <div className="space-y-2">
              <label htmlFor="guideId" className="text-sm font-medium">
                가이드 번호 (선택)
              </label>
              <input
                id="guideId"
                type="text"
                value={guideId}
                onChange={(e) => setGuideId(e.target.value)}
                placeholder="예: 7 (OK저축은행 신용대출)"
                className="w-full rounded-xl border bg-background px-4 py-2.5 sm:py-2 text-base focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          )}

          {/* Title */}
          <div className="space-y-2">
            <label htmlFor="title" className="text-sm font-medium">
              제목 <span className="text-destructive">*</span>
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="간단히 요약해주세요"
              required
              className="w-full rounded-xl border bg-background px-4 py-2.5 sm:py-2 text-base focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label htmlFor="description" className="text-sm font-medium">
              상세 내용 <span className="text-destructive">*</span>
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="문제 상황이나 제안 내용을 자세히 설명해주세요"
              required
              rows={5}
              className="w-full rounded-xl border bg-background px-4 py-2.5 sm:py-2 text-base focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
          </div>

          {/* Screenshots */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              스크린샷 (선택, 최대 3장)
            </label>
            <div className="space-y-3">
              {screenshots.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {screenshots.map((screenshot, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={screenshot.preview}
                        alt={`스크린샷 ${index + 1}`}
                        className="w-full h-24 sm:h-28 object-cover rounded-lg border"
                      />
                      <button
                        type="button"
                        onClick={() => removeScreenshot(index)}
                        className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity sm:opacity-100"
                        aria-label="삭제"
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
                  ))}
                </div>
              )}
              {screenshots.length < 3 && (
                <label className="flex flex-col items-center justify-center w-full h-24 sm:h-28 border-2 border-dashed rounded-xl cursor-pointer hover:border-primary/50 transition-colors">
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
                    className="text-muted-foreground"
                  >
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                  <span className="mt-2 text-sm text-muted-foreground">
                    이미지 추가
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleScreenshotSelect}
                    className="hidden"
                  />
                </label>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              문제 상황을 보여주는 스크린샷을 첨부하면 더 빠른 해결이 가능합니다
            </p>
          </div>

          {/* Email (optional) */}
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              이메일 (선택)
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="답변 받으실 이메일"
              className="w-full rounded-xl border bg-background px-4 py-2.5 sm:py-2 text-base focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <p className="text-xs text-muted-foreground leading-relaxed">
              이메일을 남기시면 처리 결과를 안내해드립니다
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting || !title || !description}
            className="w-full rounded-xl bg-primary py-3.5 sm:py-3 font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {submitting ? "제출 중..." : "제출하기"}
          </button>
        </form>
      </div>
    </div>
  );
}
