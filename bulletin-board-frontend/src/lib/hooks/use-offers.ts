import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  createOffer,
  acceptOffer,
  declineOffer,
  counterOffer,
} from "@/lib/api/offers";

// Mirror the query keys from use-messages.ts
const messageKeys = {
  all: ["messages"] as const,
  threads: () => [...messageKeys.all, "threads"] as const,
  threadDetail: (id: string) => [...messageKeys.all, "thread", id] as const,
};

export function useCreateOffer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      threadId,
      amount,
      note,
    }: {
      threadId: string;
      amount: string;
      note?: string;
    }) => createOffer(threadId, amount, note),
    onSuccess: (_data, { threadId }) => {
      toast.success("Offer sent!");
      queryClient.invalidateQueries({
        queryKey: messageKeys.threadDetail(threadId),
      });
      queryClient.invalidateQueries({ queryKey: messageKeys.threads() });
    },
    onError: (error) => {
      const detail =
        error instanceof Error ? error.message : "Unknown error";
      toast.error(`Failed to send offer: ${detail}`);
    },
  });
}

export function useAcceptOffer(threadId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (offerId: string) => acceptOffer(offerId),
    onSuccess: () => {
      toast.success("Offer accepted!");
      queryClient.invalidateQueries({
        queryKey: messageKeys.threadDetail(threadId),
      });
      queryClient.invalidateQueries({ queryKey: messageKeys.threads() });
    },
    onError: (error) => {
      const detail =
        error instanceof Error ? error.message : "Unknown error";
      toast.error(`Failed to accept offer: ${detail}`);
    },
  });
}

export function useDeclineOffer(threadId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (offerId: string) => declineOffer(offerId),
    onSuccess: () => {
      toast.info("Offer declined.");
      queryClient.invalidateQueries({
        queryKey: messageKeys.threadDetail(threadId),
      });
      queryClient.invalidateQueries({ queryKey: messageKeys.threads() });
    },
    onError: (error) => {
      const detail =
        error instanceof Error ? error.message : "Unknown error";
      toast.error(`Failed to decline offer: ${detail}`);
    },
  });
}

export function useCounterOffer(threadId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      offerId,
      amount,
      note,
    }: {
      offerId: string;
      amount: string;
      note?: string;
    }) => counterOffer(offerId, amount, note),
    onSuccess: () => {
      toast.success("Counter offer sent!");
      queryClient.invalidateQueries({
        queryKey: messageKeys.threadDetail(threadId),
      });
      queryClient.invalidateQueries({ queryKey: messageKeys.threads() });
    },
    onError: (error) => {
      const detail =
        error instanceof Error ? error.message : "Unknown error";
      toast.error(`Failed to send counter offer: ${detail}`);
    },
  });
}
