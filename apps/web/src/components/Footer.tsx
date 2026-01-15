const WEBSITE_URL = "https://jyoungad.kr/";

export function Footer() {
  return (
    <footer className="border-t bg-card/50 backdrop-blur-sm mt-auto">
      <div className="mx-auto max-w-7xl px-5 py-4 sm:px-6">
        {/* 카피라이트 */}
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
