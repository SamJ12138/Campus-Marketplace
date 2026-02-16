import type {
  Message,
  MessageThread,
  PaginatedResponse,
  PaginationMeta,
} from "@/lib/types";
import { api } from "./client";

export async function getThreads(
  page?: number,
  per_page?: number,
): Promise<PaginatedResponse<MessageThread>> {
  return api.get<PaginatedResponse<MessageThread>>("/api/v1/threads", {
    page,
    per_page,
  });
}

/** Raw shape returned by the backend (flat messages list + separate pagination). */
interface ThreadDetailRaw {
  thread: MessageThread;
  messages: Message[];
  pagination: PaginationMeta;
}

export async function getThread(
  threadId: string,
  page?: number,
  per_page?: number,
): Promise<{
  thread: MessageThread;
  messages: PaginatedResponse<Message>;
}> {
  const raw = await api.get<ThreadDetailRaw>(`/api/v1/threads/${threadId}`, {
    page,
    per_page,
  });
  return {
    thread: raw.thread,
    // Backend returns newest-first (DESC); reverse to chronological for display
    messages: { items: [...raw.messages].reverse(), pagination: raw.pagination },
  };
}

export async function startThread(
  listing_id: string,
  content: string,
): Promise<{
  thread: MessageThread;
  messages: PaginatedResponse<Message>;
}> {
  const raw = await api.post<ThreadDetailRaw>("/api/v1/threads", {
    listing_id,
    message: content,
  });
  return {
    thread: raw.thread,
    messages: { items: raw.messages, pagination: raw.pagination },
  };
}

export async function sendMessage(
  threadId: string,
  content: string,
  listing_id?: string,
): Promise<Message> {
  return api.post<Message>(`/api/v1/threads/${threadId}/messages`, {
    content,
    ...(listing_id ? { listing_id } : {}),
  });
}

export async function markThreadRead(threadId: string): Promise<void> {
  return api.patch<void>(`/api/v1/threads/${threadId}/read`);
}
