"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  Flag,
  Users,
  KeyRound,
  ScrollText,
  Package,
  Megaphone,
  MessageSquarePlus,
  UserPlus,
  Menu,
  X,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useAuthStore } from "@/lib/hooks/use-auth";
import { en as t } from "@/lib/i18n/en";

const sidebarLinks = [
  { href: "/admin", label: t.admin.dashboard, icon: LayoutDashboard },
  { href: "/admin/reports", label: t.admin.reportsQueue, icon: Flag },
  { href: "/admin/users", label: t.admin.userManagement, icon: Users },
  { href: "/admin/listings", label: "Content", icon: Package },
  { href: "/admin/ads", label: "Ads", icon: Megaphone },
  { href: "/admin/feedback", label: "Feedback", icon: MessageSquarePlus },
  { href: "/admin/applications", label: "Applications", icon: UserPlus },
  { href: "/admin/keywords", label: "Keywords", icon: KeyRound },
  { href: "/admin/audit-log", label: t.admin.auditLog, icon: ScrollText },
];

function AdminAuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading, initialize } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    initialize();
  }, [initialize]);

  const isModOrAdmin =
    user?.role === "moderator" || user?.role === "admin";

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
      return;
    }
    if (!isLoading && isAuthenticated && user && !isModOrAdmin) {
      router.push("/feed");
    }
  }, [isLoading, isAuthenticated, user, isModOrAdmin, router]);

  // If we already have a cached admin/mod user, render immediately
  // instead of blocking on the background auth refresh
  if (isLoading && isModOrAdmin) {
    return <>{children}</>;
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated || !user || !isModOrAdmin) {
    return null;
  }

  return <>{children}</>;
}

function AdminSidebar({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 border-r border-border bg-card transition-transform duration-300 ease-in-out lg:static lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-border px-4 lg:hidden">
          <span className="text-sm font-semibold">{t.admin.dashboard}</span>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex flex-col gap-1 p-4">
          {sidebarLinks.map((link) => {
            const isActive =
              pathname === link.href ||
              (link.href !== "/admin" && pathname.startsWith(link.href));
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                )}
              >
                <link.icon className="h-4 w-4" />
                {link.label}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuthStore();

  return (
    <AdminAuthGuard>
      <div className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border bg-card px-4 sm:px-6">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground lg:hidden"
            aria-label="Open sidebar"
          >
            <Menu className="h-5 w-5" />
          </button>
          <Link
            href="/feed"
            className="text-lg font-bold tracking-tight text-primary"
          >
            {t.common.appName}
          </Link>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
              <Shield className="h-3 w-3" />
              {t.admin.dashboard}
            </span>
          </div>
          <div className="ml-auto flex items-center gap-3">
            {user && (
              <span className="text-sm text-muted-foreground">
                {user.display_name}
              </span>
            )}
          </div>
        </header>
        <div className="flex flex-1">
          <AdminSidebar
            open={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
          />
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
            {children}
          </main>
        </div>
      </div>
    </AdminAuthGuard>
  );
}
