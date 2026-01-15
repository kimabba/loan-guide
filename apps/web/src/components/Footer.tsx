import { useState } from "react";
import {
  APP_VERSION,
  APP_NAME,
  APP_AUTHOR,
  APP_GITHUB,
  CHANGELOG,
  CHANGE_TYPE_LABELS,
} from "../version";

export function Footer() {
  const [showChangelog, setShowChangelog] = useState(false);

  return (
    <>
      <footer className="border-t bg-card mt-auto">
        <div className="mx-auto max-w-7xl px-5 py-4 sm:px-6">
          <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground sm:flex-row sm:justify-between">
            {/* 좌측: 앱 정보 */}
            <div className="flex items-center gap-2">
              <span className="font-medium text-foreground">{APP_NAME}</span>
              <button
                onClick={() => setShowChangelog(true)}
                className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium hover:bg-muted/80 transition-colors"
              >
                v{APP_VERSION}
              </button>
            </div>

            {/* 우측: 제작자 정보 */}
            <div className="flex items-center gap-3">
              <span>Made by {APP_AUTHOR}</span>
              <a
                href={APP_GITHUB}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
                GitHub
              </a>
            </div>
          </div>
        </div>
      </footer>

      {/* Changelog 모달 */}
      {showChangelog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShowChangelog(false)}
        >
          <div
            className="max-h-[80vh] w-full max-w-lg overflow-hidden rounded-xl bg-card shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 헤더 */}
            <div className="flex items-center justify-between border-b px-5 py-4">
              <h2 className="text-lg font-semibold text-foreground">
                업데이트 히스토리
              </h2>
              <button
                onClick={() => setShowChangelog(false)}
                className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
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
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* 내용 */}
            <div className="max-h-[60vh] overflow-y-auto px-5 py-4">
              <div className="space-y-6">
                {CHANGELOG.map((entry, idx) => (
                  <div key={entry.version}>
                    {/* 버전 헤더 */}
                    <div className="mb-3 flex items-center gap-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-sm font-semibold ${
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
                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-300">
                          최신
                        </span>
                      )}
                    </div>

                    {/* 변경 목록 */}
                    <ul className="space-y-2 pl-1">
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
                            <span className="text-foreground">
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
            <div className="border-t px-5 py-3">
              <p className="text-center text-xs text-muted-foreground">
                문제가 있거나 건의사항이 있으시면{" "}
                <a
                  href={`${APP_GITHUB}/issues`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  GitHub Issues
                </a>
                에 남겨주세요
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
