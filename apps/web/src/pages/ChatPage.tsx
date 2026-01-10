import { useState, useRef, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { GuideModal } from "../components/GuideModal";
import { api } from "../lib/api";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  guides?: GuideResult[];
}

interface GuideResult {
  item_cd: string;
  company: string;
  product_type: string;
  relevance: number;
  summary: string;
}

export function ChatPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "안녕하세요! 대출 가이드 챗봇입니다.\n\n금융사명, 상품유형, 조건 등을 질문해주세요.\n\n예시:\n- \"OK저축은행 신용대출 조건\"\n- \"4대가입 햇살론\"\n- \"프리랜서 대출 가능한 곳\"",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedGuide, setSelectedGuide] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const initialQueryProcessed = useRef(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessageWithText = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const data = await api.post<{ response: string; guides?: GuideResult[] }>(
        "/api/chat",
        { message: userMessage.content }
      );

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.response || "응답을 생성하지 못했습니다.",
        guides: data.guides,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "오류가 발생했습니다. 다시 시도해주세요.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, [loading]);

  // Handle query parameter from URL
  useEffect(() => {
    const query = searchParams.get("q");
    if (query && !initialQueryProcessed.current) {
      initialQueryProcessed.current = true;
      setSearchParams({});
      sendMessageWithText(query);
    }
  }, [searchParams, setSearchParams, sendMessageWithText]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const data = await api.post<{ response: string; guides?: GuideResult[] }>(
        "/api/chat",
        { message: userMessage.content }
      );

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.response || "응답을 생성하지 못했습니다.",
        guides: data.guides,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "오류가 발생했습니다. 다시 시도해주세요.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex h-[calc(100vh-56px)] flex-col bg-background">
      {/* Guide Detail Modal */}
      <GuideModal
        itemCd={selectedGuide}
        onClose={() => setSelectedGuide(null)}
      />

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="mx-auto max-w-3xl space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-2 ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.content}</div>

                {/* Guide Cards */}
                {msg.guides && msg.guides.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {msg.guides.map((guide) => (
                      <button
                        key={guide.item_cd}
                        onClick={() => setSelectedGuide(guide.item_cd)}
                        className="w-full rounded border bg-background p-3 text-left text-sm transition-colors hover:border-primary hover:bg-primary/5"
                      >
                        <div className="font-medium">
                          {guide.company} - {guide.product_type}
                        </div>
                        <div className="mt-1 text-muted-foreground line-clamp-2">
                          {guide.summary}
                        </div>
                        <div className="mt-2 text-xs text-primary">
                          클릭하여 상세보기 →
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="rounded-lg bg-muted px-4 py-2">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 animate-bounce rounded-full bg-foreground/50" />
                  <div
                    className="h-2 w-2 animate-bounce rounded-full bg-foreground/50"
                    style={{ animationDelay: "0.1s" }}
                  />
                  <div
                    className="h-2 w-2 animate-bounce rounded-full bg-foreground/50"
                    style={{ animationDelay: "0.2s" }}
                  />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="border-t p-4">
        <div className="mx-auto max-w-3xl">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="대출 조건을 물어보세요..."
              className="flex-1 rounded-lg border bg-background px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
              disabled={loading}
            />
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              className="rounded-lg bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              전송
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
