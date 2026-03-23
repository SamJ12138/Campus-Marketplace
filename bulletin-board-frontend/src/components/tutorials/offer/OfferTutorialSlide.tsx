import {
  Check,
  X,
  CircleDollarSign,
  Send,
  ArrowDown,
  Clock,
} from "lucide-react";
import { TutorialSlide } from "@/components/tutorials/TutorialSlide";
import type { SlideData } from "@/components/onboarding/slides";

/* ── Illustration: What's an Offer? ─────────────────────────── */

function OfferIntroIllustration() {
  return (
    <div className="flex flex-col gap-2 p-3">
      <span className="text-xs font-semibold">Messages</span>

      {/* Regular chat bubble */}
      <div className="flex justify-start">
        <div className="max-w-[75%] rounded-2xl rounded-tl-sm bg-muted px-3 py-1.5">
          <p className="text-[10px]">Hey, is this still available?</p>
        </div>
      </div>

      <div className="flex justify-end">
        <div className="max-w-[75%] rounded-2xl rounded-tr-sm bg-primary px-3 py-1.5">
          <p className="text-[10px] text-primary-foreground">
            Yes! What were you thinking price-wise?
          </p>
        </div>
      </div>

      {/* Offer card — visually distinct from regular messages */}
      <div className="flex justify-start">
        <div className="w-[80%] rounded-xl border-2 border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/30 p-2.5">
          <div className="flex items-center gap-1.5 mb-1.5">
            <CircleDollarSign className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
              Offer
            </span>
          </div>
          <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300 mb-2">$25</p>
          <div className="flex gap-1.5">
            <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-600 px-2 py-0.5 text-[9px] font-medium text-white">
              <Check className="h-2.5 w-2.5" /> Accept
            </span>
            <span className="inline-flex items-center gap-0.5 rounded-full bg-muted px-2 py-0.5 text-[9px] font-medium text-muted-foreground">
              <X className="h-2.5 w-2.5" /> Decline
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Illustration: How to Send One ──────────────────────────── */

function OfferHowIllustration() {
  return (
    <div className="flex flex-col gap-2.5 p-3">
      <span className="text-xs font-semibold">Send an Offer</span>

      {/* Step 1: Input bar with highlighted $ button */}
      <div className="space-y-1">
        <p className="text-[9px] font-medium text-muted-foreground uppercase tracking-wider">
          Step 1 — Tap the $ button
        </p>
        <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
          <span className="flex-1 text-[10px] text-muted-foreground">Type a message...</span>
          <div className="relative flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-600 text-white">
            <CircleDollarSign className="h-3.5 w-3.5" />
            <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
          </div>
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted">
            <Send className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
        </div>
      </div>

      {/* Step 2: Price input */}
      <div className="space-y-1">
        <p className="text-[9px] font-medium text-muted-foreground uppercase tracking-wider">
          Step 2 — Enter your price
        </p>
        <div className="flex items-center gap-2 rounded-lg border-2 border-emerald-500/50 bg-emerald-50 dark:bg-emerald-950/20 px-3 py-2">
          <CircleDollarSign className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <span className="text-sm font-bold text-emerald-700 dark:text-emerald-300">20.00</span>
        </div>
      </div>

      {/* Step 3: Send */}
      <div className="space-y-1">
        <p className="text-[9px] font-medium text-muted-foreground uppercase tracking-wider">
          Step 3 — Send it
        </p>
        <div className="flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-1.5">
          <span className="text-[10px] font-semibold text-white flex items-center gap-1">
            <Send className="h-3 w-3" /> Send Offer
          </span>
        </div>
      </div>
    </div>
  );
}

/* ── Illustration: Counter-Offers ───────────────────────────── */

function OfferCounterIllustration() {
  return (
    <div className="flex flex-col gap-2 p-3">
      <span className="text-xs font-semibold">Negotiation</span>

      {/* Original offer — grayed out / countered */}
      <div className="w-[80%] rounded-xl border border-border bg-muted/50 p-2 opacity-60">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1">
            <CircleDollarSign className="h-3 w-3 text-muted-foreground" />
            <span className="text-[9px] font-medium text-muted-foreground">Their Offer</span>
          </div>
          <span className="rounded-full bg-orange-100 dark:bg-orange-900/30 px-1.5 py-0.5 text-[8px] font-medium text-orange-600 dark:text-orange-400">
            Countered
          </span>
        </div>
        <p className="text-sm font-bold text-muted-foreground line-through">$30</p>
      </div>

      {/* Arrow connecting them */}
      <div className="flex items-center justify-center">
        <ArrowDown className="h-4 w-4 text-orange-500" />
      </div>

      {/* Counter offer — active */}
      <div className="w-[80%] rounded-xl border-2 border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/30 p-2.5">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1">
            <CircleDollarSign className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
            <span className="text-[9px] font-medium text-emerald-700 dark:text-emerald-300">Your Counter</span>
          </div>
          <span className="rounded-full bg-emerald-100 dark:bg-emerald-900/30 px-1.5 py-0.5 text-[8px] font-medium text-emerald-600 dark:text-emerald-400">
            Active
          </span>
        </div>
        <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300 mb-1.5">$25</p>
        <div className="flex gap-1.5">
          <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-600 px-2 py-0.5 text-[9px] font-medium text-white">
            <Check className="h-2.5 w-2.5" /> Accept
          </span>
          <span className="inline-flex items-center gap-0.5 rounded-full bg-muted px-2 py-0.5 text-[9px] font-medium text-muted-foreground">
            <X className="h-2.5 w-2.5" /> Decline
          </span>
        </div>
      </div>
    </div>
  );
}

/* ── Illustration: 48-Hour Window ───────────────────────────── */

function OfferExpiryIllustration() {
  return (
    <div className="flex flex-col gap-2.5 p-3">
      <span className="text-xs font-semibold">Offer Expiry</span>

      {/* Active offer with countdown */}
      <div className="w-[85%] rounded-xl border-2 border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/30 p-2.5">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1">
            <CircleDollarSign className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
            <span className="text-[9px] font-medium text-emerald-700 dark:text-emerald-300">Active Offer</span>
          </div>
          <div className="flex items-center gap-0.5 rounded-full bg-purple-100 dark:bg-purple-900/30 px-1.5 py-0.5">
            <Clock className="h-2.5 w-2.5 text-purple-600 dark:text-purple-400" />
            <span className="text-[8px] font-bold text-purple-600 dark:text-purple-400">47h 30m left</span>
          </div>
        </div>
        <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300">$25</p>
      </div>

      {/* Expired offer — faded */}
      <div className="w-[85%] rounded-xl border border-dashed border-border bg-muted/30 p-2.5 opacity-50">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1">
            <CircleDollarSign className="h-3 w-3 text-muted-foreground" />
            <span className="text-[9px] font-medium text-muted-foreground">Previous Offer</span>
          </div>
          <span className="rounded-full bg-muted px-1.5 py-0.5 text-[8px] font-medium text-muted-foreground">
            Expired
          </span>
        </div>
        <p className="text-sm font-bold text-muted-foreground line-through">$20</p>
      </div>

      {/* Reassurance note */}
      <div className="flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-purple-300 dark:border-purple-700 bg-purple-50 dark:bg-purple-950/20 px-3 py-1.5">
        <Clock className="h-3 w-3 text-purple-500" />
        <span className="text-[9px] text-purple-600 dark:text-purple-400 font-medium">
          No worries — send a new offer anytime
        </span>
      </div>
    </div>
  );
}

/* ── Illustrations map ──────────────────────────────────────── */

const illustrations: Record<string, () => React.JSX.Element> = {
  "offer-intro": OfferIntroIllustration,
  "offer-how": OfferHowIllustration,
  "offer-counter": OfferCounterIllustration,
  "offer-expiry": OfferExpiryIllustration,
};

/* ── Main component ─────────────────────────────────────────── */

interface OfferTutorialSlideProps {
  slide: SlideData;
}

export function OfferTutorialSlide({ slide }: OfferTutorialSlideProps) {
  return (
    <TutorialSlide
      slide={slide}
      illustrations={illustrations}
    />
  );
}
