"use client";

import { useState } from "react";
import {
  CircleDollarSign,
  Check,
  X,
  ArrowLeftRight,
  Clock,
  Loader2,
  Send,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { Message } from "@/lib/types";
import {
  useAcceptOffer,
  useDeclineOffer,
  useCounterOffer,
} from "@/lib/hooks/use-offers";

interface OfferCardProps {
  message: Message;
  isOwn: boolean;
  threadId: string;
}

const statusConfig = {
  pending: {
    label: "Pending",
    bg: "bg-emerald-50 border-emerald-200",
    badge: "bg-emerald-100 text-emerald-700",
    icon: "text-emerald-600",
    pulse: true,
  },
  accepted: {
    label: "Accepted",
    bg: "bg-green-50 border-green-200",
    badge: "bg-green-100 text-green-700",
    icon: "text-green-600",
    pulse: false,
  },
  declined: {
    label: "Declined",
    bg: "bg-slate-50 border-slate-200",
    badge: "bg-red-100 text-red-700",
    icon: "text-slate-400",
    pulse: false,
  },
  countered: {
    label: "Countered",
    bg: "bg-orange-50 border-orange-200",
    badge: "bg-orange-100 text-orange-700",
    icon: "text-orange-500",
    pulse: false,
  },
  expired: {
    label: "Expired",
    bg: "bg-slate-50 border-slate-200",
    badge: "bg-slate-100 text-slate-500",
    icon: "text-slate-400",
    pulse: false,
  },
} as const;

export function OfferCard({
  message,
  isOwn,
  threadId,
}: OfferCardProps) {
  const acceptMutation = useAcceptOffer(threadId);
  const declineMutation = useDeclineOffer(threadId);
  const counterMutation = useCounterOffer(threadId);

  const [showCounter, setShowCounter] = useState(false);
  const [counterAmount, setCounterAmount] = useState("");

  const meta = message.meta;
  if (!meta || !meta.offer_id) return null;

  const { offer_id, amount, note } = meta;

  // Check expiry client-side for display
  const rawStatus = meta.status ?? "pending";
  const status = rawStatus as keyof typeof statusConfig;
  const config = statusConfig[status] ?? statusConfig.pending;

  const isRecipient = !isOwn;
  const isPending = status === "pending";
  const showActions = isRecipient && isPending;

  const isActing =
    acceptMutation.isPending ||
    declineMutation.isPending ||
    counterMutation.isPending;

  function handleCounter() {
    if (!counterAmount.trim() || !offer_id) return;
    counterMutation.mutate(
      {
        offerId: offer_id,
        amount: counterAmount.trim(),
      },
      {
        onSuccess: () => {
          setShowCounter(false);
          setCounterAmount("");
        },
      },
    );
  }

  return (
    <div
      className={cn("flex w-full px-3 py-1.5", isOwn ? "justify-end" : "justify-start")}
    >
      <div
        className={cn(
          "w-full max-w-[75%] rounded-xl border p-4",
          config.bg,
        )}
      >
        {/* Header */}
        <div className="flex items-center gap-2 mb-2">
          <CircleDollarSign className={cn("h-5 w-5", config.icon)} />
          <span className="text-xs font-medium text-slate-500">
            {isOwn ? "You offered" : `${message.sender_name} offered`}
          </span>
          <span
            className={cn(
              "ml-auto inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold",
              config.badge,
            )}
          >
            {config.pulse && (
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            )}
            {config.label}
          </span>
        </div>

        {/* Amount */}
        <p className={cn("text-2xl font-bold mb-1", config.icon)}>
          {amount}
        </p>

        {/* Note */}
        {note && (
          <p className="text-sm text-slate-600 mb-3">{note}</p>
        )}

        {/* Timestamp */}
        <p className="text-[10px] text-slate-400 mb-2">
          {new Date(message.created_at).toLocaleTimeString([], {
            hour: "numeric",
            minute: "2-digit",
          })}
          {status === "pending" && (
            <span className="ml-1.5 inline-flex items-center gap-0.5">
              <Clock className="h-2.5 w-2.5" />
              48h
            </span>
          )}
        </p>

        {/* Action buttons for recipient on pending offers */}
        {showActions && !showCounter && (
          <div className="flex items-center gap-2 pt-2 border-t border-slate-200/60">
            <button
              onClick={() => acceptMutation.mutate(offer_id!)}
              disabled={isActing}
              className={cn(
                "inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-white",
                "bg-green-600 hover:bg-green-700 transition-colors",
                "disabled:opacity-50 disabled:pointer-events-none",
              )}
            >
              {acceptMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Check className="h-3.5 w-3.5" />
              )}
              Accept
            </button>
            <button
              onClick={() => declineMutation.mutate(offer_id!)}
              disabled={isActing}
              className={cn(
                "inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium",
                "bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors",
                "disabled:opacity-50 disabled:pointer-events-none",
              )}
            >
              {declineMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <X className="h-3.5 w-3.5" />
              )}
              Decline
            </button>
            <button
              onClick={() => setShowCounter(true)}
              disabled={isActing}
              className={cn(
                "inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium",
                "bg-orange-100 text-orange-700 hover:bg-orange-200 transition-colors",
                "disabled:opacity-50 disabled:pointer-events-none",
              )}
            >
              <ArrowLeftRight className="h-3.5 w-3.5" />
              Counter
            </button>
          </div>
        )}

        {/* Inline counter form */}
        {showActions && showCounter && (
          <div className="pt-2 border-t border-slate-200/60 space-y-2">
            <p className="text-xs font-medium text-slate-600">
              Your counter offer:
            </p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={counterAmount}
                onChange={(e) => setCounterAmount(e.target.value)}
                placeholder="e.g. $30"
                className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-orange-400"
                autoFocus
              />
              <button
                onClick={handleCounter}
                disabled={!counterAmount.trim() || counterMutation.isPending}
                className={cn(
                  "inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-white",
                  "bg-orange-600 hover:bg-orange-700 transition-colors",
                  "disabled:opacity-50 disabled:pointer-events-none",
                )}
              >
                {counterMutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
                Send
              </button>
              <button
                onClick={() => {
                  setShowCounter(false);
                  setCounterAmount("");
                }}
                className="rounded-lg px-2 py-1.5 text-xs text-slate-500 hover:bg-slate-100"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
