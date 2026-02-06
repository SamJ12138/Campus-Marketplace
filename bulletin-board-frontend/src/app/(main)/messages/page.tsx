"use client";

import { Suspense, useMemo, useState, useCallback, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { MessageSquare, Loader2, Send, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { en as t } from "@/lib/i18n/en";
import { useThreads, useStartThread } from "@/lib/hooks/use-messages";
import { useListing } from "@/lib/hooks/use-listings";
import type { MessageThread } from "@/lib/types";
import { ProtectedPage } from "@/components/auth/ProtectedPage";

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

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen).trimEnd() + "...";
}

function ThreadSkeleton() {
  return (
    <div className="flex items-center gap-3 px-4 py-3 animate-pulse">
      <div className="h-10 w-10 shrink-0 rounded-full bg-muted" />
      <div className="flex-1 space-y-2">
        <div className="h-3.5 w-32 rounded bg-muted" />
        <div className="h-3 w-48 rounded bg-muted" />
      </div>
      <div className="h-3 w-8 rounded bg-muted" />
    </div>
  );
}

function ThreadRow({ thread }: { thread: MessageThread }) {
  const avatarUrl = thread.other_user.avatar_url;
  const initials = thread.other_user.display_name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <Link
      href={`/messages/${thread.id}`}
      className={cn(
        "flex items-center gap-3 px-4 py-3 transition-colors hover:bg-accent/50",
        thread.unread_count > 0 && "bg-accent/30",
      )}
    >
      {/* Avatar */}
      <div className="relative h-10 w-10 shrink-0">
        {avatarUrl ? (
          <Image
            src={avatarUrl}
            alt={thread.other_user.display_name}
            width={40}
            height={40}
            className="h-10 w-10 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
            {initials}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "text-sm truncate",
              thread.unread_count > 0 ? "font-semibold" : "font-medium",
            )}
          >
            {thread.other_user.display_name}
          </span>
          {thread.listing && (
            <span className="text-xs text-muted-foreground truncate max-w-[120px]">
              {thread.listing.title}
            </span>
          )}
        </div>
        <p
          className={cn(
            "text-sm truncate",
            thread.unread_count > 0
              ? "text-foreground font-medium"
              : "text-muted-foreground",
          )}
        >
          {thread.last_message_preview
            ? truncate(thread.last_message_preview, 60)
            : "No messages yet"}
        </p>
      </div>

      {/* Meta */}
      <div className="flex flex-col items-end gap-1 shrink-0">
        <span className="text-xs text-muted-foreground">
          {formatTimeAgo(thread.last_message_at)}
        </span>
        {thread.unread_count > 0 && (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
            {thread.unread_count > 99 ? "99+" : thread.unread_count}
          </span>
        )}
      </div>
    </Link>
  );
}

function MessagesPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const listingId = searchParams.get("listing");

  const { data, isLoading, isError, hasNextPage, fetchNextPage, isFetchingNextPage } = useThreads();
  const { data: listing, isLoading: listingLoading } = useListing(listingId ?? undefined);
  const startThread = useStartThread();

  const [newMessage, setNewMessage] = useState("");
  const [showCompose, setShowCompose] = useState(false);

  // Show compose UI when listing param is present
  useEffect(() => {
    if (listingId && listing) {
      setShowCompose(true);
    }
  }, [listingId, listing]);

  const threads = useMemo(() => {
    if (!data?.pages) return [];
    return data.pages.flatMap((page) => page.items);
  }, [data]);

  const handleSendNewMessage = useCallback(async () => {
    if (!listingId || !newMessage.trim()) return;

    try {
      const result = await startThread.mutateAsync({
        listing_id: listingId,
        content: newMessage.trim(),
      });
      // Navigate to the new thread
      router.replace(`/messages/${result.thread.id}`);
    } catch {
      // Error toast is handled in the hook
    }
  }, [listingId, newMessage, startThread, router]);

  const handleCancelCompose = useCallback(() => {
    setShowCompose(false);
    setNewMessage("");
    router.replace("/messages");
  }, [router]);

  return (
    <div className="mx-auto max-w-2xl">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 py-3">
        <h1 className="text-lg font-semibold">{t.messages.inboxTitle}</h1>
      </div>

      {/* New Message Compose (when coming from listing) */}
      {showCompose && listingId && (
        <div className="border-b border-border p-4 bg-accent/20">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">
                {listingLoading ? "Loading..." : `Message about: ${listing?.title}`}
              </span>
            </div>
            <button
              type="button"
              onClick={handleCancelCompose}
              className="p-1 rounded-full hover:bg-muted"
              aria-label="Cancel"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
          <div className="flex gap-2">
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Write your message..."
              className="flex-1 min-h-[80px] rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              disabled={startThread.isPending}
            />
          </div>
          <div className="flex justify-end mt-2">
            <button
              type="button"
              onClick={handleSendNewMessage}
              disabled={!newMessage.trim() || startThread.isPending}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {startThread.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Send
            </button>
          </div>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="divide-y divide-border">
          {Array.from({ length: 5 }).map((_, i) => (
            <ThreadSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Error */}
      {isError && (
        <div className="flex flex-col items-center gap-2 py-16 text-center">
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

      {/* Empty */}
      {!isLoading && !isError && threads.length === 0 && !showCompose && (
        <div className="flex flex-col items-center gap-3 py-16 text-center px-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <MessageSquare className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">
            {t.messages.emptyInbox}
          </p>
          <p className="text-xs text-muted-foreground">
            Start a conversation by messaging a seller on any listing.
          </p>
        </div>
      )}

      {/* Thread List */}
      {threads.length > 0 && (
        <div className="divide-y divide-border">
          {threads.map((thread) => (
            <ThreadRow key={thread.id} thread={thread} />
          ))}
        </div>
      )}

      {/* Load More Button */}
      {hasNextPage && (
        <div className="p-4 text-center">
          <button
            type="button"
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-accent disabled:opacity-50"
          >
            {isFetchingNextPage ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              "Load more conversations"
            )}
          </button>
        </div>
      )}
    </div>
  );
}

export default function MessagesPage() {
  return (
    <ProtectedPage>
      <Suspense fallback={
        <div className="mx-auto max-w-2xl">
          <div className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur px-4 py-3">
            <h1 className="text-lg font-semibold">{t.messages.inboxTitle}</h1>
          </div>
          <div className="divide-y divide-border">
            {Array.from({ length: 5 }).map((_, i) => (
              <ThreadSkeleton key={i} />
            ))}
          </div>
        </div>
      }>
        <MessagesPageContent />
      </Suspense>
    </ProtectedPage>
  );
}
