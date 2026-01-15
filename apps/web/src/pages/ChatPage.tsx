import { useState, useRef, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { GuideModal } from "../components/GuideModal";
import { api } from "../lib/api";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  guides?: GuideResult[];
  timestamp?: Date;
  quality?: { score: number; issueType: string };
}

interface GuideResult {
  item_cd: string;
  company: string;
  product_type: string;
  relevance: number;
  summary: string;
}

// Icons as inline SVGs for minimal dependencies
const SendIcon = () => (
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
    <path d="m22 2-7 20-4-9-9-4Z" />
    <path d="M22 2 11 13" />
  </svg>
);

const BotIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 8V4H8" />
    <rect width="16" height="12" x="4" y="8" rx="2" />
    <path d="M2 14h2" />
    <path d="M20 14h2" />
    <path d="M15 13v2" />
    <path d="M9 13v2" />
  </svg>
);

const UserIcon = () => (
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
    <circle cx="12" cy="8" r="5" />
    <path d="M20 21a8 8 0 0 0-16 0" />
  </svg>
);

const ChevronRightIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="m9 18 6-6-6-6" />
  </svg>
);

const BuildingIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect width="16" height="20" x="4" y="2" rx="2" ry="2" />
    <path d="M9 22v-4h6v4" />
    <path d="M8 6h.01" />
    <path d="M16 6h.01" />
    <path d="M12 6h.01" />
    <path d="M12 10h.01" />
    <path d="M12 14h.01" />
    <path d="M16 10h.01" />
    <path d="M16 14h.01" />
    <path d="M8 10h.01" />
    <path d="M8 14h.01" />
  </svg>
);

const SparklesIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
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

// Suggested questions for quick access
const SUGGESTED_QUESTIONS = [
  "OK저축은행 신용대출 조건",
  "4대보험 없이 대출 가능한 곳",
  "프리랜서 대출 상품",
  "햇살론 신청 조건",
];

// Feedback icons
const ThumbsUpIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7 10v12" /><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z" />
  </svg>
);

const ThumbsDownIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 14V2" /><path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a3.13 3.13 0 0 1-3-3.88Z" />
  </svg>
);

const AlertIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="8" y2="12" /><line x1="12" x2="12.01" y1="16" y2="16" />
  </svg>
);

export function ChatPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedGuide, setSelectedGuide] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [feedbackSent, setFeedbackSent] = useState<Record<string, string>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const initialQueryProcessed = useRef(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const sendMessageWithText = useCallback(
    async (text: string) => {
      if (!text.trim() || loading) return;

      const userMessage: Message = {
        id: Date.now().toString(),
        role: "user",
        content: text.trim(),
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setInput("");
      setLoading(true);

      try {
        const data = await api.post<{
          response: string;
          guides?: GuideResult[];
          sessionId?: string;
          messageId?: string;
          quality?: { score: number; issueType: string };
        }>("/api/chat", { message: userMessage.content, sessionId });

        // 새 세션 ID가 반환되면 저장
        if (data.sessionId && !sessionId) {
          setSessionId(data.sessionId);
        }

        const assistantMessage: Message = {
          id: data.messageId || (Date.now() + 1).toString(),
          role: "assistant",
          content: data.response || "응답을 생성하지 못했습니다.",
          guides: data.guides,
          timestamp: new Date(),
          quality: data.quality,
        };

        setMessages((prev) => [...prev, assistantMessage]);
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: "assistant",
            content: "오류가 발생했습니다. 다시 시도해주세요.",
            timestamp: new Date(),
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [loading, sessionId]
  );

  // 피드백 제출 함수
  const submitFeedback = async (messageId: string, feedback: "helpful" | "not_helpful" | "wrong") => {
    if (feedbackSent[messageId]) return;

    try {
      await api.post("/api/chat/feedback", { messageId, feedback });
      setFeedbackSent((prev) => ({ ...prev, [messageId]: feedback }));
    } catch (error) {
      console.error("피드백 제출 실패:", error);
    }
  };

  // Handle query parameter from URL
  useEffect(() => {
    const query = searchParams.get("q");
    if (query && !initialQueryProcessed.current) {
      initialQueryProcessed.current = true;
      setSearchParams({});
      sendMessageWithText(query);
    }
  }, [searchParams, setSearchParams, sendMessageWithText]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessageWithText(input);
    }
  };

  const handleSuggestedQuestion = (question: string) => {
    sendMessageWithText(question);
  };

  const isEmptyState = messages.length === 0;

  return (
    <div className="flex h-[calc(100vh-56px)] flex-col bg-background">
      {/* Guide Detail Modal */}
      <GuideModal
        itemCd={selectedGuide}
        onClose={() => setSelectedGuide(null)}
      />

      {/* Decorative Background Glows */}
      {isEmptyState && (
        <div className="bg-glow-container">
          <div className="bg-glow-blob bg-glow-blob-1" />
          <div className="bg-glow-blob bg-glow-blob-2" />
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {isEmptyState ? (
          /* Empty State - Welcome Screen */
          <div className="flex h-full flex-col items-center justify-center px-5 sm:px-6">
            <div className="w-full max-w-2xl space-y-6 sm:space-y-8 slide-up">
              {/* Logo & Title */}
              <div className="text-center space-y-4 sm:space-y-6">
                <div className="logo-container inline-block">
                  <div className="logo-inner">
                    <SparklesIcon />
                    <div className="logo-glow" />
                    <div className="rotating-border" />
                  </div>
                </div>

                <div className="space-y-2">
                  <h1 className="text-2xl sm:text-4xl font-bold tracking-tight">
                    <span className="gradient-text">대출 가이드</span> 챗봇
                  </h1>
                  <p className="text-muted-foreground text-sm sm:text-base max-w-md mx-auto leading-relaxed px-4 opacity-80">
                    심사 조건부터 한도 조회까지,
                    <br className="sm:hidden" />
                    {" "}준비된 AI 어드바이저에게 물어보세요.
                  </p>
                </div>
              </div>

              {/* Suggested Questions */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent to-border/50" />
                  <span className="text-[10px] sm:text-xs font-semibold text-muted-foreground/60 uppercase tracking-[0.2em]">
                    Quick Start
                  </span>
                  <div className="h-px flex-1 bg-gradient-to-l from-transparent to-border/50" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {SUGGESTED_QUESTIONS.map((question, index) => (
                    <button
                      key={index}
                      onClick={() => handleSuggestedQuestion(question)}
                      className="linear-card group relative overflow-hidden p-4 text-left"
                    >
                      <div className="relative z-10 flex items-center justify-between">
                        <span className="text-sm font-medium text-foreground/80 group-hover:text-foreground transition-colors">
                          {question}
                        </span>
                        <div className="p-1 rounded-full bg-primary/0 group-hover:bg-primary/10 text-muted-foreground/0 group-hover:text-primary transition-all duration-300 transform translate-x-1 group-hover:translate-x-0">
                          <ChevronRightIcon />
                        </div>
                      </div>

                      {/* Subtle hover backlight */}
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Chat Messages */
          <div className="mx-auto max-w-3xl px-4 sm:px-6 py-5 sm:py-6 space-y-5 sm:space-y-6">
            {messages.map((msg, index) => (
              <div
                key={msg.id}
                className={`flex gap-3 fade-in ${msg.role === "user" ? "justify-end" : "justify-start"
                  }`}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {/* Avatar for Assistant */}
                {msg.role === "assistant" && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center">
                    <BotIcon />
                  </div>
                )}

                {/* Message Content */}
                <div
                  className={`max-w-[85%] ${msg.role === "user" ? "message-user" : "message-assistant"
                    } px-4 py-3`}
                >
                  <div className="whitespace-pre-wrap text-sm leading-relaxed">
                    {msg.content}
                  </div>

                  {/* Guide Cards */}
                  {msg.guides && msg.guides.length > 0 && (
                    <div className="mt-4 space-y-2">
                      {msg.guides.map((guide) => (
                        <button
                          key={guide.item_cd}
                          onClick={() => setSelectedGuide(guide.item_cd)}
                          className="w-full linear-card p-4 text-left group"
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                              <BuildingIcon />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-foreground">
                                  {guide.company}
                                </span>
                                <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                                  {guide.product_type}
                                </span>
                              </div>
                              <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                                {guide.summary}
                              </p>
                              <div className="mt-2 flex items-center gap-1 text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                                상세보기 <ChevronRightIcon />
                              </div>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Feedback Buttons for Assistant Messages */}
                  {msg.role === "assistant" && (
                    <div className="mt-3 pt-3 border-t border-border/30 flex items-center gap-2">
                      <span className="text-xs text-muted-foreground mr-1">도움이 되셨나요?</span>
                      <button
                        onClick={() => submitFeedback(msg.id, "helpful")}
                        disabled={!!feedbackSent[msg.id]}
                        className={`p-1.5 rounded-md transition-colors ${feedbackSent[msg.id] === "helpful"
                            ? "bg-green-500/20 text-green-500"
                            : feedbackSent[msg.id]
                              ? "opacity-30 cursor-not-allowed text-muted-foreground"
                              : "hover:bg-green-500/10 text-muted-foreground hover:text-green-500"
                          }`}
                        title="도움이 됐어요"
                      >
                        <ThumbsUpIcon />
                      </button>
                      <button
                        onClick={() => submitFeedback(msg.id, "not_helpful")}
                        disabled={!!feedbackSent[msg.id]}
                        className={`p-1.5 rounded-md transition-colors ${feedbackSent[msg.id] === "not_helpful"
                            ? "bg-yellow-500/20 text-yellow-500"
                            : feedbackSent[msg.id]
                              ? "opacity-30 cursor-not-allowed text-muted-foreground"
                              : "hover:bg-yellow-500/10 text-muted-foreground hover:text-yellow-500"
                          }`}
                        title="도움이 안 됐어요"
                      >
                        <ThumbsDownIcon />
                      </button>
                      <button
                        onClick={() => submitFeedback(msg.id, "wrong")}
                        disabled={!!feedbackSent[msg.id]}
                        className={`p-1.5 rounded-md transition-colors ${feedbackSent[msg.id] === "wrong"
                            ? "bg-red-500/20 text-red-500"
                            : feedbackSent[msg.id]
                              ? "opacity-30 cursor-not-allowed text-muted-foreground"
                              : "hover:bg-red-500/10 text-muted-foreground hover:text-red-500"
                          }`}
                        title="잘못된 정보예요"
                      >
                        <AlertIcon />
                      </button>
                      {msg.quality && msg.quality.score < 0.7 && (
                        <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/10 text-yellow-600">
                          {msg.quality.issueType === "off_topic" && "대출 외 질문"}
                          {msg.quality.issueType === "no_answer" && "정보 부족"}
                          {msg.quality.issueType === "low_confidence" && "낮은 신뢰도"}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Avatar for User */}
                {msg.role === "user" && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground">
                    <UserIcon />
                  </div>
                )}
              </div>
            ))}

            {/* Typing Indicator */}
            {loading && (
              <div className="flex gap-3 justify-start fade-in">
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center">
                  <BotIcon />
                </div>
                <div className="message-assistant px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <div className="typing-dot" />
                    <div className="typing-dot" />
                    <div className="typing-dot" />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="border-t border-border/50 bg-background/80 backdrop-blur-xl px-4 py-3 sm:p-4">
        <div className="mx-auto max-w-3xl">
          <div className="relative flex items-center gap-2">
            <div className="relative flex-1">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="대출 조건을 물어보세요..."
                className="linear-input w-full pr-4 text-base sm:pr-12"
                disabled={loading}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground/50 hidden sm:block">
                ⏎ 전송
              </div>
            </div>
            <button
              onClick={() => sendMessageWithText(input)}
              disabled={loading || !input.trim()}
              className="linear-btn-primary h-[46px] px-4 sm:px-5 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <SendIcon />
              <span className="hidden sm:inline">전송</span>
            </button>
          </div>
          <p className="mt-2 text-center text-[11px] sm:text-xs text-muted-foreground/60 leading-relaxed">
            AI가 생성한 정보는 참고용이며,
            <br className="sm:hidden" />
            {" "}정확한 조건은 금융사에 확인하세요.
          </p>
        </div>
      </div>
    </div>
  );
}
