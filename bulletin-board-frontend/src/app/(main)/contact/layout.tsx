import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact Support",
  description:
    "Get help with your GimmeDat account. Reach our support team via email, in-app chat, or the feedback form.",
  openGraph: {
    title: "Contact Support | GimmeDat",
    description:
      "Get help with your GimmeDat account. Reach our support team via email, in-app chat, or the feedback form.",
  },
};

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
