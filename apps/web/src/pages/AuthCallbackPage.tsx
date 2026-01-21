import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuthStore } from "../lib/auth";

export function AuthCallbackPage() {
  const navigate = useNavigate();
  const { initialize } = useAuthStore();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // URL 해시에서 토큰 확인 (Supabase가 자동으로 처리)
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get("access_token");
        const errorParam = hashParams.get("error");
        const errorDescription = hashParams.get("error_description");

        if (errorParam) {
          console.error("OAuth error:", errorParam, errorDescription);
          setError(errorDescription || errorParam);
          setTimeout(() => navigate("/login?error=auth_failed"), 2000);
          return;
        }

        // 세션 가져오기 (Supabase가 URL의 토큰을 자동으로 처리)
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error("Session error:", sessionError);
          setError(sessionError.message);
          setTimeout(() => navigate("/login?error=auth_failed"), 2000);
          return;
        }

        if (session) {
          console.log("Login successful:", session.user.email);
          // auth store 재초기화
          await initialize();
          // 성공 시 홈으로 이동
          navigate("/");
        } else if (accessToken) {
          // 토큰은 있지만 세션이 없는 경우 - 잠시 대기 후 재시도
          await new Promise(resolve => setTimeout(resolve, 500));
          const { data: { session: retrySession } } = await supabase.auth.getSession();
          if (retrySession) {
            console.log("Login successful (retry):", retrySession.user.email);
            await initialize();
            navigate("/");
          } else {
            setError("세션을 가져올 수 없습니다.");
            setTimeout(() => navigate("/login?error=session_failed"), 2000);
          }
        } else {
          // 토큰도 세션도 없는 경우
          navigate("/login");
        }
      } catch (err) {
        console.error("Callback error:", err);
        setError("로그인 처리 중 오류가 발생했습니다.");
        setTimeout(() => navigate("/login?error=unknown"), 2000);
      }
    };

    handleCallback();
  }, [navigate, initialize]);

  return (
    <div className="flex min-h-[calc(100vh-56px)] items-center justify-center">
      <div className="text-center space-y-4">
        {error ? (
          <>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-600 dark:text-red-400">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            </div>
            <p className="text-red-600 dark:text-red-400 font-medium">로그인 실패</p>
            <p className="text-sm text-muted-foreground">{error}</p>
          </>
        ) : (
          <>
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-muted-foreground">로그인 처리 중...</p>
          </>
        )}
      </div>
    </div>
  );
}
