import { Link, useLocation, useNavigate } from "react-router-dom";
import { useThemeStore, applyTheme } from "../lib/theme";
import { useAuthStore } from "../lib/auth";
import { useEffect, useState, useRef } from "react";

// Icons
const SunIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>
);

const MoonIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
);

const MenuIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>
);

const LogoIcon = () => (
  <svg width="24" height="24" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M16 4L4 28H28L16 4Z" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round"/>
    <path d="M16 12V20" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
  </svg>
);

export function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, setTheme } = useThemeStore();
  const { user, signOut } = useAuthStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleSignOut = async () => {
    await signOut();
    setMenuOpen(false);
    navigate("/");
  };

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [location]);

  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
  };

  const themeIcon = {
    light: <SunIcon />,
    dark: <MoonIcon />,
  };

  const navItems = [
    { path: "/", label: "홈" },
    { path: "/chat", label: "챗봇" },
    { path: "/products", label: "상품목록" },
    { path: "/report", label: "버그신고" },
    { path: "/announcements", label: "공지" },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-border/40 bg-background/70 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* Logo */}
        <div className="flex items-center">
          <Link to="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-80">
            <div className="text-foreground">
              <LogoIcon />
            </div>
            <span className="text-base font-bold tracking-tight text-foreground hidden sm:block">
              LOAN GUIDE
            </span>
          </Link>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 sm:gap-2" ref={menuRef}>
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            title={`테마: ${theme === "light" ? "라이트" : "다크"}`}
          >
            {themeIcon[theme]}
          </button>

          {/* Menu Dropdown */}
          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className={`flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors ${
                menuOpen ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              <MenuIcon />
              <span className="hidden sm:inline">메뉴</span>
            </button>

            {menuOpen && (
              <div className="absolute right-0 mt-2 w-56 origin-top-right rounded-xl border border-border/50 bg-background/95 p-2 shadow-2xl backdrop-blur-xl fade-in">
                <div className="grid gap-1">
                  {navItems.map((item) => {
                    const isActive = location.pathname === item.path;
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        className={`flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                          isActive
                            ? "bg-foreground/5 text-foreground"
                            : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                        }`}
                      >
                        {item.label}
                      </Link>
                    );
                  })}
                </div>

                <div className="mt-2 border-t border-border/50 pt-2">
                  {user ? (
                    <div className="grid gap-1">
                      <div className="px-3 py-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
                        계정: {user.email}
                      </div>
                      <button
                        onClick={handleSignOut}
                        className="flex w-full items-center rounded-lg px-3 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
                      >
                        로그아웃
                      </button>
                    </div>
                  ) : (
                    <Link
                      to="/login"
                      className="flex items-center rounded-lg px-3 py-2.5 text-sm font-medium text-foreground hover:bg-secondary transition-colors"
                    >
                      로그인
                    </Link>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}