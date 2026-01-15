import { useState } from "react";
import {
  APP_VERSION,
  APP_NAME,
  CHANGELOG,
  CHANGE_TYPE_LABELS,
} from "../version";

const WEBSITE_URL = "https://jyoungad.kr/";

export function Footer() {
  const [showChangelog, setShowChangelog] = useState(false);

  return (
    <>
      <footer className="border-t bg-card/50 backdrop-blur-sm mt-auto">
        <div className="mx-auto max-w-7xl px-5 py-6 sm:px-6">
          {/* 메인 푸터 콘텐츠 */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            {/* 좌측: 로고 + 버전 */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-primary"
                  >
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.3-4.3" />
                  </svg>
                </div>
                <span className="font-semibold text-foreground">{APP_NAME}</span>
              </div>
              <button
                onClick={() => setShowChangelog(true)}
                className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                v{APP_VERSION}
              </button>
            </div>

            {/* 우측: 링크들 */}
            <div className="flex items-center gap-4 text-sm">
              <a
                href={WEBSITE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"
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
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                </svg>
                제이영컨설팅
              </a>
              <span className="text-border">|</span>
              <button
                onClick={() => setShowChangelog(true)}
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                업데이트 내역
              </button>
            </div>
          </div>

          {/* 구분선 */}
          <div className="my-4 border-t border-border/50" />

          {/* 하단: 카피라이트 */}
          <div className="text-xs text-muted-foreground">
            <p>
              © 2026 {APP_NAME}. All rights reserved. Developed by{" "}
              <span className="font-medium text-foreground">ssfak</span>
            </p>
          </div>
        </div>
      </footer>

      {/* Changelog 모달 */}
      {showChangelog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setShowChangelog(false)}
        >
          <div
            className="max-h-[80vh] w-full max-w-lg overflow-hidden rounded-2xl bg-background border border-border shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 헤더 */}
            <div className="flex items-center justify-between border-b bg-card px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
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
                    className="text-primary"
                  >
                    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                    <line x1="10" y1="9" x2="8" y2="9" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">
                    업데이트 히스토리
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {APP_NAME}의 변경 사항
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowChangelog(false)}
                className="rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
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

            {/* 내용 */}
            <div className="max-h-[55vh] overflow-y-auto bg-background px-5 py-4">
              <div className="space-y-6">
                {CHANGELOG.map((entry, idx) => (
                  <div key={entry.version} className="relative">
                    {/* 타임라인 라인 */}
                    {idx < CHANGELOG.length - 1 && (
                      <div className="absolute left-[11px] top-8 bottom-0 w-0.5 bg-border" />
                    )}

                    {/* 버전 헤더 */}
                    <div className="mb-3 flex items-center gap-3">
                      <div
                        className={`relative z-10 flex h-6 w-6 items-center justify-center rounded-full ${
                          idx === 0
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {idx === 0 ? (
                          <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
                        ) : (
                          <span className="h-2 w-2 rounded-full bg-current opacity-50" />
                        )}
                      </div>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-sm font-semibold ${
                          idx === 0
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        v{entry.version}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {entry.date}
                      </span>
                      {idx === 0 && (
                        <span className="rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-600 dark:text-green-400">
                          Latest
                        </span>
                      )}
                    </div>

                    {/* 변경 목록 */}
                    <ul className="space-y-2 pl-9">
                      {entry.changes.map((change, changeIdx) => {
                        const typeInfo = CHANGE_TYPE_LABELS[change.type];
                        return (
                          <li
                            key={changeIdx}
                            className="flex items-start gap-2 text-sm"
                          >
                            <span
                              className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-xs font-medium ${typeInfo.color}`}
                            >
                              {typeInfo.label}
                            </span>
                            <span className="text-foreground/80">
                              {change.description}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            </div>

            {/* 푸터 */}
            <div className="border-t bg-card/50 px-5 py-4">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <p>© 2026 {APP_NAME}</p>
                <a
                  href={WEBSITE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-primary hover:underline"
                >
                  제이영컨설팅
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
