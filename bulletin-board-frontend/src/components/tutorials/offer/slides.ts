import type { SlideData } from "@/components/onboarding/slides";
import {
  HandCoins,
  CircleDollarSign,
  ArrowLeftRight,
  Timer,
} from "lucide-react";

export const offerSlides: SlideData[] = [
  {
    id: "offer-intro",
    title: "What\u2019s an Offer?",
    description:
      "An offer is a formal price proposal you send inside a conversation. It\u2019s more than just saying a number in chat \u2014 it\u2019s trackable and actionable.",
    icon: HandCoins,
    accentColor: "bg-emerald-500/15 text-emerald-500",
  },
  {
    id: "offer-how",
    title: "How to Send One",
    description:
      "Tap the $ button next to the message box, enter your price, and send. The other person gets notified instantly.",
    icon: CircleDollarSign,
    accentColor: "bg-blue-500/15 text-blue-500",
  },
  {
    id: "offer-counter",
    title: "Counter-Offers",
    description:
      "Not happy with a price? Either side can counter with a new amount. Go back and forth until you both agree.",
    icon: ArrowLeftRight,
    accentColor: "bg-orange-500/15 text-orange-500",
  },
  {
    id: "offer-expiry",
    title: "48-Hour Window",
    description:
      "Every offer expires in 48 hours. No response? It quietly closes \u2014 no pressure, no awkwardness. You can always send a new one.",
    icon: Timer,
    accentColor: "bg-purple-500/15 text-purple-500",
  },
];
