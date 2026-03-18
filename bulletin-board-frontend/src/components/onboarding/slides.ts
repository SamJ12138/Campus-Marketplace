import type { LucideIcon } from "lucide-react";
import {
  Sparkles,
  Search,
  PlusCircle,
  MessageCircle,
  Rocket,
} from "lucide-react";

export interface SlideData {
  id: string;
  title: string;
  description: string;
  image: string | null;
  icon: LucideIcon;
  accentColor: string;
}

export const slides: SlideData[] = [
  {
    id: "welcome",
    title: "Welcome to GimmeDat",
    description:
      "Your campus marketplace at Gettysburg. Here\u2019s a quick look around.",
    image: "/images/onboarding/slide-1-feed.png",
    icon: Sparkles,
    accentColor: "bg-purple-500/15 text-purple-500",
  },
  {
    id: "browse",
    title: "Browse & Discover",
    description:
      "Search by keyword, filter by category, and Quick View any listing without leaving the feed.",
    image: "/images/onboarding/slide-2-discover.png",
    icon: Search,
    accentColor: "bg-blue-500/15 text-blue-500",
  },
  {
    id: "create",
    title: "Post in Seconds",
    description:
      "List an item or service with photos. Our AI can help write your description.",
    image: "/images/onboarding/slide-3-create.png",
    icon: PlusCircle,
    accentColor: "bg-green-500/15 text-green-500",
  },
  {
    id: "messages",
    title: "Message Directly",
    description:
      "Chat with buyers and sellers in real time \u2014 no email, no phone tag.",
    image: "/images/onboarding/slide-4-messages.png",
    icon: MessageCircle,
    accentColor: "bg-orange-500/15 text-orange-500",
  },
  {
    id: "ready",
    title: "You\u2019re All Set!",
    description:
      "Start browsing the marketplace. Welcome to the Gettysburg community!",
    image: null,
    icon: Rocket,
    accentColor: "bg-primary/15 text-primary",
  },
];
