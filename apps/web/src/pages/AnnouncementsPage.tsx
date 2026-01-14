import { useState, useEffect } from "react";
import { Link } from "react-router-dom";

interface Announcement {
  id: string;
  type: "update" | "notice" | "maintenance" | "new_feature";
  title: string;
  content: string;
  important: boolean;
  createdAt: string;
}

const typeConfig = {
  update: { label: "업데이트", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300" },
  notice: { label: "공지", color: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300" },
  maintenance: { label: "점검", color: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300" },
  new_feature: { label: "신규기능", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300" },
};

function formatDate(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatContent(content: string) {
  // Simple markdown-like formatting
  return content
    .split("\n")
    .map((line, i) => {
      if (line.startsWith("**") && line.endsWith("**")) {
        return (
          <p key={i} className="font-semibold mt-3 mb-1">
            {line.slice(2, -2)}
          </p>
        );
      }
      if (line.startsWith("- ")) {
        return (
          <li key={i} className="ml-4">
            {line.slice(2)}
          </li>
        );
      }
      if (line === "") {
        return <br key={i} />;
      }
      return <p key={i}>{line}</p>;
    });
}

export function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>("all");

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      const res = await fetch("/api/announcements");
      const data = await res.json();
      setAnnouncements(data.announcements || []);
    } catch (error) {
      console.error("Failed to fetch announcements:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredAnnouncements = filterType === "all"
    ? announcements
    : announcements.filter((a) => a.type === filterType);

  // selectedId는 향후 상세보기 모달용 (현재 미사용)
  void selectedId;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center px-5 py-6 sm:px-6 sm:py-8">
      <div className="w-full max-w-4xl space-y-5 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">공지사항</h1>
            <p className="mt-1 text-sm sm:text-base text-muted-foreground">
              서비스 업데이트 및 안내사항
            </p>
          </div>
          <Link
            to="/chat"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 sm:py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z"/>
            </svg>
            챗봇 바로가기
          </Link>
        </div>

        {/* Filter */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFilterType("all")}
            className={`rounded-full px-3 py-1.5 sm:py-1 text-sm transition-colors ${
              filterType === "all"
                ? "bg-primary text-primary-foreground"
                : "bg-muted hover:bg-muted/80"
            }`}
          >
            전체
          </button>
          {Object.entries(typeConfig).map(([key, config]) => (
            <button
              key={key}
              onClick={() => setFilterType(key)}
              className={`rounded-full px-3 py-1.5 sm:py-1 text-sm transition-colors ${
                filterType === key
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted hover:bg-muted/80"
              }`}
            >
              {config.label}
            </button>
          ))}
        </div>

        {/* List */}
        {filteredAnnouncements.length === 0 ? (
          <div className="rounded-xl border p-8 text-center">
            <p className="text-muted-foreground">공지사항이 없습니다</p>
          </div>
        ) : (
          <div className="space-y-2.5 sm:space-y-3">
            {filteredAnnouncements.map((announcement) => (
              <button
                key={announcement.id}
                onClick={() => setSelectedId(selectedId === announcement.id ? null : announcement.id)}
                className={`w-full rounded-xl border p-4 text-left transition-colors hover:border-primary/50 ${
                  selectedId === announcement.id ? "border-primary bg-primary/5" : ""
                } ${announcement.important ? "border-l-4 border-l-destructive" : ""}`}
              >
                <div className="flex items-start justify-between gap-3 sm:gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 sm:mb-1 flex-wrap">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${typeConfig[announcement.type].color}`}>
                        {typeConfig[announcement.type].label}
                      </span>
                      {announcement.important && (
                        <span className="text-destructive text-xs font-medium">중요</span>
                      )}
                    </div>
                    <h3 className="font-medium text-sm sm:text-base line-clamp-2 sm:truncate">{announcement.title}</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                      {formatDate(announcement.createdAt)}
                    </p>
                  </div>
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
                    className={`flex-shrink-0 transition-transform text-muted-foreground sm:w-5 sm:h-5 ${
                      selectedId === announcement.id ? "rotate-180" : ""
                    }`}
                  >
                    <path d="m6 9 6 6 6-6"/>
                  </svg>
                </div>

                {/* Expanded Content */}
                {selectedId === announcement.id && (
                  <div className="mt-4 pt-4 border-t text-sm leading-relaxed">
                    {formatContent(announcement.content)}
                  </div>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Back link */}
        <div className="pt-4 border-t">
          <Link
            to="/"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            &larr; 홈으로 돌아가기
          </Link>
        </div>
      </div>
    </div>
  );
}
