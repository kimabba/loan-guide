import { useState } from "react";
import {
  APP_VERSION,
  APP_NAME,
  CHANGELOG,
  CHANGE_TYPE_LABELS,
} from "../version";

const WEBSITE_URL = "https://jyoungad.kr/";
const CURRENT_YEAR = new Date().getFullYear();

export function Footer() {
  const [showChangelog, setShowChangelog] = useState(false);

  return (
    <>
      <footer className="border-t bg-card mt-auto">
        <div className="mx-auto max-w-7xl px-5 py-4 sm:px-6">
          <div className="flex flex-col items-center gap-3 text-sm text-muted-foreground sm:flex-row sm:justify-between">
            {/* 좌측: 앱 정보 + 버전 */}
            <div className="flex items-center gap-2">
              <a
                href={WEBSITE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-foreground hover:text-primary transition-colors"
              >
                {APP_NAME}
              </a>
              <button
                onClick={() => setShowChangelog(true)}
                className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium hover:bg-muted/80 transition-colors"
              >
                v{APP_VERSION}
              </button>
            </div>

            {/* 우측: 카피라이트 */}
            <div className="text-center sm:text-right">
              <p>
                © {CURRENT_YEAR} {APP_NAME}. All rights reserved.
              </p>
              <p className="text-xs mt-0.5">
                <a
                  href={WEBSITE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground transition-colors"
                >
                  jyoungad.kr
                </a>
              </p>
            </div>
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
            className="max-h-[80vh] w-full max-w-lg overflow-hidden rounded-xl bg-background border border-border shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 헤더 */}
            <div className="flex items-center justify-between border-b bg-card px-5 py-4">
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
            <div className="max-h-[60vh] overflow-y-auto bg-background px-5 py-4">
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
            <div className="border-t bg-card px-5 py-3">
              <p className="text-center text-xs text-muted-foreground">
                © {CURRENT_YEAR} {APP_NAME} |{" "}
                <a
                  href={WEBSITE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  jyoungad.kr
                </a>
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
