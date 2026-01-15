// @ts-nocheck
import { useState, useEffect } from "react";
import { api } from "../../lib/api";

interface ChatProblem {
    id: string;
    quality_score: number;
    issue_type: string;
    user_feedback: string | null;
    created_at: string;
    chat_messages: { content: string };
    sessionId?: string;
}

interface QualityStats {
    issueCounts: Record<string, number>;
    feedbackCounts: Record<string, number>;
    totalChats: number;
    problemRate: number;
    recentProblems: ChatProblem[];
}

export function AdminChatHistory() {
    const [stats, setStats] = useState<QualityStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedSession, setSelectedSession] = useState<string | null>(null);
    const [sessionMessages, setSessionMessages] = useState<any[]>([]);
    const [loadingMessages, setLoadingMessages] = useState(false);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        setLoading(true);
        try {
            const data = await api.get<QualityStats>("/api/chat/quality/stats?days=30");
            setStats(data);
        } catch (error) {
            console.error("Failed to fetch quality stats:", error);
        } finally {
            setLoading(false);
        }
    };

    const inspectSession = async (sessionId: string) => {
        setSelectedSession(sessionId);
        setLoadingMessages(true);
        try {
            const data = await api.get<{ messages: any[] }>(`/api/chat/sessions/${sessionId}/messages`);
            setSessionMessages(data.messages || []);
        } catch (error) {
            console.error("Failed to fetch session messages:", error);
        } finally {
            setLoadingMessages(false);
        }
    };

    if (loading) return <div className="text-center py-20 opacity-50 text-sm">데이터 분석 중...</div>;

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-2xl font-bold">채팅 품질 모니터링</h2>
                <p className="text-sm text-muted-foreground mt-1">AI의 응답 품질과 사용자의 특이 질문을 모니터링합니다.</p>
            </div>

            {stats && (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="linear-card p-4 space-y-1">
                        <span className="text-xs text-muted-foreground">문제 발생률</span>
                        <div className="text-2xl font-bold text-destructive">{stats.problemRate}%</div>
                    </div>
                    <div className="linear-card p-4 space-y-1">
                        <span className="text-xs text-muted-foreground">정보 부족 (No Answer)</span>
                        <div className="text-2xl font-bold text-orange-500">{stats.issueCounts.no_answer || 0}</div>
                    </div>
                    <div className="linear-card p-4 space-y-1">
                        <span className="text-xs text-muted-foreground">주제 외 질문 (Off Topic)</span>
                        <div className="text-2xl font-bold text-purple-500">{stats.issueCounts.off_topic || 0}</div>
                    </div>
                    <div className="linear-card p-4 space-y-1">
                        <span className="text-xs text-muted-foreground">신고된 오답</span>
                        <div className="text-2xl font-bold text-red-600">{stats.feedbackCounts.wrong || 0}</div>
                    </div>
                </div>
            )}

            <div>
                <h3 className="text-lg font-semibold mb-4">최근 감지된 문제 대화</h3>
                <div className="space-y-3">
                    {stats?.recentProblems.map((prob) => (
                        <div
                            key={prob.id}
                            onClick={() => prob.sessionId && inspectSession(prob.sessionId)}
                            className="linear-card p-4 cursor-pointer hover:border-primary/40 transition-colors group"
                        >
                            <div className="flex items-start justify-between">
                                <div className="space-y-1 flex-1 pr-4">
                                    <div className="flex items-center gap-2">
                                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${prob.issue_type === 'no_answer' ? 'bg-orange-100 text-orange-800' :
                                                prob.issue_type === 'off_topic' ? 'bg-purple-100 text-purple-800' :
                                                    'bg-red-100 text-red-800'
                                            }`}>
                                            {prob.issue_type.toUpperCase()}
                                        </span>
                                        {prob.user_feedback && (
                                            <span className="text-[10px] font-bold bg-destructive/10 text-destructive px-1.5 py-0.5 rounded">
                                                신고: {prob.user_feedback}
                                            </span>
                                        )}
                                        <span className="text-[10px] text-muted-foreground">{new Date(prob.created_at).toLocaleString()}</span>
                                    </div>
                                    <p className="text-sm font-medium line-clamp-1 italic text-muted-foreground">
                                        Q: {prob.chat_messages?.content || "내용 없음"}
                                    </p>
                                </div>
                                <div className="text-xs font-semibold text-primary opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                    대화 내용 보기 &rarr;
                                </div>
                            </div>
                        </div>
                    ))}
                    {stats?.recentProblems.length === 0 && (
                        <div className="text-center py-10 border rounded-xl border-dashed text-muted-foreground">
                            최근 감지된 문제가 없습니다. 서비스가 안정적입니다.
                        </div>
                    )}
                </div>
            </div>

            {/* Chat Inspector Modal */}
            {selectedSession && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm slide-up">
                    <div className="bg-card w-full max-w-2xl h-[80vh] rounded-2xl flex flex-col shadow-2xl overflow-hidden border">
                        <div className="p-4 border-b flex items-center justify-between">
                            <h4 className="font-bold">채팅 로그 상세</h4>
                            <button
                                onClick={() => setSelectedSession(null)}
                                className="p-1 hover:bg-muted rounded-lg"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {loadingMessages ? (
                                <div className="text-center py-20 opacity-50">조회 중...</div>
                            ) : (
                                sessionMessages.map((m, i) => (
                                    <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[85%] px-4 py-2 rounded-2xl text-sm ${m.role === 'user'
                                                ? 'bg-primary text-primary-foreground'
                                                : 'bg-muted border border-border/50'
                                            }`}>
                                            <div className="whitespace-pre-wrap">{m.content}</div>
                                            <div className="text-[10px] opacity-40 mt-1">{new Date(m.created_at).toLocaleTimeString()}</div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
