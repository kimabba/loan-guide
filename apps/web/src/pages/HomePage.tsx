import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { ProductCard } from "../components/products/ProductCard";
import { GuideModal } from "../components/GuideModal";

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

interface Product {
  item_cd: string;
  pfi_name: string;
  depth1: string;
  depth2: string;
  fi_memo: string;
}

const popularSearches = [
  { keyword: "신용대출" },
  { keyword: "OK저축은행" },
  { keyword: "무직자대출" },
  { keyword: "비대면" },
  { keyword: "저금리" },
  { keyword: "급전" },
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
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGuide, setSelectedGuide] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get<HealthStatus>("/api/"),
      api.get<{ total: number; guides: any[] }>("/api/guides"),
      api.get<{ announcements: Announcement[] }>("/api/announcements?important=true"),
    ])
      .then(([status, guidesData, announcementsData]) => {
        setApiStatus(status);
        setStats({ total: guidesData.total });
        setAnnouncements(announcementsData.announcements?.slice(0, 2) || []);

        // Sample products for home page (first 6)
        if (guidesData.guides && Array.isArray(guidesData.guides)) {
          const mapped = guidesData.guides.slice(0, 6).map((g: any) => ({
            item_cd: g.item_cd,
            pfi_name: g.company || g.pfi_name,
            depth1: g.category || g.depth1,
            depth2: g.product_type || g.depth2,
            fi_memo: g.memo || g.fi_memo,
          }));
          setProducts(mapped);
        } else if (Array.isArray(guidesData)) {
           // Handle direct array response
           const mapped = (guidesData as any).slice(0, 6).map((g: any) => ({
            item_cd: g.item_cd,
            pfi_name: g.pfi_name,
            depth1: g.depth1,
            depth2: g.depth2,
            fi_memo: g.fi_memo,
          }));
          setProducts(mapped);
          setStats({ total: (guidesData as any).length });
        }
        setLoading(false);
      })
      .catch(() => {
        // Fallback for local dev
        fetch("/loan_guides.json")
          .then((res) => res.json())
          .then((data) => {
            const list = Array.isArray(data) ? data : [];
            setProducts(list.slice(0, 6));
            setStats({ total: list.length });
            setLoading(false);
          })
          .catch(() => setLoading(false));
      });
  }, []);

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b bg-gradient-to-b from-primary/5 to-background">
        <div className="absolute inset-0 bg-grid-pattern opacity-5" />
        <div className="relative mx-auto max-w-5xl px-4 py-16 sm:py-24">
          <div className="text-center space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              {stats?.total || 163}개 상품 검색 가능
            </div>

            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              대출 가이드를
              <br />
              <span className="text-primary">쉽고 빠르게</span>
            </h1>

            <p className="mx-auto max-w-2xl text-lg text-muted-foreground sm:text-xl">
              저축은행, 캐피탈, 대부업체의 대출 상품 정보를
              <br className="hidden sm:block" />
              자연어로 검색하고 비교해보세요
            </p>

            <div className="flex flex-col sm:flex-row justify-center gap-3 pt-4">
              <Link
                to="/chat"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-8 py-3.5 font-medium text-primary-foreground hover:bg-primary/90 transition-colors shadow-lg shadow-primary/25"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
                챗봇 시작하기
              </Link>
              <Link
                to="/announcements"
                className="inline-flex items-center justify-center gap-2 rounded-lg border px-8 py-3.5 font-medium hover:bg-muted transition-colors"
              >
                공지사항 확인
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
      <section className="py-16 px-4">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold sm:text-3xl">이용 방법</h2>
            <p className="mt-2 text-muted-foreground">
              3단계로 간편하게 대출 정보를 검색하세요
            </p>
          </div>

          <div className="grid gap-8 sm:grid-cols-3">
            {steps.map((item) => (
              <div key={item.step} className="relative text-center p-6 rounded-xl border bg-card">
                <div className="mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  {item.step}
                </div>
                <h3 className="font-semibold text-lg">{item.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Popular Searches */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold sm:text-3xl">인기 검색어</h2>
            <p className="mt-2 text-muted-foreground">
              클릭하면 바로 검색할 수 있어요
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-3">
            {popularSearches.map((item) => (
              <Link
                key={item.keyword}
                to={`/chat?q=${encodeURIComponent(item.keyword)}`}
                className="inline-flex items-center gap-2 rounded-full border bg-background px-5 py-2.5 text-sm font-medium hover:border-primary hover:bg-primary/5 transition-colors"
              >
                {item.keyword}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-16 px-4">
        <div className="mx-auto max-w-5xl">
          <div className="flex items-end justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold sm:text-3xl">상품 목록</h2>
              <p className="mt-2 text-muted-foreground">
                가이드에서 제공하는 대표적인 대출 상품들입니다
              </p>
            </div>
            <Link
              to="/products"
              className="text-sm font-medium text-primary hover:underline"
            >
              전체 보기 →
            </Link>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {loading ? (
              [...Array(6)].map((_, i) => (
                <div key={i} className="h-48 animate-pulse rounded-lg bg-muted" />
              ))
            ) : products.length > 0 ? (
              products.map((product) => (
                <ProductCard
                  key={product.item_cd}
                  itemCd={product.item_cd}
                  company={product.pfi_name}
                  category={product.depth1}
                  productType={product.depth2}
                  summary={product.fi_memo || ""}
                  onClick={() => setSelectedGuide(product.item_cd)}
                />
              ))
            ) : (
              <div className="col-span-full py-12 text-center text-muted-foreground">
                상품 정보를 불러올 수 없습니다.
              </div>
            )}
          </div>
        </div>
      </section>

      <GuideModal
        itemCd={selectedGuide}
        onClose={() => setSelectedGuide(null)}
      />

      {/* Features */}
      <section className="py-16 px-4">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold sm:text-3xl">주요 기능</h2>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border bg-card p-5 space-y-2">
              <h3 className="font-semibold text-primary">자연어 검색</h3>
              <p className="text-sm text-muted-foreground">
                복잡한 조건 없이 말하듯이 검색
              </p>
            </div>

            <div className="rounded-xl border bg-card p-5 space-y-2">
              <h3 className="font-semibold text-primary">{stats?.total || 163}개 상품</h3>
              <p className="text-sm text-muted-foreground">
                다양한 금융사의 상품 정보
              </p>
            </div>

            <div className="rounded-xl border bg-card p-5 space-y-2">
              <h3 className="font-semibold text-primary">상세 비교</h3>
              <p className="text-sm text-muted-foreground">
                금리, 한도, 조건 한눈에 비교
              </p>
            </div>

            <div className="rounded-xl border bg-card p-5 space-y-2">
              <h3 className="font-semibold text-primary">정확한 정보</h3>
              <p className="text-sm text-muted-foreground">
                실제 가이드 기반 신뢰할 수 있는 데이터
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 bg-primary text-primary-foreground">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-2xl font-bold sm:text-3xl">
            지금 바로 시작하세요
          </h2>
          <p className="mt-3 text-primary-foreground/80">
            복잡한 대출 조건, 챗봇에게 물어보세요
          </p>
          <Link
            to="/chat"
            className="mt-8 inline-flex items-center gap-2 rounded-lg bg-background px-8 py-3.5 font-medium text-foreground hover:bg-background/90 transition-colors"
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
      <footer className="border-t py-8 px-4">
        <div className="mx-auto max-w-5xl">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
                G
              </div>
              <span className="font-semibold">대출 가이드</span>
            </div>

            <div className="flex items-center gap-6 text-sm text-muted-foreground">
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

          <div className="mt-6 text-center text-xs text-muted-foreground">
            &copy; 2025 대출 가이드. 본 서비스는 정보 제공 목적이며, 실제 대출 조건은 금융사에 문의하세요.
          </div>
        </div>
      </footer>
    </div>
  );
}
