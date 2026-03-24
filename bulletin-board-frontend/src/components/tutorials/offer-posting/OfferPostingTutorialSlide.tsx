import {
  CircleDollarSign,
  Send,
  Check,
  X,
  ArrowLeftRight,
  Star,
  Handshake,
  Zap,
  Bell,
} from "lucide-react";
import { TutorialSlide } from "@/components/tutorials/TutorialSlide";
import type { SlideData } from "@/components/onboarding/slides";

/* ── Illustration: Ready to Make an Offer? ──────────────────── */

function PostingIntroIllustration() {
  return (
    <div className="flex flex-col gap-2 p-3">
      <span className="text-xs font-semibold">Your Conversation</span>

      {/* Chat bubbles */}
      <div className="flex justify-start">
        <div className="max-w-[75%] rounded-2xl rounded-tl-sm bg-muted px-3 py-1.5">
          <p className="text-[10px]">Hey! Is the textbook still available?</p>
        </div>
      </div>
      <div className="flex justify-end">
        <div className="max-w-[75%] rounded-2xl rounded-tr-sm bg-primary px-3 py-1.5">
          <p className="text-[10px] text-primary-foreground">Yes it is! Make me an offer</p>
        </div>
      </div>

      {/* Input bar with highlighted Offer button */}
      <div className="mt-1 flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
        <span className="flex-1 text-[10px] text-muted-foreground">Type a message...</span>
        <div className="relative flex h-7 items-center gap-1 rounded-lg bg-emerald-600 px-2 text-white">
          <CircleDollarSign className="h-3 w-3" />
          <span className="text-[9px] font-medium">Offer</span>
          {/* Pulsing highlight */}
          <span className="absolute -inset-1 rounded-xl border-2 border-emerald-400 animate-pulse" />
        </div>
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted">
          <Send className="h-3 w-3 text-muted-foreground" />
        </div>
      </div>
      <p className="text-center text-[9px] text-emerald-600 dark:text-emerald-400 font-medium">
        Tap this button to start
      </p>
    </div>
  );
}

/* ── Illustration: Name Your Price ──────────────────────────── */

function PostingPriceIllustration() {
  return (
    <div className="flex flex-col gap-3 p-3">
      <span className="text-xs font-semibold">Set Your Price</span>

      {/* Price input mockup */}
      <div className="rounded-xl border-2 border-blue-500/30 bg-blue-50 dark:bg-blue-950/20 p-4">
        <p className="text-[9px] font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-2">
          Your offer amount
        </p>
        <div className="flex items-baseline gap-1 mb-3">
          <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">$</span>
          <span className="text-3xl font-bold text-blue-700 dark:text-blue-300">20</span>
          <span className="text-xl text-blue-400 dark:text-blue-500">.00</span>
        </div>

        {/* Price suggestions */}
        <p className="text-[9px] text-muted-foreground mb-1.5">Quick picks:</p>
        <div className="flex gap-1.5">
          {["$10", "$15", "$20", "$25", "$30", "$50"].map((price) => (
            <span
              key={price}
              className={`rounded-full px-2 py-0.5 text-[9px] font-medium ${
                price === "$20"
                  ? "bg-blue-600 text-white"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {price}
            </span>
          ))}
        </div>
      </div>

      {/* Listing reference */}
      <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-1.5">
        <div className="h-6 w-6 rounded bg-muted" />
        <div>
          <p className="text-[9px] font-medium">Organic Chemistry Textbook</p>
          <p className="text-[8px] text-muted-foreground">Listed at $35</p>
        </div>
      </div>
    </div>
  );
}

/* ── Illustration: Add a Message ────────────────────────────── */

function PostingNoteIllustration() {
  return (
    <div className="flex flex-col gap-3 p-3">
      <span className="text-xs font-semibold">Add a Note</span>

      {/* Offer summary */}
      <div className="flex items-center justify-between rounded-lg border border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/20 px-3 py-2">
        <div className="flex items-center gap-1.5">
          <CircleDollarSign className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
          <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">Your Offer</span>
        </div>
        <span className="text-sm font-bold text-emerald-700 dark:text-emerald-300">$20.00</span>
      </div>

      {/* Message textarea mockup */}
      <div className="rounded-xl border-2 border-violet-500/30 bg-violet-50 dark:bg-violet-950/20 p-3">
        <p className="text-[9px] font-medium text-violet-600 dark:text-violet-400 uppercase tracking-wider mb-2">
          Message (optional)
        </p>
        <div className="rounded-lg border border-violet-200 dark:border-violet-800 bg-white dark:bg-background p-2 min-h-[40px]">
          <p className="text-[10px] text-foreground">
            Hi! Would you take $20 for the textbook? I can pick it up today
          </p>
          <span className="inline-block h-3 w-px bg-violet-500 animate-pulse" />
        </div>
      </div>

      {/* Send button */}
      <div className="flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-1.5">
        <span className="text-[10px] font-semibold text-white flex items-center gap-1">
          <Send className="h-3 w-3" /> Send Offer
        </span>
      </div>
    </div>
  );
}

/* ── Illustration: What Happens Next ────────────────────────── */

function PostingSentIllustration() {
  return (
    <div className="flex flex-col gap-2.5 p-3">
      <span className="text-xs font-semibold">Seller&apos;s View</span>

      {/* Notification mockup */}
      <div className="rounded-xl border border-orange-500/30 bg-orange-50 dark:bg-orange-950/20 p-3">
        <div className="flex items-center gap-2 mb-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-orange-500/20">
            <Bell className="h-3 w-3 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-orange-700 dark:text-orange-300">New Offer!</p>
            <p className="text-[8px] text-muted-foreground">Just now</p>
          </div>
        </div>

        {/* Offer card in notification */}
        <div className="rounded-lg border border-border bg-card p-2.5">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <div className="h-5 w-5 rounded-full bg-primary/20" />
              <span className="text-[10px] font-medium">You</span>
            </div>
            <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">$20.00</span>
          </div>
          <p className="text-[9px] text-muted-foreground mb-2">
            &ldquo;Would you take $20 for the textbook?&rdquo;
          </p>

          {/* Action buttons */}
          <div className="flex gap-1.5">
            <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-600 px-2.5 py-0.5 text-[9px] font-medium text-white">
              <Check className="h-2.5 w-2.5" /> Accept
            </span>
            <span className="inline-flex items-center gap-0.5 rounded-full bg-muted px-2.5 py-0.5 text-[9px] font-medium text-muted-foreground">
              <X className="h-2.5 w-2.5" /> Decline
            </span>
            <span className="inline-flex items-center gap-0.5 rounded-full bg-orange-100 dark:bg-orange-900/30 px-2.5 py-0.5 text-[9px] font-medium text-orange-600 dark:text-orange-400">
              <ArrowLeftRight className="h-2.5 w-2.5" /> Counter
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Illustration: Tips for Success ─────────────────────────── */

function PostingTipsIllustration() {
  return (
    <div className="flex flex-col gap-2.5 p-3">
      <span className="text-xs font-semibold">Pro Tips</span>

      {/* Tip cards */}
      <div className="space-y-2">
        <div className="flex items-center gap-3 rounded-xl border border-amber-500/20 bg-amber-50 dark:bg-amber-950/20 px-3 py-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500/20">
            <Zap className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <p className="text-[10px] font-semibold">Respond Quickly</p>
            <p className="text-[9px] text-muted-foreground">Fast replies show you&apos;re serious</p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-xl border border-amber-500/20 bg-amber-50 dark:bg-amber-950/20 px-3 py-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500/20">
            <Handshake className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <p className="text-[10px] font-semibold">Be Fair</p>
            <p className="text-[9px] text-muted-foreground">Check similar listings for pricing</p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-xl border border-amber-500/20 bg-amber-50 dark:bg-amber-950/20 px-3 py-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500/20">
            <Star className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <p className="text-[10px] font-semibold">Be Friendly</p>
            <p className="text-[9px] text-muted-foreground">A kind note makes deals happen faster</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Illustrations map ──────────────────────────────────────── */

const illustrations: Record<string, () => React.JSX.Element> = {
  "posting-intro": PostingIntroIllustration,
  "posting-price": PostingPriceIllustration,
  "posting-note": PostingNoteIllustration,
  "posting-sent": PostingSentIllustration,
  "posting-tips": PostingTipsIllustration,
};

/* ── Main component ─────────────────────────────────────────── */

interface OfferPostingTutorialSlideProps {
  slide: SlideData;
}

export function OfferPostingTutorialSlide({ slide }: OfferPostingTutorialSlideProps) {
  return (
    <TutorialSlide
      slide={slide}
      illustrations={illustrations}
    />
  );
}
