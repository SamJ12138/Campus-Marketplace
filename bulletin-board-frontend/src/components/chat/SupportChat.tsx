"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  MessageCircle,
  X,
  Send,
  AlertTriangle,
  ExternalLink,
  ChevronDown,
  Mail,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import {
  processMessage,
  isRateLimited,
  recordMessage,
  QUICK_ACTIONS,
  type ChatResponse,
  type ChatSource,
} from "./chatbot-engine";

// ─── Types ───────────────────────────────────────────────────────
interface ChatMessage {
  id: string;
  sender: "user" | "bot";
  text: string;
  timestamp: Date;
  sources?: ChatSource[];
  escalation?: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────
function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatBotText(text: string): string {
  let formatted = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  formatted = formatted.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  formatted = formatted.replace(/(\d+)\)\s/g, "<br/>$1. ");
  formatted = formatted.replace(/\n- /g, "<br/>&bull; ");
  formatted = formatted.replace(/^- /g, "&bull; ");
  formatted = formatted.replace(/\n/g, "<br/>");
  return formatted;
}

let msgIdCounter = 0;
function nextId(): string {
  return `msg_${++msgIdCounter}`;
}

// ─── Component ───────────────────────────────────────────────────
export function SupportChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showRateLimit, setShowRateLimit] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Escape key closes chat
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const toggleChat = useCallback(() => {
    setIsOpen((prev) => !prev);
    setShowTooltip(false);
  }, []);

  const addBotResponse = useCallback((data: ChatResponse) => {
    const botMessage: ChatMessage = {
      id: nextId(),
      sender: "bot",
      text: data.replyText,
      timestamp: new Date(),
      sources: data.sources,
      escalation: data.escalation,
    };
    setMessages((prev) => [...prev, botMessage]);
    setIsTyping(false);
  }, []);

  const sendMessage = useCallback(
    (text?: string) => {
      const messageText = (text ?? inputValue).trim();
      if (!messageText || isTyping) return;

      if (isRateLimited()) {
        setShowRateLimit(true);
        setTimeout(() => setShowRateLimit(false), 8000);
        return;
      }

      recordMessage();

      const userMessage: ChatMessage = {
        id: nextId(),
        sender: "user",
        text: messageText,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setInputValue("");
      setIsTyping(true);

      // Process with a natural delay
      const delay = 300 + Math.random() * 500;
      setTimeout(() => {
        const response = processMessage(messageText);
        addBotResponse(response);
      }, delay);
    },
    [inputValue, isTyping, addBotResponse],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    },
    [sendMessage],
  );

  const handleQuickAction = useCallback(
    (question: string) => {
      sendMessage(question);
    },
    [sendMessage],
  );

  return (
    <div className="fixed bottom-6 right-6 z-50 md:bottom-6 md:right-6 max-md:bottom-20 max-md:right-4">
      {/* ─── Toggle Button ─── */}
      <button
        onClick={toggleChat}
        onMouseEnter={() => !isOpen && setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        aria-label={isOpen ? "Close help chat" : "Open help chat"}
        className={cn(
          "relative flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-all duration-300",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          isOpen
            ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
            : "bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-xl hover:shadow-primary/25 hover:scale-105",
        )}
      >
        {isOpen ? (
          <X className="h-5 w-5" />
        ) : (
          <MessageCircle className="h-5 w-5" />
        )}

        {/* Tooltip */}
        {showTooltip && !isOpen && (
          <span className="pointer-events-none absolute right-16 whitespace-nowrap rounded-lg bg-card px-3 py-2 text-sm font-medium text-foreground shadow-lg border border-border animate-fade-in">
            Need help?
          </span>
        )}
      </button>

      {/* ─── Chat Panel ─── */}
      <div
        ref={panelRef}
        role="dialog"
        aria-label="Support chat"
        className={cn(
          "absolute bottom-16 right-0 flex w-[380px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl",
          "transition-all duration-300 origin-bottom-right",
          isOpen
            ? "opacity-100 scale-100 translate-y-0"
            : "pointer-events-none opacity-0 scale-95 translate-y-4",
          // Height
          "h-[520px] max-h-[calc(100vh-8rem)]",
          // Mobile adjustments
          "max-md:w-[calc(100vw-2rem)] max-md:h-[calc(100vh-10rem)]",
        )}
      >
        {/* ─── Header ─── */}
        <div className="relative flex items-center gap-3 bg-gradient-to-r from-primary to-primary/80 px-4 py-4 text-primary-foreground">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm">
            <Image src="/images/logo-v2.png" alt="GimmeDat" width={20} height={20} className="h-5 w-5 object-contain" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold">Help Center</h3>
            <p className="text-xs opacity-80">
              We can answer general questions
            </p>
          </div>
          <button
            onClick={toggleChat}
            aria-label="Close chat"
            className="rounded-lg p-1.5 transition-colors hover:bg-white/15"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ─── Emergency Banner ─── */}
        <div className="flex items-start gap-2.5 border-b border-border bg-amber-50/80 px-4 py-2.5 dark:bg-amber-900/10">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600 dark:text-amber-400" />
          <div className="text-[11px] leading-relaxed">
            <span className="font-bold text-amber-700 dark:text-amber-400">
              Emergency?
            </span>{" "}
            <a
              href="tel:7173376911"
              className="font-semibold text-amber-700 underline decoration-amber-400/50 hover:decoration-amber-600 dark:text-amber-300"
            >
              Campus Safety: (717) 337-6911
            </a>
            <span className="text-amber-600/80 dark:text-amber-400/60">
              {" "}
              |{" "}
            </span>
            <a
              href="tel:911"
              className="font-semibold text-amber-700 underline decoration-amber-400/50 hover:decoration-amber-600 dark:text-amber-300"
            >
              911
            </a>
          </div>
        </div>

        {/* ─── Messages Area ─── */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-muted/30">
          {/* Welcome message (show when no messages) */}
          {messages.length === 0 && (
            <div className="animate-fade-in space-y-3">
              <div className="rounded-xl bg-card p-4 shadow-sm border border-border">
                <h4 className="text-sm font-bold text-foreground">
                  Welcome to GimmeDat Support
                </h4>
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                  I can help with questions about posting offers, browsing the
                  marketplace, safety, privacy, account issues, and more. Try a
                  quick question below or type your own!
                </p>
                <p className="mt-2 rounded-lg bg-muted px-3 py-2 text-[11px] text-muted-foreground">
                  Note: This is a campus marketplace. We don&apos;t process
                  payments or handle deliveries. All transactions happen directly
                  between users.
                </p>
              </div>

              {/* Quick Actions */}
              <div className="flex flex-wrap gap-1.5">
                {QUICK_ACTIONS.map((action) => (
                  <button
                    key={action.label}
                    onClick={() => handleQuickAction(action.question)}
                    className={cn(
                      "rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5 text-[11px] font-medium text-primary",
                      "transition-all duration-200 hover:bg-primary hover:text-primary-foreground hover:border-primary hover:shadow-sm",
                    )}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Message bubbles */}
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "flex flex-col gap-1 animate-slide-up",
                msg.sender === "user" ? "items-end" : "items-start",
              )}
            >
              <div
                className={cn(
                  "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                  msg.sender === "user"
                    ? "bg-primary text-primary-foreground rounded-br-md"
                    : "bg-card text-foreground shadow-sm border border-border rounded-bl-md",
                )}
              >
                {msg.sender === "user" ? (
                  msg.text
                ) : (
                  <div
                    dangerouslySetInnerHTML={{
                      __html: formatBotText(msg.text),
                    }}
                  />
                )}

                {/* Sources */}
                {msg.sources && msg.sources.length > 0 && (
                  <div className="mt-2 border-t border-border/50 pt-2">
                    <p className="mb-1.5 text-[10px] font-semibold text-muted-foreground">
                      Sources:
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {msg.sources.map((source, i) => (
                        <Link
                          key={i}
                          href={source.url}
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-medium text-primary",
                            "transition-all duration-200 hover:bg-primary hover:text-primary-foreground",
                          )}
                        >
                          {source.title}
                          <ExternalLink className="h-2.5 w-2.5" />
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Escalation notice */}
              {msg.escalation && (
                <div className="max-w-[85%] mt-1 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-500/20 dark:bg-amber-900/10">
                  <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-400">
                    Need more help?
                  </p>
                  <a
                    href="mailto:support@gimme-dat.com"
                    className="mt-1 inline-flex items-center gap-1.5 rounded-md bg-amber-100 px-2.5 py-1.5 text-[11px] font-medium text-amber-800 transition-colors hover:bg-amber-200 dark:bg-amber-800/30 dark:text-amber-300 dark:hover:bg-amber-800/50"
                  >
                    <Mail className="h-3 w-3" />
                    Email us at support@gimme-dat.com
                  </a>
                </div>
              )}

              <span className="px-1 text-[10px] text-muted-foreground">
                {formatTime(msg.timestamp)}
              </span>
            </div>
          ))}

          {/* Typing indicator */}
          {isTyping && (
            <div className="flex items-start animate-fade-in">
              <div className="flex items-center gap-1 rounded-2xl rounded-bl-md bg-card px-4 py-3 shadow-sm border border-border">
                <span className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-typing-bounce" />
                <span className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-typing-bounce [animation-delay:0.2s]" />
                <span className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-typing-bounce [animation-delay:0.4s]" />
              </div>
            </div>
          )}

          {/* Rate limit notice */}
          {showRateLimit && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700 dark:border-blue-500/20 dark:bg-blue-900/10 dark:text-blue-300 animate-fade-in">
              You&apos;re sending messages too quickly. Please wait a moment.
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* ─── Input Area ─── */}
        <div className="flex items-end gap-2.5 border-t border-border bg-card px-4 py-3">
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your question..."
            rows={1}
            aria-label="Type your message"
            className={cn(
              "flex-1 resize-none rounded-xl border border-border bg-muted/50 px-3.5 py-2.5 text-sm",
              "transition-all duration-200 placeholder:text-muted-foreground",
              "hover:border-primary/30 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20",
              "max-h-[100px]",
            )}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = "auto";
              target.style.height = Math.min(target.scrollHeight, 100) + "px";
            }}
          />
          <button
            onClick={() => sendMessage()}
            disabled={!inputValue.trim() || isTyping}
            aria-label="Send message"
            className={cn(
              "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full transition-all duration-200",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              inputValue.trim() && !isTyping
                ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-md hover:shadow-primary/20 hover:scale-105"
                : "bg-muted text-muted-foreground cursor-not-allowed",
            )}
          >
            <Send className="h-4 w-4" />
          </button>
        </div>

        {/* ─── Footer ─── */}
        <div className="border-t border-border bg-muted/30 px-4 py-2 text-center">
          <p className="text-[10px] text-muted-foreground">
            <a
              href="mailto:support@gimme-dat.com"
              className="font-medium text-primary hover:underline"
            >
              Email Support
            </a>
            {" | "}
            <Link
              href="/how-it-works"
              className="text-primary hover:underline"
            >
              How It Works
            </Link>
            {" | "}
            <Link href="/terms" className="text-primary hover:underline">
              Terms
            </Link>
            {" | "}
            <Link href="/privacy" className="text-primary hover:underline">
              Privacy
            </Link>
          </p>
        </div>
      </div>

      {/* Scroll-down indicator when chat has many messages */}
      {isOpen && messages.length > 5 && (
        <button
          onClick={() =>
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
          }
          className="absolute bottom-[5.5rem] right-4 flex h-7 w-7 items-center justify-center rounded-full bg-card shadow-md border border-border text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Scroll to bottom"
        >
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
