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
    step: "01",
    title: "자연어 질문",
    description: "원하는 대출 조건을 말하듯이 입력하세요.",
  },
  {
    step: "02",
    title: "실시간 분석",
    description: "AI가 조건에 맞는 최적의 상품을 찾아냅니다.",
  },
  {
    step: "03",
    title: "상세 비교",
    description: "금리와 한도를 한눈에 비교하고 결정하세요.",
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
    <div className="flex flex-col bg-background">
      {/* Hero Section */}
      <section className="relative border-b border-border/40 bg-grid-pattern pt-20 pb-32 sm:pt-32 sm:pb-48">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background" />
        <div className="relative mx-auto max-w-5xl px-6">
          <div className="flex flex-col items-center text-center space-y-10">
            <div className="fade-in inline-flex items-center gap-3 rounded-full border border-border/50 bg-secondary/50 px-4 py-1.5 text-[13px] font-medium text-muted-foreground backdrop-blur-sm">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-foreground/20 opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-foreground/40"></span>
              </span>
              {stats?.total || 163}개의 금융 가이드 분석 완료
            </div>

            <h1 className="fade-in text-5xl font-bold tracking-tight sm:text-7xl lg:text-8xl [text-wrap:balance]">
              대출 정보를 찾는
              <br />
              <span className="text-muted-foreground/40">가장 진보된 방식</span>
            </h1>

            <p className="fade-in mx-auto max-w-2xl text-lg text-muted-foreground sm:text-xl leading-relaxed">
              복잡한 금융 가이드를 AI가 실시간으로 분석합니다.
              <br className="hidden sm:block" />
              대화하듯 질문하고 정확한 한도와 금리를 확인하세요.
            </p>

            <div className="fade-in flex flex-col sm:flex-row items-center gap-4 pt-4">
              <Link
                to="/chat"
                className="linear-btn-primary h-12 px-10 text-base shadow-2xl shadow-foreground/10"
              >
                챗봇 대화 시작하기
              </Link>
              <Link
                to="/products"
                className="linear-btn-secondary h-12 px-10 text-base"
              >
                전체 상품 탐색
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Important Announcements */}
      {announcements.length > 0 && (
        <section className="border-b border-border/40 bg-secondary/20">
          <div className="mx-auto max-w-7xl px-6 py-4">
            <div className="flex items-center gap-6 overflow-x-auto no-scrollbar text-[13px]">
              <span className="flex-shrink-0 font-bold tracking-widest text-foreground/40 uppercase">
                Notice
              </span>
              {announcements.map((a, i) => (
                <Link
                  key={a.id}
                  to="/announcements"
                  className="flex-shrink-0 font-medium hover:text-primary transition-colors"
                >
                  {a.title}
                  {i < announcements.length - 1 && (
                    <span className="ml-6 text-border">|</span>
                  )}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* How it works */}
      <section className="py-24 sm:py-32 border-b border-border/40">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid gap-12 sm:grid-cols-3">
            {steps.map((item) => (
              <div key={item.step} className="group space-y-6">
                <div className="text-4xl font-bold text-foreground/5 transition-colors group-hover:text-foreground/10">
                  {item.step}
                </div>
                <div className="space-y-3">
                  <h3 className="text-xl font-bold tracking-tight">{item.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Popular Searches */}
      <section className="py-24 sm:py-32 bg-secondary/10">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex flex-col items-center space-y-12">
            <div className="text-center space-y-4">
              <h2 className="text-3xl font-bold tracking-tight">주요 키워드</h2>
              <p className="text-muted-foreground">가장 많이 검색되는 주제들입니다.</p>
            </div>

            <div className="flex flex-wrap justify-center gap-3 max-w-3xl">
              {popularSearches.map((item) => (
                <Link
                  key={item.keyword}
                  to={`/chat?q=${encodeURIComponent(item.keyword)}`}
                  className="rounded-full border border-border/60 bg-background px-6 py-2.5 text-sm font-medium transition-all hover:border-foreground hover:bg-foreground hover:text-background"
                >
                  {item.keyword}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex items-end justify-between mb-16">
            <div className="space-y-4">
              <h2 className="text-3xl font-bold tracking-tight">추천 상품</h2>
              <p className="text-muted-foreground">현재 활성화된 대표적인 금융 가이드입니다.</p>
            </div>
            <Link
              to="/products"
              className="text-sm font-bold tracking-tighter hover:opacity-60 transition-opacity"
            >
              SEE ALL PRODUCTS →
            </Link>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {loading ? (
              [...Array(6)].map((_, i) => (
                <div key={i} className="h-64 animate-pulse rounded-xl bg-secondary/50" />
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
              <div className="col-span-full py-24 text-center text-muted-foreground font-medium border border-dashed rounded-2xl">
                데이터를 불러오는 중 오류가 발생했습니다.
              </div>
            )}
          </div>
        </div>
      </section>

      <GuideModal
        itemCd={selectedGuide}
        onClose={() => setSelectedGuide(null)}
      />

      {/* Footer */}
      <footer className="border-t border-border/40 py-20 px-6 bg-background">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col md:flex-row items-start justify-between gap-12">
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="h-6 w-6 rounded bg-foreground flex items-center justify-center text-background font-bold text-[10px]">
                  LG
                </div>
                <span className="font-bold tracking-tighter text-lg uppercase">Loan Guide</span>
              </div>
              <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
                금융 상품 가이드를 더 쉽고 빠르게 분석하는 차세대 대출 정보 플랫폼입니다.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-16">
              <div className="space-y-4">
                <h4 className="text-[11px] font-bold uppercase tracking-widest text-foreground/40">Product</h4>
                <ul className="space-y-2 text-sm font-medium">
                  <li><Link to="/chat" className="hover:text-muted-foreground transition-colors">AI 챗봇</Link></li>
                  <li><Link to="/products" className="hover:text-muted-foreground transition-colors">상품 목록</Link></li>
                </ul>
              </div>
              <div className="space-y-4">
                <h4 className="text-[11px] font-bold uppercase tracking-widest text-foreground/40">Support</h4>
                <ul className="space-y-2 text-sm font-medium">
                  <li><Link to="/report" className="hover:text-muted-foreground transition-colors">버그 신고</Link></li>
                  <li><Link to="/announcements" className="hover:text-muted-foreground transition-colors">공지사항</Link></li>
                </ul>
              </div>
              <div className="space-y-4">
                <h4 className="text-[11px] font-bold uppercase tracking-widest text-foreground/40">Legal</h4>
                <ul className="space-y-2 text-sm font-medium text-muted-foreground/60">
                  <li><a href="#" className="hover:text-foreground transition-colors">Terms</a></li>
                  <li><a href="#" className="hover:text-foreground transition-colors">Privacy</a></li>
                </ul>
              </div>
            </div>
          </div>

          <div className="mt-20 pt-8 border-t border-border/20 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] font-medium text-muted-foreground/40">
            <div>&copy; 2026 LOAN GUIDE. ALL RIGHTS RESERVED.</div>
            <div className="flex items-center gap-2">
              <div className={`h-1.5 w-1.5 rounded-full ${apiStatus ? 'bg-green-500' : 'bg-red-500'}`} />
              SYSTEM STATUS: {apiStatus ? 'OPERATIONAL' : 'OFFLINE'}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}