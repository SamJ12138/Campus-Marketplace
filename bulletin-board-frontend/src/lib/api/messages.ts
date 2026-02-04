import type {
  Message,
  MessageThread,
  PaginatedResponse,
} from "@/lib/types";
import { api } from "./client";

export async function getThreads(
  page?: number,
  per_page?: number,
): Promise<PaginatedResponse<MessageThread>> {
  return api.get<PaginatedResponse<MessageThread>>("/api/v1/messages/threads", {
    page,
    per_page,
  });
}

export async function getThread(
  threadId: string,
  page?: number,
  per_page?: number,
): Promise<{
  thread: MessageThread;
  messages: PaginatedResponse<Message>;
}> {
  return api.get<{
    thread: MessageThread;
    messages: PaginatedResponse<Message>;
  }>(`/api/v1/messages/threads/${threadId}`, {
    page,
    per_page,
  });
}

export async function startThread(
  listing_id: string,
  content: string,
): Promise<{
  thread: MessageThread;
  messages: PaginatedResponse<Message>;
}> {
  return api.post<{
    thread: MessageThread;
    messages: PaginatedResponse<Message>;
  }>("/api/v1/messages/threads", { listing_id, content });
}

export async function sendMessage(
  threadId: string,
  content: string,
): Promise<Message> {
  return api.post<Message>(`/api/v1/messages/threads/${threadId}/messages`, {
    content,
  });
}

export async function markThreadRead(threadId: string): Promise<void> {
  return api.post<void>(`/api/v1/messages/threads/${threadId}/read`);
}
