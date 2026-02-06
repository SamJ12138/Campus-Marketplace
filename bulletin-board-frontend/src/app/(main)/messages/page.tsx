"use client";

import {
  Suspense,
  useMemo,
  useState,
  useCallback,
  useEffect,
  useRef,
  type FormEvent,
} from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  MessageSquare,
  Loader2,
  Send,
  ArrowLeft,
  ChevronDown,
  CheckCheck,
  Check,
  ExternalLink,
  Search,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { en as t } from "@/lib/i18n/en";
import {
  useThreads,
  useThread,
  useStartThread,
  useSendMessage,
  useMarkRead,
} from "@/lib/hooks/use-messages";
import { useListing } from "@/lib/hooks/use-listings";
import type { MessageThread, Message } from "@/lib/types";
import { ProtectedPage } from "@/components/auth/ProtectedPage";

// ─── Utilities ──────────────────────────────────────────────

function formatTimeAgo(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60_000);
  const diffHr = Math.floor(diffMs / 3_600_000);
  const diffDay = Math.floor(diffMs / 86_400_000);

  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m`;
  if (diffHr < 24) return `${diffHr}h`;
  if (diffDay < 7) return `${diffDay}d`;
  return new Date(dateStr).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDateHeader(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === now.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";

  return date.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen).trimEnd() + "\u2026";
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

/** Group consecutive messages from the same sender within 2 min */
interface MessageGroup {
  senderId: string;
  isOwn: boolean;
  messages: Message[];
}

function groupMessages(
  messages: Message[],
): { date: string; groups: MessageGroup[] }[] {
  const dateMap = new Map<string, Message[]>();
  for (const msg of messages) {
    const dateKey = new Date(msg.created_at).toDateString();
    const existing = dateMap.get(dateKey);
    if (existing) existing.push(msg);
    else dateMap.set(dateKey, [msg]);
  }

  return Array.from(dateMap.entries()).map(([dateKey, msgs]) => {
    const groups: MessageGroup[] = [];
    for (const msg of msgs) {
      const last = groups[groups.length - 1];
      const timeDiff = last
        ? new Date(msg.created_at).getTime() -
          new Date(
            last.messages[last.messages.length - 1].created_at,
          ).getTime()
        : Infinity;

      if (last && last.senderId === msg.sender_id && timeDiff < 120_000) {
        last.messages.push(msg);
      } else {
        groups.push({
          senderId: msg.sender_id,
          isOwn: msg.is_own,
          messages: [msg],
        });
      }
    }
    return { date: dateKey, groups };
  });
}

// ─── Avatar Component ───────────────────────────────────────

function UserAvatar({
  url,
  name,
  size = 40,
  className,
}: {
  url: string | null;
  name: string;
  size?: number;
  className?: string;
}) {
  const sizeClass =
    size <= 32
      ? "h-8 w-8"
      : size <= 40
        ? "h-10 w-10"
        : size <= 44
          ? "h-11 w-11"
          : "h-12 w-12";
  const textSize = size <= 32 ? "text-xs" : size <= 40 ? "text-sm" : "text-base";

  if (url) {
    return (
      <Image
        src={url}
        alt={name}
        width={size}
        height={size}
        className={cn(sizeClass, "rounded-lg object-cover", className)}
        unoptimized={url.includes("r2.dev") || url.includes("cloudflare")}
      />
    );
  }

  return (
    <div
      className={cn(
        sizeClass,
        "flex items-center justify-center rounded-lg bg-primary/10 font-semibold text-primary",
        textSize,
        className,
      )}
    >
      {getInitials(name)}
    </div>
  );
}

// ─── Thread List Skeleton ───────────────────────────────────

function ThreadSkeleton() {
  return (
    <div className="flex items-center gap-3 px-4 py-3 animate-pulse">
      <div className="h-12 w-12 shrink-0 rounded-lg bg-muted" />
      <div className="flex-1 space-y-2">
        <div className="h-3.5 w-32 rounded bg-muted" />
        <div className="h-3 w-48 rounded bg-muted" />
      </div>
      <div className="h-3 w-8 rounded bg-muted" />
    </div>
  );
}

// ─── Contact Row (WeChat-style) ─────────────────────────────

function ContactRow({
  thread,
  isActive,
  onClick,
}: {
  thread: MessageThread;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors",
        isActive
          ? "bg-accent"
          : "hover:bg-accent/50",
        thread.unread_count > 0 && !isActive && "bg-accent/30",
      )}
    >
      {/* Avatar (WeChat uses square-ish rounded avatars) */}
      <div className="relative shrink-0">
        <UserAvatar
          url={thread.other_user.avatar_url}
          name={thread.other_user.display_name}
          size={48}
          className="h-12 w-12"
        />
        {/* Unread badge on avatar */}
        {thread.unread_count > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white">
            {thread.unread_count > 99 ? "99+" : thread.unread_count}
          </span>
        )}
      </div>

      {/* Name + last message preview */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span
            className={cn(
              "text-sm truncate",
              thread.unread_count > 0 ? "font-semibold" : "font-medium",
            )}
          >
            {thread.other_user.display_name}
          </span>
          <span className="text-[11px] text-muted-foreground shrink-0">
            {formatTimeAgo(thread.last_message_at)}
          </span>
        </div>
        <p
          className={cn(
            "text-[13px] truncate mt-0.5",
            thread.unread_count > 0
              ? "text-foreground"
              : "text-muted-foreground",
          )}
        >
          {thread.last_message_preview
            ? truncate(thread.last_message_preview, 40)
            : "No messages yet"}
        </p>
      </div>
    </button>
  );
}

// ─── Contacts Panel (left side) ─────────────────────────────

function ContactsPanel({
  activeThreadId,
  onSelectThread,
}: {
  activeThreadId: string | null;
  onSelectThread: (id: string) => void;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const {
    data,
    isLoading,
    isError,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useThreads();

  const threads = useMemo(() => {
    if (!data?.pages) return [];
    return data.pages.flatMap((page) => page.items);
  }, [data]);

  const filteredThreads = useMemo(() => {
    if (!searchQuery.trim()) return threads;
    const q = searchQuery.toLowerCase();
    return threads.filter(
      (thread) =>
        thread.other_user.display_name.toLowerCase().includes(q) ||
        thread.listing?.title.toLowerCase().includes(q) ||
        thread.last_message_preview?.toLowerCase().includes(q),
    );
  }, [threads, searchQuery]);

  return (
    <div className="flex h-full flex-col">
      {/* Search bar */}
      <div className="shrink-0 px-3 py-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search"
            className={cn(
              "flex h-8 w-full rounded-md border-0 bg-muted/70 pl-9 pr-3 text-sm",
              "placeholder:text-muted-foreground",
              "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
            )}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-muted"
            >
              <X className="h-3 w-3 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>

      {/* Contact list */}
      <div className="flex-1 overflow-y-auto">
        {isLoading && (
          <>
            {Array.from({ length: 6 }).map((_, i) => (
              <ThreadSkeleton key={i} />
            ))}
          </>
        )}

        {isError && (
          <div className="flex flex-col items-center gap-2 py-16 text-center px-4">
            <p className="text-sm text-destructive">{t.common.error}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="text-sm text-primary hover:underline"
            >
              {t.common.retry}
            </button>
          </div>
        )}

        {!isLoading && !isError && filteredThreads.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-16 text-center px-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
              <MessageSquare className="h-7 w-7 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                {searchQuery ? "No results" : "No messages yet"}
              </p>
              {!searchQuery && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Message a seller on any listing to start a conversation.
                </p>
              )}
            </div>
          </div>
        )}

        {filteredThreads.length > 0 &&
          filteredThreads.map((thread) => (
            <ContactRow
              key={thread.id}
              thread={thread}
              isActive={thread.id === activeThreadId}
              onClick={() => onSelectThread(thread.id)}
            />
          ))}

        {hasNextPage && (
          <div className="p-3 text-center">
            <button
              type="button"
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
              className="inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent disabled:opacity-50"
            >
              {isFetchingNextPage ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                "Load more"
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Listing Context Card ───────────────────────────────────

function ListingContextCard({
  listing,
}: {
  listing: { id: string; title: string; first_photo_url: string | null };
}) {
  return (
    <Link
      href={`/listings/${listing.id}`}
      className="flex items-center gap-3 rounded-lg border border-border bg-background px-3 py-2 transition-colors hover:bg-accent/50"
    >
      {listing.first_photo_url && (
        <Image
          src={listing.first_photo_url}
          alt=""
          width={40}
          height={40}
          className="h-10 w-10 rounded-md object-cover shrink-0"
          unoptimized
        />
      )}
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">About this listing</p>
        <p className="text-sm font-medium truncate">{listing.title}</p>
      </div>
      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
    </Link>
  );
}

// ─── Quick Reply Suggestions ────────────────────────────────

const QUICK_REPLIES_BUYER = [
  "Is this still available?",
  "What\u2019s the lowest you\u2019ll go?",
  "Can I pick it up today?",
  "Where should we meet?",
];

const QUICK_REPLIES_SELLER = [
  "Yes, still available!",
  "When can you pick up?",
  "I can meet on campus.",
  "Let me know if interested!",
];

function QuickReplies({
  onSelect,
  messageCount,
}: {
  onSelect: (text: string) => void;
  messageCount: number;
}) {
  if (messageCount > 4) return null;

  const replies = messageCount === 0 ? QUICK_REPLIES_BUYER : QUICK_REPLIES_SELLER;

  return (
    <div className="flex gap-1.5 overflow-x-auto px-4 py-2 scrollbar-hide">
      {replies.map((reply) => (
        <button
          key={reply}
          type="button"
          onClick={() => onSelect(reply)}
          className="shrink-0 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        >
          {reply}
        </button>
      ))}
    </div>
  );
}

// ─── Message Bubble (WeChat-style) ──────────────────────────

function MessageBubble({
  message,
  isOwn,
  isFirst,
  isLast,
  showAvatar,
  avatarUrl,
  senderName,
}: {
  message: Message;
  isOwn: boolean;
  isFirst: boolean;
  isLast: boolean;
  showAvatar: boolean;
  avatarUrl: string | null;
  senderName: string;
}) {
  return (
    <div
      className={cn(
        "flex gap-2 px-4",
        isOwn ? "flex-row-reverse" : "flex-row",
        isFirst ? "mt-3" : "mt-0.5",
      )}
    >
      {/* Avatar column — only show on first message of group */}
      <div className="w-8 shrink-0">
        {showAvatar && (
          <UserAvatar
            url={avatarUrl}
            name={senderName}
            size={32}
            className="h-8 w-8"
          />
        )}
      </div>

      {/* Bubble */}
      <div
        className={cn(
          "flex flex-col max-w-[65%]",
          isOwn ? "items-end" : "items-start",
        )}
      >
        <div
          className={cn(
            "px-3 py-2 text-sm leading-relaxed break-words",
            isOwn
              ? "bg-primary text-primary-foreground rounded-2xl rounded-tr-md"
              : "bg-background text-foreground border border-border/50 rounded-2xl rounded-tl-md",
          )}
        >
          {message.content}
        </div>

        {/* Timestamp + read receipt on last message in group */}
        {isLast && (
          <div className="flex items-center gap-1 px-1 mt-0.5">
            <span className="text-[10px] text-muted-foreground">
              {formatTime(message.created_at)}
            </span>
            {isOwn &&
              (message.is_read ? (
                <CheckCheck className="h-3 w-3 text-primary" />
              ) : (
                <Check className="h-3 w-3 text-muted-foreground" />
              ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Chat Panel (right side — WeChat-style) ─────────────────

function ChatPanel({
  threadId,
  onBack,
  composeListingId,
  onComposeComplete,
}: {
  threadId: string | null;
  onBack: () => void;
  composeListingId: string | null;
  onComposeComplete: (newThreadId: string) => void;
}) {
  const { data, isLoading } = useThread(threadId ?? undefined);
  const sendMutation = useSendMessage();
  const markReadMutation = useMarkRead();
  const startThread = useStartThread();
  const { data: composeListing } = useListing(composeListingId ?? undefined);

  const [messageText, setMessageText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const hasMarkedRead = useRef(false);
  const [showScrollButton, setShowScrollButton] = useState(false);

  const thread = data?.thread;
  const messages = useMemo(() => data?.messages?.items ?? [], [data]);
  const grouped = useMemo(() => groupMessages(messages), [messages]);

  // Track scroll position for scroll-to-bottom button
  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const threshold = 100;
    const isNearBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight <
      threshold;
    setShowScrollButton(!isNearBottom);
  }, []);

  // Auto-scroll on new messages (only if near bottom)
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const threshold = 150;
    const isNearBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight <
      threshold;
    if (isNearBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages.length]);

  // Scroll to bottom on thread change
  useEffect(() => {
    hasMarkedRead.current = false;
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "instant" });
    }, 50);
  }, [threadId]);

  // Mark as read
  useEffect(() => {
    if (
      threadId &&
      thread &&
      thread.unread_count > 0 &&
      !hasMarkedRead.current
    ) {
      markReadMutation.mutate(threadId, {
        onSuccess: () => {
          hasMarkedRead.current = true;
        },
      });
    }
  }, [threadId, thread, markReadMutation]);

  // Auto-resize textarea
  const adjustTextarea = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 120) + "px";
  }, []);

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  function handleSend(e?: FormEvent) {
    e?.preventDefault();
    const trimmed = messageText.trim();
    if (!trimmed) return;

    // New conversation flow
    if (!threadId && composeListingId) {
      startThread
        .mutateAsync({
          listing_id: composeListingId,
          content: trimmed,
        })
        .then((result) => {
          setMessageText("");
          if (textareaRef.current) {
            textareaRef.current.style.height = "auto";
          }
          onComposeComplete(result.thread.id);
        })
        .catch(() => {
          // Error toast handled by hook
        });
      return;
    }

    if (!threadId || sendMutation.isPending) return;

    sendMutation.mutate(
      { threadId, content: trimmed },
      {
        onSuccess: () => {
          setMessageText("");
          if (textareaRef.current) {
            textareaRef.current.style.height = "auto";
          }
        },
      },
    );
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const otherUser = thread?.other_user;
  const isPending = sendMutation.isPending || startThread.isPending;
  const isComposing = !threadId && composeListingId;

  // ─── Empty state — no thread selected (WeChat blank right panel) ───
  if (!threadId && !composeListingId) {
    return (
      <div className="flex h-full flex-col items-center justify-center bg-muted/30">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted mb-4">
          <MessageSquare className="h-10 w-10 text-muted-foreground/50" />
        </div>
        <p className="text-sm text-muted-foreground">
          Select a conversation to start chatting
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Chat header with contact info */}
      <div className="flex items-center gap-3 border-b border-border bg-background px-4 py-2.5 shrink-0">
        {/* Back button (mobile) */}
        <button
          type="button"
          onClick={onBack}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-accent transition-colors lg:hidden"
          aria-label="Back to conversations"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>

        {otherUser && (
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">
              {otherUser.display_name}
            </p>
            {thread?.listing && (
              <Link
                href={`/listings/${thread.listing.id}`}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                <span className="truncate">{thread.listing.title}</span>
                <ExternalLink className="h-2.5 w-2.5 shrink-0" />
              </Link>
            )}
          </div>
        )}

        {isComposing && composeListing && (
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">New message</p>
            <p className="text-xs text-muted-foreground truncate">
              Re: {composeListing.title}
            </p>
          </div>
        )}
      </div>

      {/* Listing context (pinned below header) */}
      {thread?.listing && (
        <div className="shrink-0 px-4 py-2 bg-background border-b border-border/50">
          <ListingContextCard listing={thread.listing} />
        </div>
      )}
      {isComposing && composeListing && (
        <div className="shrink-0 px-4 py-2 bg-background border-b border-border/50">
          <ListingContextCard
            listing={{
              id: composeListing.id,
              title: composeListing.title,
              first_photo_url:
                composeListing.photos?.[0]?.thumbnail_url ||
                composeListing.photos?.[0]?.url ||
                null,
            }}
          />
        </div>
      )}

      {/* Messages area — WeChat uses a light gray background */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="relative flex-1 overflow-y-auto bg-muted/30 py-2"
      >
        {isLoading && (
          <div className="flex flex-col gap-4 px-4 py-4 animate-pulse">
            <div className="flex gap-2">
              <div className="h-8 w-8 rounded-lg bg-muted shrink-0" />
              <div className="h-10 w-48 rounded-2xl bg-muted" />
            </div>
            <div className="flex gap-2 flex-row-reverse">
              <div className="h-8 w-8 rounded-lg bg-muted shrink-0" />
              <div className="h-10 w-36 rounded-2xl bg-muted" />
            </div>
            <div className="flex gap-2">
              <div className="h-8 w-8 rounded-lg bg-muted shrink-0" />
              <div className="h-10 w-56 rounded-2xl bg-muted" />
            </div>
          </div>
        )}

        {!isLoading && messages.length === 0 && !isComposing && (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <p className="text-sm text-muted-foreground">
              {t.messages.threadEmpty}
            </p>
          </div>
        )}

        {isComposing && messages.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <p className="text-sm text-muted-foreground">
              Write your first message below to start the conversation.
            </p>
          </div>
        )}

        {!isLoading && grouped.length > 0 && (
          <div className="flex flex-col">
            {grouped.map(({ date, groups }) => (
              <div key={date}>
                {/* Date separator */}
                <div className="flex items-center justify-center py-3">
                  <span className="rounded-md bg-muted/80 px-2.5 py-0.5 text-[11px] text-muted-foreground">
                    {formatDateHeader(groups[0].messages[0].created_at)}
                  </span>
                </div>

                {/* Message groups */}
                {groups.map((group, gi) => (
                  <div key={`${date}-${gi}`}>
                    {group.messages.map((msg, mi) => (
                      <MessageBubble
                        key={msg.id}
                        message={msg}
                        isOwn={group.isOwn}
                        isFirst={mi === 0}
                        isLast={mi === group.messages.length - 1}
                        showAvatar={mi === 0}
                        avatarUrl={
                          group.isOwn
                            ? null
                            : otherUser?.avatar_url ?? null
                        }
                        senderName={msg.sender_name}
                      />
                    ))}
                  </div>
                ))}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}

        {/* Scroll to bottom FAB */}
        {showScrollButton && (
          <button
            type="button"
            onClick={scrollToBottom}
            className="sticky bottom-2 left-1/2 -translate-x-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-background border border-border shadow-md hover:bg-accent transition-colors z-10"
            aria-label="Scroll to bottom"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Quick replies */}
      <QuickReplies
        onSelect={(text) => {
          setMessageText(text);
          textareaRef.current?.focus();
        }}
        messageCount={messages.length}
      />

      {/* Input bar — WeChat style with white background */}
      <div className="shrink-0 border-t border-border bg-background px-4 py-3">
        <form onSubmit={handleSend} className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={messageText}
            onChange={(e) => {
              setMessageText(e.target.value);
              adjustTextarea();
            }}
            onKeyDown={handleKeyDown}
            placeholder={t.messages.placeholder}
            disabled={isPending}
            rows={1}
            className={cn(
              "flex-1 resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm leading-relaxed",
              "placeholder:text-muted-foreground",
              "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
              "disabled:cursor-not-allowed disabled:opacity-50",
              "max-h-[120px]",
            )}
          />
          <button
            type="submit"
            disabled={isPending || !messageText.trim()}
            className={cn(
              "inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary shrink-0",
              "text-primary-foreground",
              "hover:bg-primary/90 transition-all",
              "disabled:opacity-40 disabled:pointer-events-none",
            )}
            aria-label="Send message"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────

function MessagesPageContent() {
  const searchParams = useSearchParams();

  const threadParam = searchParams.get("thread");
  const listingParam = searchParams.get("listing");

  const [activeThreadId, setActiveThreadId] = useState<string | null>(
    threadParam,
  );
  const [composeListingId, setComposeListingId] = useState<string | null>(
    listingParam,
  );
  const [mobileView, setMobileView] = useState<"list" | "conversation">(
    threadParam || listingParam ? "conversation" : "list",
  );

  // Sync URL params
  useEffect(() => {
    if (threadParam && threadParam !== activeThreadId) {
      setActiveThreadId(threadParam);
      setMobileView("conversation");
    }
  }, [threadParam]);

  useEffect(() => {
    if (listingParam && listingParam !== composeListingId) {
      setComposeListingId(listingParam);
      setActiveThreadId(null);
      setMobileView("conversation");
    }
  }, [listingParam]);

  function handleSelectThread(id: string) {
    setActiveThreadId(id);
    setComposeListingId(null);
    setMobileView("conversation");
    window.history.replaceState(null, "", `/messages?thread=${id}`);
  }

  function handleBack() {
    setActiveThreadId(null);
    setComposeListingId(null);
    setMobileView("list");
    window.history.replaceState(null, "", "/messages");
  }

  function handleComposeComplete(newThreadId: string) {
    setActiveThreadId(newThreadId);
    setComposeListingId(null);
    window.history.replaceState(null, "", `/messages?thread=${newThreadId}`);
  }

  return (
    <div className="mx-auto h-[calc(100vh-4rem)] max-w-5xl">
      <div className="flex h-full overflow-hidden rounded-lg border border-border">
        {/* Contacts panel (left) */}
        <div
          className={cn(
            "h-full border-r border-border bg-background",
            // Desktop: fixed width sidebar
            "lg:block lg:w-72 xl:w-80 lg:shrink-0",
            // Mobile: full width or hidden
            mobileView === "list" ? "w-full" : "hidden lg:block",
          )}
        >
          <ContactsPanel
            activeThreadId={activeThreadId}
            onSelectThread={handleSelectThread}
          />
        </div>

        {/* Chat panel (right) — only shows content after clicking a contact */}
        <div
          className={cn(
            "h-full flex-1",
            mobileView === "conversation" ? "block" : "hidden lg:block",
          )}
        >
          <ChatPanel
            threadId={activeThreadId}
            onBack={handleBack}
            composeListingId={composeListingId}
            onComposeComplete={handleComposeComplete}
          />
        </div>
      </div>
    </div>
  );
}

export default function MessagesPage() {
  return (
    <ProtectedPage>
      <Suspense
        fallback={
          <div className="mx-auto h-[calc(100vh-4rem)] max-w-5xl">
            <div className="flex h-full overflow-hidden rounded-lg border border-border">
              <div className="w-full lg:w-72 xl:w-80 lg:shrink-0 border-r border-border">
                <div className="px-3 py-3">
                  <div className="h-8 w-full rounded-md bg-muted animate-pulse" />
                </div>
                {Array.from({ length: 6 }).map((_, i) => (
                  <ThreadSkeleton key={i} />
                ))}
              </div>
              <div className="hidden lg:flex flex-1 items-center justify-center bg-muted/30">
                <div className="text-center">
                  <div className="mx-auto h-20 w-20 rounded-full bg-muted animate-pulse mb-4" />
                  <div className="h-4 w-48 rounded bg-muted animate-pulse mx-auto" />
                </div>
              </div>
            </div>
          </div>
        }
      >
        <MessagesPageContent />
      </Suspense>
    </ProtectedPage>
  );
}
