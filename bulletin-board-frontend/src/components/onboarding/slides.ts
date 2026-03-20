import type { LucideIcon } from "lucide-react";
import {
  Sparkles,
  Eye,
  Search,
  PlusCircle,
  MessageCircle,
  Rocket,
} from "lucide-react";

export interface SlideData {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  accentColor: string;
}

export const slides: SlideData[] = [
  {
    id: "welcome",
    title: "Welcome to GimmeDat",
    description:
      "Your campus marketplace at Gettysburg. Here\u2019s a quick look around.",
    icon: Sparkles,
    accentColor: "bg-purple-500/15 text-purple-500",
  },
  {
    id: "preview",
    title: "Open Preview Mode",
    description:
      "We\u2019re in launch phase! Browse every listing without an account. Sign up when you\u2019re ready to post, message, or save favorites.",
    icon: Eye,
    accentColor: "bg-amber-500/15 text-amber-500",
  },
  {
    id: "browse",
    title: "Browse & Discover",
    description:
      "Search by keyword, filter by category, and Quick View any listing without leaving the feed.",
    icon: Search,
    accentColor: "bg-blue-500/15 text-blue-500",
  },
  {
    id: "create",
    title: "Post in Seconds",
    description:
      "List an item or service with photos. Our AI can help write your description.",
    icon: PlusCircle,
    accentColor: "bg-green-500/15 text-green-500",
  },
  {
    id: "messages",
    title: "Message Directly",
    description:
      "Chat with buyers and sellers in real time \u2014 no email, no phone tag.",
    icon: MessageCircle,
    accentColor: "bg-orange-500/15 text-orange-500",
  },
  {
    id: "ready",
    title: "You\u2019re All Set!",
    description:
      "Start browsing the marketplace. Welcome to the Gettysburg community!",
    icon: Rocket,
    accentColor: "bg-primary/15 text-primary",
  },
];
