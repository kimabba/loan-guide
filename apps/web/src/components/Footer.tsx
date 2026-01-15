import {
  APP_VERSION,
  APP_NAME,
} from "../version";

const WEBSITE_URL = "https://jyoungad.kr/";

export function Footer() {
  return (
    <footer className="border-t bg-card/50 backdrop-blur-sm mt-auto">
      <div className="mx-auto max-w-7xl px-5 py-6 sm:px-6">
        {/* 메인 푸터 콘텐츠 */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* 좌측: 앱이름 + 버전 */}
          <div className="flex items-center gap-3">
            <span className="font-semibold text-foreground">{APP_NAME}</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
              v{APP_VERSION}
            </span>
          </div>

          {/* 우측: 제이영컨설팅 (권한) */}
          <div className="flex items-center text-sm">
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
              제이영컨설팅 (권한)
            </a>
          </div>
        </div>

        {/* 구분선 */}
        <div className="my-4 border-t border-border/50" />

        {/* 하단: 카피라이트 */}
        <div className="text-xs text-muted-foreground">
          <p>
            © 2026{" "}
            <a
              href={WEBSITE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-foreground hover:text-primary transition-colors"
            >
              jyoung consulting
            </a>
            . All rights reserved. Developed by{" "}
            <button
              onClick={() => {
                navigator.clipboard.writeText("ssfak@naver.com");
                alert("이메일이 복사되었습니다!");
              }}
              className="font-medium text-foreground hover:text-primary transition-colors cursor-pointer"
              title="클릭하여 이메일 복사"
            >
              ssfak
            </button>
          </p>
        </div>
      </div>
    </footer>
  );
}
