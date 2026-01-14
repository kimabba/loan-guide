import { useEffect, useState } from "react";
import { api } from "../lib/api";

// Types
interface DashboardData {
  overview: {
    totalTokens: number;
    totalCost: number;
    totalCostKrw: number;
    totalChats: number;
    totalApiCalls: number;
    todayTokens: number;
    todayCost: number;
    todayChats: number;
    todayActiveUsers: number;
  };
  trends: {
    last7Days: { date: string; tokens: number; cost: number; chats: number }[];
  };
  topGuides: { guideId: string; company: string; productType: string; views: number }[];
  topSearches: { query: string; count: number }[];
  lastUpdated: string;
}

interface DailyStatsResponse {
  days: number;
  stats: {
    date: string;
    chatCount: number;
    messageCount: number;
    apiCallCount: number;
    totalTokens: number;
    totalCostUsd: number;
    activeUsers: number;
  }[];
}

interface Plan {
  name: string;
  displayName: string;
  monthlyTokenLimit: number;
  monthlyChatLimit: number | null;
  maxUsers: number;
  priceKrw: number;
  features: string[];
}

// Utility functions
function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

function formatCurrency(amount: number, currency: "USD" | "KRW" = "KRW"): string {
  if (currency === "USD") {
    return `$${amount.toFixed(4)}`;
  }
  return `₩${amount.toLocaleString()}`;
}

// Simple bar chart component
function SimpleBarChart({
  data,
  dataKey,
  label,
  color = "bg-primary",
}: {
  data: { date: string; [key: string]: number | string }[];
  dataKey: string;
  label: string;
  color?: string;
}) {
  const maxValue = Math.max(...data.map((d) => Number(d[dataKey]) || 0), 1);

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium text-muted-foreground">{label}</div>
      <div className="flex items-end gap-1 h-32">
        {data.map((item, index) => {
          const value = Number(item[dataKey]) || 0;
          const height = (value / maxValue) * 100;
          const dayLabel = new Date(item.date).toLocaleDateString("ko-KR", {
            weekday: "short",
          });

          return (
            <div key={index} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full flex items-end justify-center h-24">
                <div
                  className={`w-full max-w-8 ${color} rounded-t transition-all duration-300`}
                  style={{ height: `${Math.max(height, 2)}%` }}
                  title={`${item.date}: ${formatNumber(value)}`}
                />
              </div>
              <span className="text-xs text-muted-foreground">{dayLabel}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Stat card component
function StatCard({
  title,
  value,
  subValue,
  icon,
  trend,
  color = "bg-primary/10 text-primary",
}: {
  title: string;
  value: string | number;
  subValue?: string;
  icon: React.ReactNode;
  trend?: { value: number; label: string };
  color?: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-5 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">{title}</span>
        <div className={`h-9 w-9 rounded-lg ${color} flex items-center justify-center`}>
          {icon}
        </div>
      </div>
      <div>
        <div className="text-2xl font-bold">{value}</div>
        {subValue && <div className="text-sm text-muted-foreground">{subValue}</div>}
      </div>
      {trend && (
        <div
          className={`text-xs font-medium ${
            trend.value >= 0 ? "text-green-600" : "text-red-600"
          }`}
        >
          {trend.value >= 0 ? "+" : ""}
          {trend.value}% {trend.label}
        </div>
      )}
    </div>
  );
}

export function StatsPage() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [dailyStats, setDailyStats] = useState<DailyStatsResponse | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "usage" | "products" | "plans">(
    "overview"
  );

  useEffect(() => {
    Promise.all([
      api.get<DashboardData>("/api/stats/dashboard"),
      api.get<DailyStatsResponse>("/api/stats/daily?days=30"),
      api.get<{ plans: Plan[] }>("/api/stats/plans"),
    ])
      .then(([dashboardData, dailyData, plansData]) => {
        setDashboard(dashboardData);
        setDailyStats(dailyData);
        setPlans(plansData.plans);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Failed to load stats:", error);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <span className="text-muted-foreground">통계 데이터 로딩 중...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold">통계 대시보드</h1>
        <p className="mt-2 text-muted-foreground">
          토큰 사용량, 비용, 사용 패턴을 확인하세요
        </p>
        {dashboard?.lastUpdated && (
          <p className="mt-1 text-xs text-muted-foreground">
            마지막 업데이트:{" "}
            {new Date(dashboard.lastUpdated).toLocaleString("ko-KR")}
          </p>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="mb-6 border-b">
        <nav className="flex gap-6">
          {[
            { id: "overview", label: "개요" },
            { id: "usage", label: "사용량 추이" },
            { id: "products", label: "인기 상품" },
            { id: "plans", label: "요금제" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`pb-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "border-b-2 border-primary text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && dashboard && (
        <div className="space-y-8">
          {/* Summary Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="총 토큰 사용량"
              value={formatNumber(dashboard.overview.totalTokens)}
              subValue="전체 기간"
              icon={
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
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
                  <path d="M2 12h20" />
                </svg>
              }
              color="bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400"
            />
            <StatCard
              title="총 비용"
              value={formatCurrency(dashboard.overview.totalCostKrw)}
              subValue={formatCurrency(dashboard.overview.totalCost, "USD")}
              icon={
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
                  <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
              }
              color="bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400"
            />
            <StatCard
              title="총 채팅 수"
              value={formatNumber(dashboard.overview.totalChats)}
              subValue="전체 기간"
              icon={
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
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              }
              color="bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-400"
            />
            <StatCard
              title="오늘 활성 사용자"
              value={dashboard.overview.todayActiveUsers}
              subValue={`오늘 채팅: ${dashboard.overview.todayChats}회`}
              icon={
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
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              }
              color="bg-orange-100 text-orange-600 dark:bg-orange-900 dark:text-orange-400"
            />
          </div>

          {/* Today's Stats */}
          <div className="rounded-xl border bg-card p-6">
            <h2 className="text-lg font-semibold mb-4">오늘의 사용량</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="text-center p-4 rounded-lg bg-muted/50">
                <div className="text-3xl font-bold text-blue-600">
                  {formatNumber(dashboard.overview.todayTokens)}
                </div>
                <div className="text-sm text-muted-foreground mt-1">토큰</div>
              </div>
              <div className="text-center p-4 rounded-lg bg-muted/50">
                <div className="text-3xl font-bold text-green-600">
                  {formatCurrency(Math.round(dashboard.overview.todayCost * 1450))}
                </div>
                <div className="text-sm text-muted-foreground mt-1">비용</div>
              </div>
              <div className="text-center p-4 rounded-lg bg-muted/50">
                <div className="text-3xl font-bold text-purple-600">
                  {dashboard.overview.todayChats}
                </div>
                <div className="text-sm text-muted-foreground mt-1">채팅</div>
              </div>
            </div>
          </div>

          {/* Weekly Trend Chart */}
          <div className="rounded-xl border bg-card p-6">
            <h2 className="text-lg font-semibold mb-4">최근 7일 추이</h2>
            <div className="grid gap-6 sm:grid-cols-3">
              <SimpleBarChart
                data={dashboard.trends.last7Days}
                dataKey="tokens"
                label="토큰 사용량"
                color="bg-blue-500"
              />
              <SimpleBarChart
                data={dashboard.trends.last7Days}
                dataKey="chats"
                label="채팅 수"
                color="bg-purple-500"
              />
              <SimpleBarChart
                data={dashboard.trends.last7Days.map((d) => ({
                  ...d,
                  costKrw: Math.round(d.cost * 1450),
                }))}
                dataKey="costKrw"
                label="비용 (KRW)"
                color="bg-green-500"
              />
            </div>
          </div>

          {/* Top Searches */}
          {dashboard.topSearches.length > 0 && (
            <div className="rounded-xl border bg-card p-6">
              <h2 className="text-lg font-semibold mb-4">인기 검색어</h2>
              <div className="flex flex-wrap gap-2">
                {dashboard.topSearches.map((search, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-2 rounded-full bg-muted px-4 py-2 text-sm"
                  >
                    <span className="font-medium">{search.query}</span>
                    <span className="text-muted-foreground">({search.count})</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Usage Tab */}
      {activeTab === "usage" && dailyStats && (
        <div className="space-y-6">
          <div className="rounded-xl border bg-card p-6">
            <h2 className="text-lg font-semibold mb-4">일별 사용량 (최근 30일)</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="py-3 px-4 text-left font-medium">날짜</th>
                    <th className="py-3 px-4 text-right font-medium">채팅</th>
                    <th className="py-3 px-4 text-right font-medium">메시지</th>
                    <th className="py-3 px-4 text-right font-medium">토큰</th>
                    <th className="py-3 px-4 text-right font-medium">비용</th>
                    <th className="py-3 px-4 text-right font-medium">활성 사용자</th>
                  </tr>
                </thead>
                <tbody>
                  {dailyStats.stats
                    .slice()
                    .reverse()
                    .map((day) => (
                      <tr key={day.date} className="border-b hover:bg-muted/50">
                        <td className="py-3 px-4">{day.date}</td>
                        <td className="py-3 px-4 text-right">{day.chatCount}</td>
                        <td className="py-3 px-4 text-right">{day.messageCount}</td>
                        <td className="py-3 px-4 text-right">
                          {formatNumber(day.totalTokens)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {formatCurrency(Math.round(day.totalCostUsd * 1450))}
                        </td>
                        <td className="py-3 px-4 text-right">{day.activeUsers}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Products Tab */}
      {activeTab === "products" && dashboard && (
        <div className="space-y-6">
          <div className="rounded-xl border bg-card p-6">
            <h2 className="text-lg font-semibold mb-4">인기 상품 TOP 10</h2>
            {dashboard.topGuides.length > 0 ? (
              <div className="space-y-3">
                {dashboard.topGuides.map((guide, index) => (
                  <div
                    key={guide.guideId}
                    className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{guide.company}</div>
                      <div className="text-sm text-muted-foreground truncate">
                        {guide.productType}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">{guide.views}</div>
                      <div className="text-xs text-muted-foreground">조회</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                아직 상품 조회 데이터가 없습니다
              </div>
            )}
          </div>
        </div>
      )}

      {/* Plans Tab */}
      {activeTab === "plans" && (
        <div className="space-y-6">
          <div className="grid gap-6 sm:grid-cols-3">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-xl border p-6 space-y-4 ${
                  plan.name === "basic" ? "border-primary ring-2 ring-primary/20" : ""
                }`}
              >
                {plan.name === "basic" && (
                  <div className="inline-block rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
                    추천
                  </div>
                )}
                <div>
                  <h3 className="text-xl font-bold">{plan.displayName}</h3>
                  <div className="mt-2">
                    <span className="text-3xl font-bold">
                      {plan.priceKrw === 0 ? "무료" : `₩${plan.priceKrw.toLocaleString()}`}
                    </span>
                    {plan.priceKrw > 0 && (
                      <span className="text-muted-foreground">/월</span>
                    )}
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">월 토큰</span>
                    <span className="font-medium">
                      {formatNumber(plan.monthlyTokenLimit)}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">월 채팅</span>
                    <span className="font-medium">
                      {plan.monthlyChatLimit === null
                        ? "무제한"
                        : plan.monthlyChatLimit.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">최대 사용자</span>
                    <span className="font-medium">{plan.maxUsers}명</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-medium">포함 기능</div>
                  <ul className="space-y-1">
                    {plan.features.map((feature) => (
                      <li
                        key={feature}
                        className="flex items-center gap-2 text-sm text-muted-foreground"
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
                          className="text-green-500"
                        >
                          <path d="M20 6 9 17l-5-5" />
                        </svg>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  className={`w-full py-2.5 rounded-lg font-medium transition-colors ${
                    plan.name === "basic"
                      ? "bg-primary text-primary-foreground hover:bg-primary/90"
                      : "border hover:bg-muted"
                  }`}
                >
                  {plan.priceKrw === 0 ? "현재 플랜" : "업그레이드"}
                </button>
              </div>
            ))}
          </div>

          {/* Cost Calculator */}
          <div className="rounded-xl border bg-card p-6">
            <h2 className="text-lg font-semibold mb-4">비용 계산기</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="p-4 rounded-lg bg-muted/50">
                <h3 className="font-medium mb-2">Gemini 2.5 Flash 요금</h3>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <div className="flex justify-between">
                    <span>입력 토큰</span>
                    <span>$0.075 / 1M 토큰</span>
                  </div>
                  <div className="flex justify-between">
                    <span>출력 토큰</span>
                    <span>$0.30 / 1M 토큰</span>
                  </div>
                </div>
              </div>
              <div className="p-4 rounded-lg bg-muted/50">
                <h3 className="font-medium mb-2">예상 비용 (월 기준)</h3>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <div className="flex justify-between">
                    <span>1,000회 채팅</span>
                    <span>약 ₩2,000 ~ ₩5,000</span>
                  </div>
                  <div className="flex justify-between">
                    <span>10,000회 채팅</span>
                    <span>약 ₩20,000 ~ ₩50,000</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
