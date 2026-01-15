// @ts-nocheck
import { useState, useEffect } from "react";
import { api } from "../../lib/api";

interface Announcement {
    id: string;
    type: string;
    title: string;
    content: string;
    important: boolean;
    createdAt: string;
}

export function AdminAnnouncements() {
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);

    const [newTitle, setNewTitle] = useState("");
    const [newContent, setNewContent] = useState("");
    const [newType, setNewType] = useState("notice");
    const [isImportant, setIsImportant] = useState(false);

    useEffect(() => {
        fetchAnnouncements();
    }, []);

    const fetchAnnouncements = async () => {
        setLoading(true);
        try {
            const data = await api.get<{ announcements: Announcement[] }>("/api/announcements");
            setAnnouncements(data.announcements || []);
        } catch (error) {
            console.error("Failed to fetch announcements:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post("/api/announcements", {
                title: newTitle,
                content: newContent,
                type: newType,
                important: isImportant,
            });
            setIsAdding(false);
            setNewTitle("");
            setNewContent("");
            fetchAnnouncements();
        } catch (error) {
            console.error("Failed to create announcement:", error);
            alert("공지사항 작성에 실패했습니다.");
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("정말 삭제하시겠습니까?")) return;
        try {
            await api.delete(`/api/announcements/${id}`);
            fetchAnnouncements();
        } catch (error) {
            console.error("Failed to delete announcement:", error);
            alert("삭제 실패");
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold">공지사항 관리</h2>
                    <p className="text-sm text-muted-foreground mt-1">대출 가이드 서비스의 공지를 관리합니다.</p>
                </div>
                <button
                    onClick={() => setIsAdding(!isAdding)}
                    className="linear-btn-primary"
                >
                    {isAdding ? "취소" : "새 공지 작성"}
                </button>
            </div>

            {isAdding && (
                <form onSubmit={handleCreate} className="linear-card p-6 space-y-4 slide-down">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">제목</label>
                            <input
                                required
                                value={newTitle}
                                onChange={(e) => setNewTitle(e.target.value)}
                                placeholder="공지 제목을 입력하세요"
                                className="linear-input w-full"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">유형</label>
                            <select
                                value={newType}
                                onChange={(e) => setNewType(e.target.value)}
                                className="linear-input w-full"
                            >
                                <option value="notice">공지</option>
                                <option value="update">업데이트</option>
                                <option value="new_feature">신규기능</option>
                                <option value="maintenance">점검</option>
                            </select>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">내용</label>
                        <textarea
                            required
                            rows={5}
                            value={newContent}
                            onChange={(e) => setNewContent(e.target.value)}
                            placeholder="내용을 입력하세요 (마크다운 지원)"
                            className="linear-input w-full"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="important"
                            checked={isImportant}
                            onChange={(e) => setIsImportant(e.target.checked)}
                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                        />
                        <label htmlFor="important" className="text-sm font-medium">중요 공지 (상단 고정 및 강조)</label>
                    </div>
                    <div className="flex justify-end pt-2">
                        <button type="submit" className="linear-btn-primary px-8">
                            작성 완료
                        </button>
                    </div>
                </form>
            )}

            <div className="space-y-3">
                {loading ? (
                    <div className="text-center py-10 opacity-50">로딩 중...</div>
                ) : announcements.length === 0 ? (
                    <div className="text-center py-10 border rounded-xl border-dashed">공지사항이 없습니다.</div>
                ) : (
                    announcements.map((a) => (
                        <div key={a.id} className="linear-card p-4 flex items-center justify-between group">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${a.type === 'notice' ? 'bg-gray-100 text-gray-800' :
                                        a.type === 'update' ? 'bg-blue-100 text-blue-800' :
                                            a.type === 'new_feature' ? 'bg-green-100 text-green-800' :
                                                'bg-orange-100 text-orange-800'
                                        }`}>
                                        {a.type}
                                    </span>
                                    {a.important && <span className="text-[10px] font-bold text-destructive">IMPORTANT</span>}
                                    <span className="text-xs text-muted-foreground">{new Date(a.createdAt).toLocaleDateString()}</span>
                                </div>
                                <h4 className="font-semibold">{a.title}</h4>
                            </div>
                            <button
                                onClick={() => handleDelete(a.id)}
                                className="p-2 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /><line x1="10" x2="10" y1="11" y2="17" /><line x1="14" x2="14" y1="11" y2="17" /></svg>
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
