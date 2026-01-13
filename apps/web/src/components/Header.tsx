import { Link, useLocation, useNavigate } from "react-router-dom";
import { useThemeStore, applyTheme } from "../lib/theme";
import { useAuthStore } from "../lib/auth";
import { useEffect } from "react";

// Icons
const SunIcon = () => (
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
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
  </svg>
);

const MoonIcon = () => (
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
    <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
  </svg>
);

const MonitorIcon = () => (
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
    <rect x="2" y="3" width="20" height="14" rx="2" />
    <line x1="8" x2="16" y1="21" y2="21" />
    <line x1="12" x2="12" y1="17" y2="21" />
  </svg>
);

const SparklesIcon = () => (
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
    <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
  </svg>
);

export function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, setTheme } = useThemeStore();
  const { user, signOut } = useAuthStore();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      if (theme === "system") applyTheme("system");
    };
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, [theme]);

  const toggleTheme = () => {
    const next =
      theme === "light" ? "dark" : theme === "dark" ? "system" : "light";
    setTheme(next);
  };

  const themeIcon = {
    light: <SunIcon />,
    dark: <MoonIcon />,
    system: <MonitorIcon />,
  };

  const navItems = [
    { path: "/", label: "홈" },
    { path: "/chat", label: "챗봇" },
    { path: "/products", label: "상품목록" },
    { path: "/match", label: "상품매칭" },
    { path: "/report", label: "버그신고" },
    { path: "/announcements", label: "공지" },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="flex h-14 items-center justify-between px-4">
        {/* Logo & Navigation */}
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-lg shadow-primary/20 transition-transform group-hover:scale-105">
              <SparklesIcon />
            </div>
            <span className="font-semibold hidden sm:inline gradient-text">
              대출 가이드
            </span>
          </Link>

          <nav className="flex items-center gap-0.5">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`relative rounded-md px-3 py-1.5 text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {isActive && (
                    <span className="absolute inset-0 rounded-md bg-secondary/80" />
                  )}
                  <span className="relative">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="linear-btn-ghost h-9 w-9 p-0"
            title={`테마: ${theme === "light" ? "라이트" : theme === "dark" ? "다크" : "시스템"}`}
          >
            {themeIcon[theme]}
          </button>

          {/* User Menu */}
          {user ? (
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-2">
                <div className="h-7 w-7 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center text-primary text-xs font-semibold ring-1 ring-primary/20">
                  {user.email?.charAt(0).toUpperCase() || "U"}
                </div>
                <span className="text-sm text-muted-foreground max-w-[100px] truncate">
                  {user.email?.split("@")[0]}
                </span>
              </div>
              <button
                onClick={handleSignOut}
                className="linear-btn-ghost text-sm"
              >
                로그아웃
              </button>
            </div>
          ) : (
            <Link to="/login" className="linear-btn-primary text-sm">
              로그인
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
