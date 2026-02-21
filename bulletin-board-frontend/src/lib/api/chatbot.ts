import { api } from "./client";

export interface ChatMessagePayload {
  role: "user" | "assistant";
  content: string;
}

export interface ChatSource {
  title: string;
  url: string;
}

export interface ChatbotResponse {
  reply: string;
  confidence: number;
  sources: ChatSource[];
  escalation: boolean;
}

export async function sendChatMessage(
  message: string,
  conversationHistory?: ChatMessagePayload[],
): Promise<ChatbotResponse> {
  return api.post<ChatbotResponse>(
    "/api/v1/chatbot/chat",
    {
      message,
      conversation_history: conversationHistory,
    },
    true, // skipAuth — chatbot is public
  );
}
