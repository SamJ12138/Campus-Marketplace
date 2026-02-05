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
    <nav className="fixed bottom-4 left-4 right-4 z-30 md:hidden">
      <div
        className="flex items-center justify-around rounded-2xl border border-border/50 glass-strong shadow-lg shadow-primary/10"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          const isHighlight = "highlight" in item && item.highlight;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex flex-1 flex-col items-center gap-0.5 py-3 text-[10px] font-medium transition-all duration-200 ease-spring",
                isHighlight
                  ? "text-primary"
                  : isActive
                    ? "text-primary"
                    : "text-muted-foreground active:text-primary/70",
              )}
            >
              <div className="relative">
                {isHighlight ? (
                  <div className="flex h-12 w-12 -mt-6 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-[hsl(var(--secondary-accent))] shadow-lg shadow-primary/30 animate-pulse-glow">
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                ) : (
                  <Icon
                    className={cn(
                      "h-5 w-5 transition-all duration-200 ease-spring",
                      isActive && "scale-110 text-primary",
                    )}
                  />
                )}
                {"showBadge" in item && item.showBadge && totalUnread > 0 && (
                  <span className="absolute -right-2 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-gradient-to-r from-primary to-[hsl(var(--secondary-accent))] px-1 text-[9px] font-bold text-white shadow-sm">
                    {totalUnread > 99 ? "99+" : totalUnread}
                  </span>
                )}
              </div>
              {!isHighlight && <span className="mt-0.5">{item.label}</span>}
              {isActive && !isHighlight && (
                <span className="absolute -top-0.5 left-1/2 h-1 w-6 -translate-x-1/2 rounded-full bg-gradient-to-r from-primary to-[hsl(var(--secondary-accent))]" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
