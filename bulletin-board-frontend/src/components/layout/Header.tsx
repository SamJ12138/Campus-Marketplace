"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import Image from "next/image";
import {
  Search,
  Plus,
  Sun,
  Moon,
  LogOut,
  LogIn,
  User as UserIcon,
  ListOrdered,
  Heart,
  Settings,
  Shield,
  Mail,
  ChevronDown,
} from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils/cn";
import { useAuthStore } from "@/lib/hooks/use-auth";
import { useThreads } from "@/lib/hooks/use-messages";
import { useCategories } from "@/lib/hooks/use-listings";
import type { Category } from "@/lib/types";
import { en as t } from "@/lib/i18n/en";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";

export function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, isAuthenticated, logout } = useAuthStore();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [searchValue, setSearchValue] = useState(searchParams.get("q") ?? "");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: threadsData } = useThreads(isAuthenticated);
  const totalUnread =
    threadsData?.pages?.reduce(
      (sum, page) =>
        sum + page.items.reduce((s, thread) => s + thread.unread_count, 0),
      0,
    ) ?? 0;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchValue(value);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        if (value.trim()) {
          router.push(`/feed?q=${encodeURIComponent(value.trim())}`);
        } else {
          router.push("/feed");
        }
      }, 400);
    },
    [router],
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleLogout = useCallback(async () => {
    setDropdownOpen(false);
    await logout();
    router.push("/feed");
  }, [logout, router]);

  const handleAuthGatedNav = useCallback(
    (href: string) => {
      if (isAuthenticated) {
        router.push(href);
      } else {
        router.push(`/login?redirect=${encodeURIComponent(href)}`);
      }
    },
    [isAuthenticated, router],
  );

  const isModOrAdmin =
    user?.role === "moderator" || user?.role === "admin";

  return (
    <header className="sticky top-0 z-30 border-b border-border/50 glass-strong">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
        <Link
          href="/feed"
          className="shrink-0 flex items-center gap-2 group"
        >
          <Image
            src="/images/logo-v2.png"
            alt="GimmeDat"
            width={36}
            height={36}
            className="h-9 w-9 object-contain transition-transform duration-200 group-hover:scale-105"
          />
          <div className="flex flex-col leading-none">
            <span className="text-lg font-bold font-display tracking-tight gradient-text-primary">
              {t.common.appName}
            </span>
            <span className="text-[10px] font-medium text-muted-foreground/70 tracking-wide">
              Campus Marketplace
            </span>
          </div>
        </Link>

        <div className="hidden flex-1 md:block">
          <div className="relative max-w-md">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={searchValue}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search listings..."
              className="h-10 w-full rounded-xl border-2 border-border/50 bg-background/50 pl-10 pr-4 text-sm placeholder:text-muted-foreground/60 transition-all duration-200 hover:border-primary/30 hover:bg-background focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 focus:bg-background"
            />
          </div>
        </div>

        <nav className="hidden items-center gap-1 md:flex">
          <Link
            href="/"
            className="rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground transition-all duration-200 hover:bg-primary/10 hover:text-primary"
          >
            Home
          </Link>
          <MarketplaceDropdown />
          <Link
            href="/how-it-works"
            className="rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground transition-all duration-200 hover:bg-primary/10 hover:text-primary"
          >
            How It Works
          </Link>
          <Link
            href="/join-team"
            className="rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground transition-all duration-200 hover:bg-primary/10 hover:text-primary"
          >
            Join the Team
          </Link>

          {isAuthenticated ? (
            <>
              <Link
                href="/messages"
                className="relative rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground transition-all duration-200 hover:bg-primary/10 hover:text-primary"
              >
                <span className="flex items-center gap-1.5">
                  <Mail className="h-4 w-4" />
                  {t.messages.inboxTitle}
                  {totalUnread > 0 && (
                    <Badge variant="gradient" size="sm" className="ml-1">
                      {totalUnread > 99 ? "99+" : totalUnread}
                    </Badge>
                  )}
                </span>
              </Link>
              <Link
                href="/listings/new"
                className="ml-2 inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-primary to-[hsl(var(--secondary-accent))] px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-primary/25 transition-all duration-200 hover:shadow-lg hover:shadow-primary/30 hover:brightness-110"
              >
                <Plus className="h-4 w-4" />
                New Offer
              </Link>
            </>
          ) : (
            <button
              type="button"
              onClick={() => handleAuthGatedNav("/listings/new")}
              className="ml-2 inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-primary to-[hsl(var(--secondary-accent))] px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-primary/25 transition-all duration-200 hover:shadow-lg hover:shadow-primary/30 hover:brightness-110"
            >
              <Plus className="h-4 w-4" />
              New Offer
            </button>
          )}
        </nav>

        <div className="ml-auto flex items-center gap-2 md:ml-0">
          {mounted && (
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="rounded-xl p-2.5 text-muted-foreground transition-all duration-200 hover:bg-primary/10 hover:text-primary"
              aria-label={
                theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
              }
            >
              {theme === "dark" ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </button>
          )}

          {isAuthenticated ? (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 rounded-xl p-1.5 transition-all duration-200 hover:bg-primary/10"
                aria-expanded={dropdownOpen}
                aria-haspopup="true"
              >
                <Avatar
                  src={user?.avatar_url ?? null}
                  name={user?.display_name ?? ""}
                  size="sm"
                />
                <ChevronDown
                  className={cn(
                    "hidden h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 md:block",
                    dropdownOpen && "rotate-180",
                  )}
                />
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-2xl border border-border/50 glass-strong py-1 shadow-xl animate-dropdown-in">
                  <div className="border-b border-border/50 px-4 py-3">
                    <p className="text-sm font-semibold font-display text-popover-foreground">
                      {user?.display_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {user?.email}
                    </p>
                    {user?.campus_name && (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {user.campus_name}
                      </p>
                    )}
                  </div>
                  <div className="py-1">
                    <DropdownLink
                      href="/profile"
                      icon={UserIcon}
                      label={t.profile.editProfile}
                      onClick={() => setDropdownOpen(false)}
                    />
                    <DropdownLink
                      href="/profile/listings"
                      icon={ListOrdered}
                      label={t.profile.myListings}
                      onClick={() => setDropdownOpen(false)}
                    />
                    <DropdownLink
                      href="/saved"
                      icon={Heart}
                      label={t.profile.savedListings}
                      onClick={() => setDropdownOpen(false)}
                    />
                    <DropdownLink
                      href="/profile/settings"
                      icon={Settings}
                      label={t.profile.settings}
                      onClick={() => setDropdownOpen(false)}
                    />
                    {isModOrAdmin && (
                      <DropdownLink
                        href="/admin"
                        icon={Shield}
                        label={t.admin.dashboard}
                        onClick={() => setDropdownOpen(false)}
                      />
                    )}
                  </div>
                  <div className="border-t border-border/50 py-1">
                    <button
                      onClick={handleLogout}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-destructive transition-all duration-200 hover:bg-destructive/10 rounded-lg mx-1"
                    >
                      <LogOut className="h-4 w-4" />
                      {t.auth.logoutAction}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href={`/login?redirect=${encodeURIComponent(pathname)}`}
                className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground transition-all duration-200 hover:bg-primary/10 hover:text-primary"
              >
                <LogIn className="h-4 w-4" />
                Sign in
              </Link>
              <Link
                href={`/register?redirect=${encodeURIComponent(pathname)}`}
                className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-primary to-[hsl(var(--secondary-accent))] px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-primary/25 transition-all duration-200 hover:shadow-lg hover:shadow-primary/30 hover:brightness-110"
              >
                Sign up
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function MarketplaceDropdown() {
  const [open, setOpen] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pathname = usePathname();
  const { data: itemCategories } = useCategories("item");
  const { data: serviceCategories } = useCategories("service");

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const handleMouseEnter = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setOpen(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    timeoutRef.current = setTimeout(() => setOpen(false), 150);
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <div
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <Link
        href="/feed"
        className="flex items-center gap-1 rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground transition-all duration-200 hover:bg-primary/10 hover:text-primary"
      >
        Marketplace
        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform duration-200", open && "rotate-180")} />
      </Link>

      {open && (
        <div className="absolute left-1/2 top-full z-50 mt-1 w-64 -translate-x-1/2 rounded-2xl border border-border/50 glass-strong p-2 shadow-xl animate-dropdown-in">
          <Link
            href="/feed"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-popover-foreground transition-all duration-200 hover:bg-primary/10 hover:text-primary"
          >
            All Offers
          </Link>
          <div className="my-1 h-px bg-border/50" />

          {/* Items section */}
          <Link
            href="/feed?type=item"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-popover-foreground transition-all duration-200 hover:bg-primary/10 hover:text-primary"
          >
            Items
          </Link>
          {itemCategories && itemCategories.length > 0 && (
            <div className="ml-2">
              {itemCategories.map((cat: Category) => (
                <Link
                  key={cat.id}
                  href={`/feed?type=item&category=${cat.slug}`}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm text-muted-foreground transition-all duration-200 hover:bg-primary/10 hover:text-primary"
                >
                  {cat.icon && <span className="text-base">{cat.icon}</span>}
                  {cat.name}
                </Link>
              ))}
            </div>
          )}

          <div className="my-1 h-px bg-border/50" />

          {/* Services section */}
          <Link
            href="/feed?type=service"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-popover-foreground transition-all duration-200 hover:bg-primary/10 hover:text-primary"
          >
            Services
          </Link>
          {serviceCategories && serviceCategories.length > 0 && (
            <div className="ml-2">
              {serviceCategories.map((cat: Category) => (
                <Link
                  key={cat.id}
                  href={`/feed?type=service&category=${cat.slug}`}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm text-muted-foreground transition-all duration-200 hover:bg-primary/10 hover:text-primary"
                >
                  {cat.icon && <span className="text-base">{cat.icon}</span>}
                  {cat.name}
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DropdownLink({
  href,
  icon: Icon,
  label,
  onClick,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
  onClick: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-3 px-4 py-2.5 text-sm text-popover-foreground transition-all duration-200 hover:bg-primary/10 hover:text-primary rounded-lg mx-1"
    >
      <Icon className="h-4 w-4 text-muted-foreground" />
      {label}
    </Link>
  );
}
