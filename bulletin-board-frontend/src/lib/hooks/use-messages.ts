import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import type {
  Message,
  MessageThread,
  PaginatedResponse,
} from "@/lib/types";
import {
  getThreads,
  getThread,
  startThread,
  sendMessage,
  markThreadRead,
} from "@/lib/api/messages";
import { useAuthStore } from "./use-auth";

// ---- Query key factories ----

const messageKeys = {
  all: ["messages"] as const,
  threads: () => [...messageKeys.all, "threads"] as const,
  threadDetail: (id: string) => [...messageKeys.all, "thread", id] as const,
};

// ---- Queries ----

export function useThreads(enabled = true) {
  return useInfiniteQuery({
    queryKey: messageKeys.threads(),
    queryFn: ({ pageParam = 1 }) => getThreads(pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.has_next
        ? lastPage.pagination.page + 1
        : undefined,
    enabled,
  });
}

export function useThread(threadId: string | undefined) {
  return useQuery({
    queryKey: messageKeys.threadDetail(threadId!),
    queryFn: () => getThread(threadId!),
    enabled: !!threadId,
    refetchInterval: 10_000,
    refetchIntervalInBackground: false, // Pause polling when tab is hidden
    refetchOnWindowFocus: true, // Refetch when user returns to tab
  });
}

// ---- Mutations ----

export function useStartThread() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      listing_id,
      content,
    }: {
      listing_id: string;
      content: string;
    }) => startThread(listing_id, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: messageKeys.threads() });
      toast.success("Message sent!");
    },
    onError: (error) => {
      const detail =
        error instanceof Error ? error.message : "Unknown error";
      toast.error(`Failed to start conversation: ${detail}`);
    },
  });
}

/**
 * Sends a message in a thread with optimistic update.
 * The new message appears in the cache immediately and is reconciled
 * after the server response arrives.
 */
export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      threadId,
      content,
      listing_id,
    }: {
      threadId: string;
      content: string;
      listing_id?: string;
    }) => sendMessage(threadId, content, listing_id),

    onMutate: async ({ threadId, content }) => {
      await queryClient.cancelQueries({
        queryKey: messageKeys.threadDetail(threadId),
      });

      const previousThread = queryClient.getQueryData<{
        thread: MessageThread;
        messages: PaginatedResponse<Message>;
      }>(messageKeys.threadDetail(threadId));

      const userId = useAuthStore.getState().user?.id;

      if (previousThread) {
        const optimisticMessage: Message = {
          id: `optimistic-${Date.now()}`,
          sender_id: userId ?? "",
          sender_name: useAuthStore.getState().user?.display_name ?? "",
          content,
          is_read: true,
          is_own: true,
          listing: null,
          created_at: new Date().toISOString(),
        };

        queryClient.setQueryData<{
          thread: MessageThread;
          messages: PaginatedResponse<Message>;
        }>(messageKeys.threadDetail(threadId), {
          thread: {
            ...previousThread.thread,
            last_message_preview: content,
            last_message_at: optimisticMessage.created_at,
          },
          messages: {
            ...previousThread.messages,
            items: [...previousThread.messages.items, optimisticMessage],
            pagination: {
              ...previousThread.messages.pagination,
              total_items: previousThread.messages.pagination.total_items + 1,
            },
          },
        });
      }

      return { previousThread };
    },

    onError: (error, { threadId }, context) => {
      if (context?.previousThread) {
        queryClient.setQueryData(
          messageKeys.threadDetail(threadId),
          context.previousThread,
        );
      }
      const detail =
        error instanceof Error ? error.message : "Unknown error";
      toast.error(`Failed to send message: ${detail}`);
    },

    onSettled: (_data, _err, { threadId }) => {
      queryClient.invalidateQueries({
        queryKey: messageKeys.threadDetail(threadId),
      });
      queryClient.invalidateQueries({ queryKey: messageKeys.threads() });
    },
  });
}

export function useMarkRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (threadId: string) => markThreadRead(threadId),
    onSuccess: (_data, threadId) => {
      // Update the unread count in the thread detail cache
      queryClient.setQueryData<{
        thread: MessageThread;
        messages: PaginatedResponse<Message>;
      }>(messageKeys.threadDetail(threadId), (old) => {
        if (!old) return old;
        return {
          ...old,
          thread: { ...old.thread, unread_count: 0 },
          messages: {
            ...old.messages,
            items: old.messages.items.map((msg) => ({
              ...msg,
              is_read: true,
            })),
          },
        };
      });
      queryClient.invalidateQueries({ queryKey: messageKeys.threads() });
    },
  });
}
