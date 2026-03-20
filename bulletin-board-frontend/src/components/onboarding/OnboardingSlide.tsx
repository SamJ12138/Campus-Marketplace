import Image from "next/image";
import {
  Search,
  SlidersHorizontal,
  Camera,
  Wand2,
  DollarSign,
  Send,
  Heart,
  Star,
  ShoppingBag,
  BookOpen,
  Laptop,
  Tag,
  Eye,
  UserPlus,
  Unlock,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { DeviceFrame } from "./DeviceFrame";
import type { SlideData } from "./slides";

interface OnboardingSlideProps {
  slide: SlideData;
}

/* ── Per-slide illustrated mockups ────────────────────────────── */

function WelcomeIllustration() {
  return (
    <div className="flex flex-col gap-2 p-3">
      {/* Mock nav bar */}
      <div className="flex items-center justify-between rounded-lg bg-primary/10 px-3 py-2">
        <span className="text-xs font-bold text-primary">GimmeDat</span>
        <div className="flex gap-1.5">
          <div className="h-2 w-8 rounded bg-muted" />
          <div className="h-2 w-8 rounded bg-muted" />
        </div>
      </div>
      {/* Mock listing cards */}
      <div className="grid grid-cols-2 gap-2">
        {[
          { icon: BookOpen, color: "bg-blue-100 text-blue-500", label: "Textbooks" },
          { icon: Laptop, color: "bg-purple-100 text-purple-500", label: "Electronics" },
          { icon: ShoppingBag, color: "bg-green-100 text-green-500", label: "Clothing" },
          { icon: Star, color: "bg-orange-100 text-orange-500", label: "Services" },
        ].map((item) => (
          <div
            key={item.label}
            className="flex flex-col items-center gap-1 rounded-xl border border-border/50 bg-card p-3 shadow-sm"
          >
            <div className={cn("rounded-lg p-2", item.color)}>
              <item.icon className="h-4 w-4" />
            </div>
            <span className="text-[10px] font-medium text-foreground/70">{item.label}</span>
            <div className="h-1.5 w-10 rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}

function PreviewIllustration() {
  return (
    <div className="flex flex-col gap-2.5 p-3">
      {/* Open badge */}
      <div className="flex items-center gap-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 px-3 py-2">
        <Unlock className="h-4 w-4 text-amber-500" />
        <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">
          Open Preview — No sign-in required
        </span>
      </div>
      {/* Preview listing cards */}
      {[
        { title: "Organic Chemistry Textbook", price: "$45", tag: "Textbooks" },
        { title: "Box Braids — All Lengths", price: "From $80", tag: "Services" },
        { title: "MacBook Air M2", price: "$750", tag: "Electronics" },
      ].map((item) => (
        <div
          key={item.title}
          className="flex items-center gap-2 rounded-lg border border-border/50 bg-card p-2 shadow-sm"
        >
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-amber-100 to-amber-50 dark:from-amber-900/30 dark:to-amber-900/10">
            <Eye className="h-4 w-4 text-amber-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate">{item.title}</p>
            <p className="text-[10px] text-muted-foreground">{item.tag}</p>
          </div>
          <span className="text-xs font-bold text-primary">{item.price}</span>
        </div>
      ))}
      {/* Sign-up nudge */}
      <div className="flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-primary/30 bg-primary/5 px-3 py-2">
        <UserPlus className="h-3.5 w-3.5 text-primary" />
        <span className="text-[10px] font-medium text-primary">
          Sign up to post, message & save
        </span>
      </div>
    </div>
  );
}

function BrowseIllustration() {
  return (
    <div className="flex flex-col gap-2 p-3">
      {/* Search bar */}
      <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
        <Search className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">Search listings...</span>
        <SlidersHorizontal className="ml-auto h-3.5 w-3.5 text-primary" />
      </div>
      {/* Filter pills */}
      <div className="flex gap-1.5">
        {["All", "Items", "Services"].map((f, i) => (
          <span
            key={f}
            className={cn(
              "rounded-full px-2.5 py-0.5 text-[10px] font-medium",
              i === 0
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground",
            )}
          >
            {f}
          </span>
        ))}
      </div>
      {/* Result cards */}
      {[
        { title: "Calculus Textbook", price: "$25", tag: "Textbooks" },
        { title: "Guitar Lessons", price: "$20/hr", tag: "Services" },
      ].map((item) => (
        <div
          key={item.title}
          className="flex items-center gap-2 rounded-lg border border-border/50 bg-card p-2 shadow-sm"
        >
          <div className="h-10 w-10 flex-shrink-0 rounded-md bg-gradient-to-br from-primary/20 to-primary/5" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate">{item.title}</p>
            <p className="text-[10px] text-muted-foreground">{item.tag}</p>
          </div>
          <span className="text-xs font-bold text-primary">{item.price}</span>
        </div>
      ))}
    </div>
  );
}

function CreateIllustration() {
  return (
    <div className="flex flex-col gap-2 p-3">
      <span className="text-xs font-semibold">New Listing</span>
      {/* Photo upload area */}
      <div className="flex gap-2">
        <div className="flex h-14 w-14 flex-col items-center justify-center rounded-lg border-2 border-dashed border-primary/40 bg-primary/5">
          <Camera className="h-4 w-4 text-primary" />
          <span className="text-[8px] text-primary">Add</span>
        </div>
        <div className="h-14 w-14 rounded-lg bg-gradient-to-br from-blue-200 to-blue-100" />
        <div className="h-14 w-14 rounded-lg bg-gradient-to-br from-green-200 to-green-100" />
      </div>
      {/* Form fields */}
      <div className="space-y-1.5">
        <div className="rounded-md border border-border bg-card px-2.5 py-1.5">
          <span className="text-[10px] text-muted-foreground">Title</span>
        </div>
        <div className="flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1.5">
          <DollarSign className="h-3 w-3 text-muted-foreground" />
          <span className="text-[10px] text-muted-foreground">Price</span>
        </div>
        <div className="flex items-center gap-1.5 rounded-md border border-primary/50 bg-primary/5 px-2.5 py-1.5">
          <Wand2 className="h-3 w-3 text-primary" />
          <span className="text-[10px] text-primary">AI-generate description</span>
        </div>
      </div>
    </div>
  );
}

function MessagesIllustration() {
  return (
    <div className="flex flex-col gap-2 p-3">
      <span className="text-xs font-semibold">Messages</span>
      {/* Chat bubbles */}
      <div className="space-y-2">
        <div className="flex justify-start">
          <div className="max-w-[75%] rounded-2xl rounded-tl-sm bg-muted px-3 py-1.5">
            <p className="text-[10px]">Hey! Is the textbook still available?</p>
          </div>
        </div>
        <div className="flex justify-end">
          <div className="max-w-[75%] rounded-2xl rounded-tr-sm bg-primary px-3 py-1.5">
            <p className="text-[10px] text-primary-foreground">
              Yes! It&apos;s in great condition
            </p>
          </div>
        </div>
        <div className="flex justify-start">
          <div className="max-w-[75%] rounded-2xl rounded-tl-sm bg-muted px-3 py-1.5">
            <p className="text-[10px]">Would you do $20?</p>
          </div>
        </div>
        <div className="flex justify-end">
          <div className="flex max-w-[75%] items-center gap-1 rounded-2xl rounded-tr-sm bg-green-500 px-3 py-1.5">
            <Tag className="h-3 w-3 text-white" />
            <p className="text-[10px] text-white font-medium">Deal! $20</p>
          </div>
        </div>
      </div>
      {/* Input bar */}
      <div className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5">
        <Heart className="h-3 w-3 text-muted-foreground" />
        <span className="flex-1 text-[10px] text-muted-foreground">Type a message...</span>
        <Send className="h-3 w-3 text-primary" />
      </div>
    </div>
  );
}

function ReadyIllustration() {
  return (
    <div className="flex flex-col items-center justify-center py-12 sm:py-16">
      <Image
        src="/images/logo-v2.png"
        alt="GimmeDat"
        width={80}
        height={80}
        className="mb-4"
      />
    </div>
  );
}

const illustrations: Record<string, () => React.JSX.Element> = {
  welcome: WelcomeIllustration,
  preview: PreviewIllustration,
  browse: BrowseIllustration,
  create: CreateIllustration,
  messages: MessagesIllustration,
  ready: ReadyIllustration,
};

/* ── Main component ──────────────────────────────────────────── */

export function OnboardingSlide({ slide }: OnboardingSlideProps) {
  const Icon = slide.icon;
  const Illustration = illustrations[slide.id];

  return (
    <div className="flex w-full flex-col items-center px-4 sm:px-8">
      {/* Visual area */}
      <div className="relative mb-6 w-full max-w-lg">
        <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-primary/10 via-background to-primary/5" />

        {slide.id !== "ready" ? (
          <div className="relative p-4 sm:p-6">
            <DeviceFrame>
              {Illustration && <Illustration />}
            </DeviceFrame>
          </div>
        ) : (
          Illustration && <Illustration />
        )}
      </div>

      {/* Text content */}
      <div className="flex flex-col items-center text-center">
        <div
          className={cn(
            "mb-3 flex h-10 w-10 items-center justify-center rounded-full",
            slide.accentColor,
          )}
        >
          <Icon className="h-5 w-5" />
        </div>

        <h2 className="text-2xl font-bold">{slide.title}</h2>
        <p className="mt-2 max-w-sm text-muted-foreground">
          {slide.description}
        </p>
      </div>
    </div>
  );
}
