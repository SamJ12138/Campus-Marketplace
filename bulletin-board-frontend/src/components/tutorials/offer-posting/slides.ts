import type { SlideData } from "@/components/onboarding/slides";
import {
  HandCoins,
  CircleDollarSign,
  MessageSquare,
  Bell,
  Lightbulb,
} from "lucide-react";

export const offerPostingSlides: SlideData[] = [
  {
    id: "posting-intro",
    title: "Ready to Make an Offer?",
    description:
      "You\u2019re about to send a real price proposal. Here\u2019s how it works in a few quick steps.",
    icon: HandCoins,
    accentColor: "bg-emerald-500/15 text-emerald-500",
  },
  {
    id: "posting-price",
    title: "Name Your Price",
    description:
      "Enter the amount you\u2019d like to offer. Be fair \u2014 check similar listings for a ballpark.",
    icon: CircleDollarSign,
    accentColor: "bg-blue-500/15 text-blue-500",
  },
  {
    id: "posting-note",
    title: "Add a Message",
    description:
      "Include a short note with your offer. A friendly intro goes a long way!",
    icon: MessageSquare,
    accentColor: "bg-violet-500/15 text-violet-500",
  },
  {
    id: "posting-sent",
    title: "What Happens Next",
    description:
      "The seller gets notified instantly. They can accept, decline, or counter with a different price.",
    icon: Bell,
    accentColor: "bg-orange-500/15 text-orange-500",
  },
  {
    id: "posting-tips",
    title: "Tips for Success",
    description:
      "Respond quickly, be polite, and don\u2019t lowball. Good offers lead to great deals.",
    icon: Lightbulb,
    accentColor: "bg-amber-500/15 text-amber-500",
  },
];
