// @ts-nocheck
import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { AdminAnnouncements } from "../components/admin/AdminAnnouncements";
import { AdminChatHistory } from "../components/admin/AdminChatHistory";
import { AdminProductMappings } from "../components/admin/AdminProductMappings";
import { StatsPage } from "./StatsPage";
import { useAuthStore, isAdminEmail } from "../lib/auth";

type AdminTab = "stats" | "history" | "announcements" | "mappings";

export function AdminPage() {
    const [activeTab, setActiveTab] = useState<AdminTab>("stats");
    const { user, loading } = useAuthStore();

    // 로딩 중이면 로딩 표시
    if (loading) {
        return (
            <div className="flex min-h-[calc(100vh-56px)] items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    // 로그인하지 않았거나 관리자가 아닌 경우
    const isAdmin = isAdminEmail(user?.email);

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (!isAdmin) {
        return (
            <div className="flex min-h-[calc(100vh-56px)] items-center justify-center px-4">
                <div className="text-center space-y-4">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-600 dark:text-red-400">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="8" x2="12" y2="12" />
                            <line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                    </div>
                    <h1 className="text-xl font-semibold">접근 권한이 없습니다</h1>
                    <p className="text-muted-foreground text-sm">
                        관리자 페이지에 접근할 수 있는 권한이 없습니다.
                    </p>
                    <Link to="/" className="inline-block linear-btn-primary mt-4">
                        홈으로 돌아가기
                    </Link>
                </div>
            </div>
        );
    }

    const menuItems: { id: AdminTab; label: string; icon: React.ReactNode }[] = [
        {
            id: "stats",
            label: "사용량 통계",
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18" /><path d="m19 9-5 5-4-4-3 3" /></svg>
            )
        },
        {
            id: "history",
            label: "채팅 히스토리",
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
            )
        },
        {
            id: "announcements",
            label: "공지사항 관리",
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8a3 3 0 0 0-3-3H5a3 3 0 0 0-3 3v8a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V8Z" /><path d="M10 12h.01" /><path d="M14 12h.01" /><path d="M18 12h.01" /><path d="M22 12v1" /><path d="M22 16v1" /></svg>
            )
        },
        {
            id: "mappings",
            label: "상품 분류 관리",
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
            )
        }
    ];

    return (
        <div className="flex min-h-[calc(100vh-56px)] bg-background">
            {/* Sidebar */}
            <aside className="w-64 border-r border-border/50 bg-card/30 backdrop-blur-sm hidden md:flex flex-col">
                <div className="p-6 border-b border-border/50">
                    <h2 className="text-lg font-bold">Admin Console</h2>
                    <p className="text-xs text-muted-foreground mt-1">Developer Interface</p>
                </div>
                <nav className="flex-1 p-4 space-y-2">
                    {menuItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id)}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === item.id
                                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                }`}
                        >
                            {item.icon}
                            {item.label}
                        </button>
                    ))}
                </nav>
                <div className="p-4 border-t border-border/50">
                    <Link
                        to="/"
                        className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground p-2"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
                        홈으로 나가기
                    </Link>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto">
                <div className="container max-w-6xl mx-auto p-6 md:p-8">
                    {activeTab === "stats" && (
                        <div className="space-y-6">
                            <StatsPage isAdminView />
                        </div>
                    )}
                    {activeTab === "history" && <AdminChatHistory />}
                    {activeTab === "announcements" && <AdminAnnouncements />}
                    {activeTab === "mappings" && <AdminProductMappings />}
                </div>
            </main>
        </div>
    );
}
