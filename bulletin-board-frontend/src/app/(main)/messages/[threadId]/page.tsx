"use client";

import { useEffect, useRef, useState, useMemo, type FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  Send,
  Loader2,
  CheckCheck,
  Check,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { en as t } from "@/lib/i18n/en";
import { useAuth } from "@/lib/hooks/use-auth";
import { useThread, useSendMessage, useMarkRead } from "@/lib/hooks/use-messages";
import type { Message } from "@/lib/types";
import { ProtectedPage } from "@/components/auth/ProtectedPage";

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

function groupMessagesByDate(messages: Message[]): Map<string, Message[]> {
  const groups = new Map<string, Message[]>();
  for (const msg of messages) {
    const dateKey = new Date(msg.created_at).toDateString();
    const existing = groups.get(dateKey);
    if (existing) {
      existing.push(msg);
    } else {
      groups.set(dateKey, [msg]);
    }
  }
  return groups;
}

function MessageBubble({ message, isOwn }: { message: Message; isOwn: boolean }) {
  return (
    <div
      className={cn(
        "flex flex-col max-w-[75%] gap-0.5",
        isOwn ? "items-end self-end" : "items-start self-start",
      )}
    >
      <div
        className={cn(
          "rounded-2xl px-3 py-2 text-sm leading-relaxed break-words",
          isOwn
            ? "bg-primary text-primary-foreground rounded-br-md"
            : "bg-muted text-foreground rounded-bl-md",
        )}
      >
        {message.content}
      </div>
      <div className="flex items-center gap-1 px-1">
        <span className="text-[10px] text-muted-foreground">
          {formatTime(message.created_at)}
        </span>
        {isOwn && (
          message.is_read ? (
            <CheckCheck className="h-3 w-3 text-primary" />
          ) : (
            <Check className="h-3 w-3 text-muted-foreground" />
          )
        )}
      </div>
    </div>
  );
}

function MessageSkeleton() {
  return (
    <div className="flex flex-col gap-4 p-4 animate-pulse">
      <div className="flex gap-2 self-start">
        <div className="h-10 w-48 rounded-2xl bg-muted" />
      </div>
      <div className="flex gap-2 self-end">
        <div className="h-10 w-36 rounded-2xl bg-muted" />
      </div>
      <div className="flex gap-2 self-start">
        <div className="h-10 w-56 rounded-2xl bg-muted" />
      </div>
      <div className="flex gap-2 self-end">
        <div className="h-10 w-40 rounded-2xl bg-muted" />
      </div>
    </div>
  );
}

export default function ThreadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const threadId = params.threadId as string;

  const { user } = useAuth();
  const { data, isLoading, isError } = useThread(threadId);
  const sendMutation = useSendMessage();
  const markReadMutation = useMarkRead();

  const [messageText, setMessageText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hasMarkedRead = useRef(false);

  const thread = data?.thread;
  const messages = useMemo(
    () => data?.messages?.items ?? [],
    [data],
  );

  const groupedMessages = useMemo(
    () => groupMessagesByDate(messages),
    [messages],
  );

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // Mark thread as read on open (fix race condition - only set flag on success)
  useEffect(() => {
    if (threadId && thread && thread.unread_count > 0 && !hasMarkedRead.current) {
      markReadMutation.mutate(threadId, {
        onSuccess: () => {
          hasMarkedRead.current = true;
        },
      });
    }
  }, [threadId, thread, markReadMutation]);

  function handleSend(e: FormEvent) {
    e.preventDefault();
    const trimmed = messageText.trim();
    if (!trimmed || sendMutation.isPending) return;

    sendMutation.mutate(
      { threadId, content: trimmed },
      { onSuccess: () => setMessageText("") },
    );
  }

  const otherUser = thread?.other_user;
  const otherInitials = otherUser
    ? otherUser.display_name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "";

  return (
    <ProtectedPage>
    <div className="flex h-[calc(100vh-4rem)] flex-col mx-auto max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border bg-background px-4 py-3 shrink-0">
        <button
          type="button"
          onClick={() => router.push("/messages")}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-accent transition-colors"
          aria-label={t.common.back}
        >
          <ArrowLeft className="h-4 w-4" />
        </button>

        {otherUser && (
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {otherUser.avatar_url ? (
              <Image
                src={otherUser.avatar_url}
                alt={otherUser.display_name}
                width={32}
                height={32}
                className="h-8 w-8 rounded-full object-cover shrink-0"
              />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary shrink-0">
                {otherInitials}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">
                {otherUser.display_name}
              </p>
              {thread?.listing && (
                <Link
                  href={`/listings/${thread.listing.id}`}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors truncate"
                >
                  {thread.listing.title}
                  <ExternalLink className="h-2.5 w-2.5 shrink-0" />
                </Link>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Messages area */}
      <div ref={containerRef} className="flex-1 overflow-y-auto scrollbar-hide px-4 py-4">
        {isLoading && <MessageSkeleton />}

        {isError && (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <p className="text-sm text-destructive">{t.common.error}</p>
          </div>
        )}

        {!isLoading && !isError && messages.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <p className="text-sm text-muted-foreground">
              {t.messages.threadEmpty}
            </p>
          </div>
        )}

        {!isLoading && !isError && messages.length > 0 && (
          <div className="flex flex-col gap-2">
            {Array.from(groupedMessages.entries()).map(
              ([dateKey, dateMessages]) => (
                <div key={dateKey} className="flex flex-col gap-2">
                  {/* Date separator */}
                  <div className="flex items-center gap-3 py-2">
                    <div className="flex-1 border-t border-border" />
                    <span className="text-[11px] font-medium text-muted-foreground">
                      {formatDateHeader(dateMessages[0].created_at)}
                    </span>
                    <div className="flex-1 border-t border-border" />
                  </div>

                  {/* Messages */}
                  {dateMessages.map((msg) => (
                    <MessageBubble
                      key={msg.id}
                      message={msg}
                      isOwn={msg.is_own}
                    />
                  ))}
                </div>
              ),
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input bar */}
      <div className="border-t border-border bg-background px-4 py-3 shrink-0">
        <form onSubmit={handleSend} className="flex items-end gap-2">
          <input
            type="text"
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            placeholder={t.messages.placeholder}
            disabled={sendMutation.isPending}
            className={cn(
              "flex h-10 flex-1 rounded-full border border-input bg-background px-4 py-2 text-sm",
              "placeholder:text-muted-foreground",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              "disabled:cursor-not-allowed disabled:opacity-50",
            )}
          />
          <button
            type="submit"
            disabled={sendMutation.isPending || !messageText.trim()}
            className={cn(
              "inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary",
              "text-primary-foreground",
              "hover:bg-primary/90 transition-colors",
              "disabled:pointer-events-none disabled:opacity-50",
            )}
            aria-label={t.messages.sendAction}
          >
            {sendMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </form>
      </div>
    </div>
    </ProtectedPage>
  );
}
