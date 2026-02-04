"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, Search, PlusCircle, Mail, User, LogIn } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useAuthStore } from "@/lib/hooks/use-auth";
import { useThreads } from "@/lib/hooks/use-messages";
import { en as t } from "@/lib/i18n/en";

export function MobileNav() {
  const pathname = usePathname();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const { data: threadsData } = useThreads(isAuthenticated);
  const totalUnread =
    threadsData?.pages?.reduce(
      (sum, page) =>
        sum + page.items.reduce((s, thread) => s + thread.unread_count, 0),
      0,
    ) ?? 0;

  const authedItems = [
    { href: "/feed", label: "Home", icon: LayoutGrid },
    { href: "/search", label: t.common.search, icon: Search },
    { href: "/listings/new", label: "Create", icon: PlusCircle, highlight: true },
    { href: "/messages", label: t.messages.inboxTitle, icon: Mail, showBadge: true },
    { href: "/profile", label: t.profile.editProfile.replace("Edit ", ""), icon: User },
  ] as const;

  const guestItems = [
    { href: "/feed", label: "Home", icon: LayoutGrid },
    { href: "/search", label: t.common.search, icon: Search },
    { href: `/login?redirect=${encodeURIComponent(pathname)}`, label: "Sign in", icon: LogIn, highlight: true },
  ];

  const navItems = isAuthenticated ? authedItems : guestItems;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 md:hidden">
      <div
        className="flex items-center justify-around"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-all duration-200",
                "highlight" in item && item.highlight
                  ? "text-primary"
                  : isActive
                    ? "text-primary"
                    : "text-muted-foreground active:text-primary/70",
              )}
            >
              <div className="relative">
                <Icon
                  className={cn(
                    "h-5 w-5 transition-transform duration-200",
                    isActive && "scale-110",
                    "highlight" in item && item.highlight && "h-7 w-7",
                  )}
                />
                {"showBadge" in item && item.showBadge && totalUnread > 0 && (
                  <span className="absolute -right-1.5 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-destructive-foreground">
                    {totalUnread > 99 ? "99+" : totalUnread}
                  </span>
                )}
              </div>
              <span>{item.label}</span>
              {isActive && (
                <span className="absolute -top-0.5 left-1/2 h-0.5 w-5 -translate-x-1/2 rounded-full bg-primary" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
