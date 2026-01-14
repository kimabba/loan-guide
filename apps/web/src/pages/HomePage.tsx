import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";

interface HealthStatus {
  name: string;
  version: string;
  status: string;
}

interface Stats {
  total: number;
}

interface Announcement {
  id: string;
  type: string;
  title: string;
  important: boolean;
  createdAt: string;
}

const popularSearches = [
  { keyword: "신용대출", icon: "💳" },
  { keyword: "OK저축은행", icon: "🏦" },
  { keyword: "무직자대출", icon: "📋" },
  { keyword: "비대면", icon: "📱" },
  { keyword: "저금리", icon: "📉" },
  { keyword: "급전", icon: "⚡" },
];

const steps = [
  {
    step: 1,
    title: "질문하기",
    description: "원하는 대출 조건을 자연어로 입력하세요",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z"/>
      </svg>
    ),
  },
  {
    step: 2,
    title: "결과 확인",
    description: "조건에 맞는 대출 상품들을 확인하세요",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" x2="8" y1="13" y2="13"/>
        <line x1="16" x2="8" y1="17" y2="17"/>
        <line x1="10" x2="8" y1="9" y2="9"/>
      </svg>
    ),
  },
  {
    step: 3,
    title: "상세 정보",
    description: "금리, 한도, 필요 서류 등 상세 조건을 확인하세요",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <path d="M12 16v-4"/>
        <path d="M12 8h.01"/>
      </svg>
    ),
  },
];

export function HomePage() {
  const [apiStatus, setApiStatus] = useState<HealthStatus | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<HealthStatus>("/api/"),
      api.get<{ total: number }>("/api/guides"),
      api.get<{ announcements: Announcement[] }>("/api/announcements?important=true"),
    ])
      .then(([status, guides, announcementsData]) => {
        setApiStatus(status);
        setStats({ total: guides.total });
        setAnnouncements(announcementsData.announcements?.slice(0, 2) || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b bg-gradient-to-b from-primary/5 to-background">
        <div className="absolute inset-0 bg-grid-pattern opacity-5" />
        <div className="relative mx-auto max-w-5xl px-5 py-12 sm:px-6 sm:py-20 lg:py-24">
          <div className="text-center space-y-5 sm:space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 sm:px-4 sm:py-1.5 text-xs sm:text-sm font-medium text-primary">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              {stats?.total || 163}개 상품 검색 가능
            </div>

            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl xl:text-6xl">
              대출 가이드를
              <br />
              <span className="text-primary">쉽고 빠르게</span>
            </h1>

            <p className="mx-auto max-w-2xl text-base text-muted-foreground sm:text-lg lg:text-xl leading-relaxed px-2">
              저축은행, 캐피탈, 대부업체의
              <br className="sm:hidden" />
              {" "}대출 상품 정보를
              <br className="hidden sm:block" />
              자연어로 검색하고 비교해보세요
            </p>

            <div className="flex flex-col gap-3 pt-2 sm:pt-4 sm:flex-row sm:justify-center">
              <Link
                to="/chat"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 sm:px-8 font-medium text-primary-foreground hover:bg-primary/90 transition-colors shadow-lg shadow-primary/25"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
                챗봇 시작하기
              </Link>
              <Link
                to="/products"
                className="inline-flex items-center justify-center gap-2 rounded-xl border px-6 py-3.5 sm:px-8 font-medium hover:bg-muted transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="7" height="7"/>
                  <rect x="14" y="3" width="7" height="7"/>
                  <rect x="3" y="14" width="7" height="7"/>
                  <rect x="14" y="14" width="7" height="7"/>
                </svg>
                상품 둘러보기
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Important Announcements */}
      {announcements.length > 0 && (
        <section className="border-b bg-orange-50 dark:bg-orange-950/20">
          <div className="mx-auto max-w-5xl px-4 py-3">
            <div className="flex items-center gap-4 overflow-x-auto">
              <span className="flex-shrink-0 rounded bg-orange-500 px-2 py-0.5 text-xs font-medium text-white">
                공지
              </span>
              {announcements.map((a, i) => (
                <Link
                  key={a.id}
                  to="/announcements"
                  className="flex-shrink-0 text-sm hover:underline"
                >
                  {a.title}
                  {i < announcements.length - 1 && (
                    <span className="ml-4 text-muted-foreground">|</span>
                  )}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* How it works */}
      <section className="py-12 px-5 sm:py-16 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-10 sm:mb-12">
            <h2 className="text-xl font-bold sm:text-2xl lg:text-3xl">이용 방법</h2>
            <p className="mt-2 text-sm sm:text-base text-muted-foreground">
              3단계로 간편하게 대출 정보를 검색하세요
            </p>
          </div>

          <div className="grid gap-8 sm:grid-cols-3">
            {steps.map((item) => (
              <div key={item.step} className="relative text-center px-2">
                <div className="mx-auto mb-4 flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  {item.icon}
                </div>
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  {item.step}
                </div>
                <h3 className="font-semibold text-base sm:text-lg">{item.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Popular Searches */}
      <section className="py-12 px-5 sm:py-16 sm:px-6 bg-muted/30">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-6 sm:mb-8">
            <h2 className="text-xl font-bold sm:text-2xl lg:text-3xl">인기 검색어</h2>
            <p className="mt-2 text-sm sm:text-base text-muted-foreground">
              클릭하면 바로 검색할 수 있어요
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
            {popularSearches.map((item) => (
              <Link
                key={item.keyword}
                to={`/chat?q=${encodeURIComponent(item.keyword)}`}
                className="inline-flex items-center gap-1.5 sm:gap-2 rounded-full border bg-background px-4 py-2 sm:px-5 sm:py-2.5 text-sm font-medium hover:border-primary hover:bg-primary/5 transition-colors"
              >
                <span>{item.icon}</span>
                {item.keyword}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-12 px-5 sm:py-16 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-xl font-bold sm:text-2xl lg:text-3xl">주요 기능</h2>
          </div>

          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border bg-card p-4 sm:p-5 space-y-2 sm:space-y-3">
              <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"/>
                  <path d="m21 21-4.3-4.3"/>
                </svg>
              </div>
              <h3 className="font-semibold text-sm sm:text-base">자연어 검색</h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                복잡한 조건 없이 말하듯이 검색
              </p>
            </div>

            <div className="rounded-xl border bg-card p-4 sm:p-5 space-y-2 sm:space-y-3">
              <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-lg bg-green-100 dark:bg-green-900 flex items-center justify-center text-green-600 dark:text-green-400">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                </svg>
              </div>
              <h3 className="font-semibold text-sm sm:text-base">{stats?.total || 163}개 상품</h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                다양한 금융사의 상품 정보
              </p>
            </div>

            <div className="rounded-xl border bg-card p-4 sm:p-5 space-y-2 sm:space-y-3">
              <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-lg bg-purple-100 dark:bg-purple-900 flex items-center justify-center text-purple-600 dark:text-purple-400">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="18" height="18" x="3" y="3" rx="2"/>
                  <path d="M3 9h18"/>
                  <path d="M9 21V9"/>
                </svg>
              </div>
              <h3 className="font-semibold text-sm sm:text-base">상세 비교</h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                금리, 한도, 조건 한눈에 비교
              </p>
            </div>

            <div className="rounded-xl border bg-card p-4 sm:p-5 space-y-2 sm:space-y-3">
              <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-lg bg-orange-100 dark:bg-orange-900 flex items-center justify-center text-orange-600 dark:text-orange-400">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/>
                </svg>
              </div>
              <h3 className="font-semibold text-sm sm:text-base">정확한 정보</h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                실제 가이드 기반 데이터
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-12 px-5 sm:py-16 sm:px-6 bg-primary text-primary-foreground">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-xl font-bold sm:text-2xl lg:text-3xl">
            지금 바로 시작하세요
          </h2>
          <p className="mt-2 sm:mt-3 text-sm sm:text-base text-primary-foreground/80">
            복잡한 대출 조건, 챗봇에게 물어보세요
          </p>
          <Link
            to="/chat"
            className="mt-6 sm:mt-8 inline-flex items-center gap-2 rounded-xl bg-background px-6 py-3 sm:px-8 sm:py-3.5 font-medium text-foreground hover:bg-background/90 transition-colors"
          >
            무료로 시작하기
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14"/>
              <path d="m12 5 7 7-7 7"/>
            </svg>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 px-5 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-between sm:gap-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
                G
              </div>
              <span className="font-semibold">대출 가이드</span>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-sm text-muted-foreground">
              <Link to="/announcements" className="hover:text-foreground">공지사항</Link>
              <Link to="/report" className="hover:text-foreground">버그신고</Link>
              <a href="#" className="hover:text-foreground">이용약관</a>
              <a href="#" className="hover:text-foreground">개인정보처리방침</a>
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {loading ? (
                <div className="h-2 w-2 animate-pulse rounded-full bg-muted" />
              ) : apiStatus ? (
                <div className="h-2 w-2 rounded-full bg-green-500" />
              ) : (
                <div className="h-2 w-2 rounded-full bg-red-500" />
              )}
              <span>v{apiStatus?.version || "1.0.0"}</span>
            </div>
          </div>

          <div className="mt-6 text-center text-xs text-muted-foreground leading-relaxed px-2">
            &copy; 2025 대출 가이드. 본 서비스는 정보 제공 목적이며,<br className="sm:hidden" /> 실제 대출 조건은 금융사에 문의하세요.
          </div>
        </div>
      </footer>
    </div>
  );
}
