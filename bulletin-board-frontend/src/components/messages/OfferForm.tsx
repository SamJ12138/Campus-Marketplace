"use client";

import { useState } from "react";
import {
  CircleDollarSign,
  Send,
  X,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useCreateOffer } from "@/lib/hooks/use-offers";
import type { ThreadListingBrief } from "@/lib/types";

interface OfferFormProps {
  threadId: string;
  listing: ThreadListingBrief | null;
  onClose: () => void;
  onSuccess: () => void;
}

const quickPrices = ["$10", "$15", "$20", "$25", "$30", "$50"];

export function OfferForm({
  threadId,
  listing,
  onClose,
  onSuccess,
}: OfferFormProps) {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const createOffer = useCreateOffer();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!amount.trim()) return;
    createOffer.mutate(
      {
        threadId,
        amount: amount.trim(),
        note: note.trim() || undefined,
      },
      {
        onSuccess: () => {
          onSuccess();
        },
      },
    );
  }

  return (
    <div className="shrink-0 border-t border-border bg-emerald-50/50 px-4 py-3 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CircleDollarSign className="h-5 w-5 text-emerald-600" />
          <span className="text-sm font-semibold text-slate-800">
            Make an Offer
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors"
          aria-label="Close offer form"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Listing reference */}
      {listing && (
        <div className="flex items-center gap-2 rounded-lg bg-white/80 border border-slate-200 px-3 py-2">
          {listing.first_photo_url && (
            <img
              src={listing.first_photo_url}
              alt=""
              className="h-8 w-8 rounded object-cover"
            />
          )}
          <span className="text-xs text-slate-600 truncate">
            {listing.title}
          </span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Amount input */}
        <div>
          <label className="text-xs font-medium text-slate-600 mb-1 block">
            Your Price
          </label>
          <input
            type="text"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder='e.g. $25, "best offer", $15/hr'
            className={cn(
              "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm",
              "focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400",
              "placeholder:text-slate-400",
            )}
            autoFocus
          />
        </div>

        {/* Quick price buttons */}
        <div className="flex flex-wrap gap-1.5">
          {quickPrices.map((price) => (
            <button
              key={price}
              type="button"
              onClick={() => setAmount(price)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                amount === price
                  ? "bg-emerald-600 text-white"
                  : "bg-white border border-slate-200 text-slate-600 hover:border-emerald-300 hover:text-emerald-700",
              )}
            >
              {price}
            </button>
          ))}
        </div>

        {/* Note textarea */}
        <div>
          <label className="text-xs font-medium text-slate-600 mb-1 block">
            Add a Note{" "}
            <span className="font-normal text-slate-400">(optional)</span>
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Hi! Would you take this price? I can pick it up today."
            rows={2}
            maxLength={2000}
            className={cn(
              "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm resize-none",
              "focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400",
              "placeholder:text-slate-400",
            )}
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={!amount.trim() || createOffer.isPending}
          className={cn(
            "w-full inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-white",
            "bg-emerald-600 hover:bg-emerald-700 transition-colors",
            "disabled:opacity-50 disabled:pointer-events-none",
          )}
        >
          {createOffer.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          Send Offer
        </button>
      </form>
    </div>
  );
}
