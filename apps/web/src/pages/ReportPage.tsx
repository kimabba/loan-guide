import { useState } from "react";
import { Link } from "react-router-dom";

type ReportType = "bug" | "guide_fix" | "feature" | "other";

const reportTypes: { value: ReportType; label: string; description: string }[] = [
  { value: "bug", label: "버그 신고", description: "오류나 문제가 발생했어요" },
  { value: "guide_fix", label: "가이드 수정", description: "가이드 내용이 잘못되었어요" },
  { value: "feature", label: "기능 제안", description: "새로운 기능을 제안해요" },
  { value: "other", label: "기타", description: "그 외 문의사항" },
];

export function ReportPage() {
  const [type, setType] = useState<ReportType>("bug");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [email, setEmail] = useState("");
  const [guideId, setGuideId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          title,
          description,
          email: email || undefined,
          guideId: guideId || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "제출에 실패했습니다");
      }

      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "제출에 실패했습니다");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center px-4 py-20">
        <div className="w-full max-w-md text-center space-y-6">
          <div className="mx-auto h-16 w-16 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-green-600 dark:text-green-400"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold">제출 완료!</h1>
          <p className="text-muted-foreground">
            소중한 의견 감사합니다.<br />
            검토 후 빠르게 반영하겠습니다.
          </p>
          <div className="flex gap-3 justify-center pt-4">
            <Link
              to="/chat"
              className="rounded-lg bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
            >
              챗봇으로 돌아가기
            </Link>
            <button
              onClick={() => {
                setSubmitted(false);
                setTitle("");
                setDescription("");
                setGuideId("");
              }}
              className="rounded-lg border px-4 py-2 hover:bg-muted"
            >
              추가 제출
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center px-4 py-8">
      <div className="w-full max-w-2xl space-y-8">
        <div>
          <h1 className="text-2xl font-bold">버그 리포트 / 피드백</h1>
          <p className="mt-1 text-muted-foreground">
            문제가 있거나 개선할 점이 있다면 알려주세요
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Report Type */}
          <div className="space-y-3">
            <label className="text-sm font-medium">신고 유형</label>
            <div className="grid gap-3 sm:grid-cols-2">
              {reportTypes.map((rt) => (
                <button
                  key={rt.value}
                  type="button"
                  onClick={() => setType(rt.value)}
                  className={`rounded-lg border p-4 text-left transition-colors ${
                    type === rt.value
                      ? "border-primary bg-primary/5"
                      : "hover:border-muted-foreground/50"
                  }`}
                >
                  <div className="font-medium">{rt.label}</div>
                  <div className="text-sm text-muted-foreground">
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
                className="w-full rounded-lg border bg-background px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
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
              className="w-full rounded-lg border bg-background px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
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
              className="w-full rounded-lg border bg-background px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
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
              className="w-full rounded-lg border bg-background px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <p className="text-xs text-muted-foreground">
              이메일을 남기시면 처리 결과를 안내해드립니다
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting || !title || !description}
            className="w-full rounded-lg bg-primary py-3 font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {submitting ? "제출 중..." : "제출하기"}
          </button>
        </form>
      </div>
    </div>
  );
}
