import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { signInWithKakao, signInWithGoogle } from "../lib/supabase";
import { useAuthStore } from "../lib/auth";

export function LoginPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuthStore();

  useEffect(() => {
    if (user && !loading) {
      navigate("/chat");
    }
  }, [user, loading, navigate]);

  const handleKakaoLogin = async () => {
    const { error } = await signInWithKakao();
    if (error) {
      console.error("Kakao login error:", error);
    }
  };

  const handleGoogleLogin = async () => {
    const { error } = await signInWithGoogle();
    if (error) {
      console.error("Google login error:", error);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-56px)] items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8">
        {/* Logo */}
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground text-2xl font-bold">
            G
          </div>
          <h1 className="mt-4 text-2xl font-bold">대출 가이드</h1>
          <p className="mt-2 text-muted-foreground">
            로그인하여 서비스를 이용하세요
          </p>
        </div>

        {/* Login Buttons */}
        <div className="space-y-3">
          <button
            onClick={handleKakaoLogin}
            className="flex w-full items-center justify-center gap-3 rounded-lg bg-[#FEE500] px-4 py-3 font-medium text-[#191919] hover:bg-[#FDD800] transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 3C6.477 3 2 6.463 2 10.714c0 2.695 1.764 5.058 4.418 6.394l-.89 3.304a.5.5 0 0 0 .77.534l3.962-2.614a13.04 13.04 0 0 0 1.74.116c5.523 0 10-3.463 10-7.734S17.523 3 12 3z" />
            </svg>
            카카오로 시작하기
          </button>

          <button
            onClick={handleGoogleLogin}
            className="flex w-full items-center justify-center gap-3 rounded-lg border bg-background px-4 py-3 font-medium hover:bg-muted transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Google로 시작하기
          </button>
        </div>

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              또는
            </span>
          </div>
        </div>

        {/* Guest Access */}
        <button
          onClick={() => navigate("/chat")}
          className="w-full rounded-lg border px-4 py-3 text-muted-foreground hover:bg-muted transition-colors"
        >
          비회원으로 둘러보기
        </button>

        {/* Terms */}
        <p className="text-center text-xs text-muted-foreground">
          로그인 시{" "}
          <a href="#" className="underline">
            이용약관
          </a>{" "}
          및{" "}
          <a href="#" className="underline">
            개인정보처리방침
          </a>
          에 동의합니다.
        </p>
      </div>
    </div>
  );
}
