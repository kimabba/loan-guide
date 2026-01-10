import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

export function AuthCallbackPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // URL에서 코드 추출 및 세션 교환
        const { error } = await supabase.auth.getSession();

        if (error) {
          console.error("Auth callback error:", error);
          navigate("/login?error=auth_failed");
          return;
        }

        // 성공 시 챗봇 페이지로 이동
        navigate("/chat");
      } catch (err) {
        console.error("Callback error:", err);
        navigate("/login?error=unknown");
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="flex min-h-[calc(100vh-56px)] items-center justify-center">
      <div className="text-center space-y-4">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-muted-foreground">로그인 처리 중...</p>
      </div>
    </div>
  );
}
