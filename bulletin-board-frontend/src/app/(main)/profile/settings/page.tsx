"use client";

import { useState, useEffect, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  KeyRound,
  Loader2,
  Bell,
  ShieldOff,
  Trash2,
  UserX,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { en as t } from "@/lib/i18n/en";
import { changePasswordSchema, type ChangePasswordInput } from "@/lib/validation/auth";
import { changePassword, deleteAccount } from "@/lib/api/users";
import { getBlockedUsers, unblockUser } from "@/lib/api/users";
import { ApiError } from "@/lib/api/client";
import type { UserBrief } from "@/lib/types";
import { ProtectedPage } from "@/components/auth/ProtectedPage";
import { useAuth } from "@/lib/hooks/use-auth";

function ChangePasswordSection() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErrors({});
    setServerError(null);
    setIsSuccess(false);

    const result = changePasswordSchema.safeParse({
      current_password: currentPassword,
      new_password: newPassword,
      confirm_new_password: confirmNewPassword,
    });

    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const key = String(issue.path[0]);
        if (!fieldErrors[key]) {
          fieldErrors[key] = issue.message;
        }
      }
      setErrors(fieldErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      await changePassword(
        result.data.current_password,
        result.data.new_password,
      );
      setIsSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    } catch (err) {
      if (err instanceof ApiError) {
        setServerError(err.detail);
      } else {
        setServerError(t.errors.generic);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <KeyRound className="h-5 w-5 text-muted-foreground" />
        <h2 className="text-lg font-semibold">Change password</h2>
      </div>

      {serverError && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {serverError}
        </div>
      )}
      {isSuccess && (
        <div className="rounded-lg border border-success/50 bg-success/10 px-3 py-2 text-sm text-success">
          Password changed successfully.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
        <div className="space-y-2">
          <label
            htmlFor="current_password"
            className="text-sm font-medium"
          >
            Current password
          </label>
          <input
            id="current_password"
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            disabled={isSubmitting}
            className={cn(
              "flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm",
              "placeholder:text-muted-foreground",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              "disabled:cursor-not-allowed disabled:opacity-50",
              errors.current_password ? "border-destructive" : "border-input",
            )}
          />
          {errors.current_password && (
            <p className="text-xs text-destructive">{errors.current_password}</p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="new_password" className="text-sm font-medium">
            New password
          </label>
          <input
            id="new_password"
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            disabled={isSubmitting}
            className={cn(
              "flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm",
              "placeholder:text-muted-foreground",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              "disabled:cursor-not-allowed disabled:opacity-50",
              errors.new_password ? "border-destructive" : "border-input",
            )}
          />
          {errors.new_password && (
            <p className="text-xs text-destructive">{errors.new_password}</p>
          )}
        </div>

        <div className="space-y-2">
          <label
            htmlFor="confirm_new_password"
            className="text-sm font-medium"
          >
            Confirm new password
          </label>
          <input
            id="confirm_new_password"
            type="password"
            autoComplete="new-password"
            value={confirmNewPassword}
            onChange={(e) => setConfirmNewPassword(e.target.value)}
            disabled={isSubmitting}
            className={cn(
              "flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm",
              "placeholder:text-muted-foreground",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              "disabled:cursor-not-allowed disabled:opacity-50",
              errors.confirm_new_password
                ? "border-destructive"
                : "border-input",
            )}
          />
          {errors.confirm_new_password && (
            <p className="text-xs text-destructive">
              {errors.confirm_new_password}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className={cn(
            "inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 py-2",
            "text-sm font-medium text-primary-foreground",
            "hover:bg-primary/90 transition-colors",
            "disabled:pointer-events-none disabled:opacity-50",
          )}
        >
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          Update password
        </button>
      </form>
    </section>
  );
}

function NotificationPreferencesSection() {
  const [emailNewMessage, setEmailNewMessage] = useState(true);
  const [emailListingResponse, setEmailListingResponse] = useState(true);
  const [emailDigest, setEmailDigest] = useState(false);

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <Bell className="h-5 w-5 text-muted-foreground" />
        <h2 className="text-lg font-semibold">{t.profile.notificationsLabel}</h2>
      </div>

      <div className="space-y-5 max-w-md">
        {/* Email notifications */}
        <div className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground">Email</p>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={emailNewMessage}
              onChange={(e) => setEmailNewMessage(e.target.checked)}
              className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
            />
            <div>
              <p className="text-sm font-medium">New messages</p>
              <p className="text-xs text-muted-foreground">
                Receive an email when someone messages you
              </p>
            </div>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={emailListingResponse}
              onChange={(e) => setEmailListingResponse(e.target.checked)}
              className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
            />
            <div>
              <p className="text-sm font-medium">Listing activity</p>
              <p className="text-xs text-muted-foreground">
                Receive an email when someone responds to your listing
              </p>
            </div>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={emailDigest}
              onChange={(e) => setEmailDigest(e.target.checked)}
              className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
            />
            <div>
              <p className="text-sm font-medium">Weekly digest</p>
              <p className="text-xs text-muted-foreground">
                Get a weekly summary of new listings on your campus
              </p>
            </div>
          </label>
        </div>

        {/* SMS notifications - Coming Soon */}
        <div className="space-y-3 opacity-60">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-muted-foreground">SMS</p>
            <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
              Coming Soon
            </span>
          </div>

          <label className="flex items-center gap-3 cursor-not-allowed">
            <input
              type="checkbox"
              checked={false}
              disabled
              className="h-4 w-4 rounded border-input text-primary focus:ring-primary cursor-not-allowed"
            />
            <div>
              <p className="text-sm font-medium">New messages</p>
              <p className="text-xs text-muted-foreground">
                Receive an SMS when someone messages you
              </p>
            </div>
          </label>

          <label className="flex items-center gap-3 cursor-not-allowed">
            <input
              type="checkbox"
              checked={false}
              disabled
              className="h-4 w-4 rounded border-input text-primary focus:ring-primary cursor-not-allowed"
            />
            <div>
              <p className="text-sm font-medium">Listing activity</p>
              <p className="text-xs text-muted-foreground">
                Receive an SMS when someone responds to your listing
              </p>
            </div>
          </label>
        </div>

        <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/30 px-3 py-2">
          <p className="text-xs text-amber-800 dark:text-amber-200">
            Email notification preferences are currently being set up. Your selections will be saved once the backend integration is complete.
          </p>
        </div>
      </div>
    </section>
  );
}

function BlockedUsersSection() {
  const [blockedUsers, setBlockedUsers] = useState<UserBrief[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [unblockingId, setUnblockingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    getBlockedUsers()
      .then((users) => {
        if (!cancelled) setBlockedUsers(users);
      })
      .catch(() => {
        if (!cancelled) setBlockedUsers([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleUnblock(userId: string) {
    setUnblockingId(userId);
    try {
      await unblockUser(userId);
      setBlockedUsers((prev) => prev.filter((u) => u.id !== userId));
    } catch {
      // Silently handle error; user can retry
    } finally {
      setUnblockingId(null);
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <ShieldOff className="h-5 w-5 text-muted-foreground" />
        <h2 className="text-lg font-semibold">Blocked users</h2>
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading...
        </div>
      )}

      {!isLoading && blockedUsers.length === 0 && (
        <p className="text-sm text-muted-foreground">
          You haven&apos;t blocked anyone.
        </p>
      )}

      {!isLoading && blockedUsers.length > 0 && (
        <ul className="space-y-2 max-w-md">
          {blockedUsers.map((blockedUser) => {
            const initials = blockedUser.display_name
              .split(" ")
              .map((w) => w[0])
              .join("")
              .slice(0, 2)
              .toUpperCase();

            return (
              <li
                key={blockedUser.id}
                className="flex items-center justify-between rounded-md border border-border bg-card px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  {blockedUser.avatar_url ? (
                    <Image
                      src={blockedUser.avatar_url}
                      alt={blockedUser.display_name}
                      width={32}
                      height={32}
                      className="h-8 w-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-medium">
                      {initials}
                    </div>
                  )}
                  <span className="text-sm font-medium">
                    {blockedUser.display_name}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleUnblock(blockedUser.id)}
                  disabled={unblockingId === blockedUser.id}
                  className={cn(
                    "inline-flex h-7 items-center gap-1.5 rounded-md border border-input bg-background px-2",
                    "text-xs font-medium hover:bg-accent transition-colors",
                    "disabled:opacity-50 disabled:pointer-events-none",
                  )}
                >
                  {unblockingId === blockedUser.id ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <UserX className="h-3 w-3" />
                  )}
                  Unblock
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function DeleteAccountSection() {
  const router = useRouter();
  const { logout } = useAuth();
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setError(null);
    setIsDeleting(true);
    try {
      await deleteAccount();
      await logout();
      router.push("/register");
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.detail);
      } else {
        setError("Failed to delete account. Please try again.");
      }
      setIsDeleting(false);
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <Trash2 className="h-5 w-5 text-destructive" />
        <h2 className="text-lg font-semibold text-destructive">
          {t.profile.deleteAccountLabel}
        </h2>
      </div>
      <p className="text-sm text-muted-foreground max-w-md">
        {t.profile.deleteAccountWarning}
      </p>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive max-w-md">
          {error}
        </div>
      )}

      {!showConfirm ? (
        <button
          type="button"
          onClick={() => setShowConfirm(true)}
          className={cn(
            "inline-flex h-10 items-center justify-center gap-2 rounded-md",
            "border border-destructive/50 bg-destructive/10 px-4 py-2",
            "text-sm font-medium text-destructive",
            "hover:bg-destructive/20 transition-colors",
          )}
        >
          <Trash2 className="h-4 w-4" />
          Delete my account
        </button>
      ) : (
        <div className="space-y-3 max-w-md rounded-lg border border-destructive/30 bg-destructive/5 p-4">
          <p className="text-sm font-medium text-destructive">
            This action is permanent and cannot be undone. All your listings, messages, and profile data will be deleted.
          </p>
          <div className="space-y-2">
            <label htmlFor="confirm_delete" className="text-sm text-muted-foreground">
              Type <span className="font-mono font-semibold text-foreground">DELETE</span> to confirm
            </label>
            <input
              id="confirm_delete"
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              disabled={isDeleting}
              placeholder="DELETE"
              className={cn(
                "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm",
                "placeholder:text-muted-foreground",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive focus-visible:ring-offset-2",
                "disabled:cursor-not-allowed disabled:opacity-50",
              )}
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleDelete}
              disabled={confirmText !== "DELETE" || isDeleting}
              className={cn(
                "inline-flex h-10 items-center justify-center gap-2 rounded-md",
                "bg-destructive px-4 py-2",
                "text-sm font-medium text-destructive-foreground",
                "hover:bg-destructive/90 transition-colors",
                "disabled:pointer-events-none disabled:opacity-50",
              )}
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              {isDeleting ? "Deleting..." : "Permanently delete account"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowConfirm(false);
                setConfirmText("");
                setError(null);
              }}
              disabled={isDeleting}
              className={cn(
                "inline-flex h-10 items-center justify-center rounded-md",
                "border border-input bg-background px-4 py-2",
                "text-sm font-medium",
                "hover:bg-accent transition-colors",
                "disabled:pointer-events-none disabled:opacity-50",
              )}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

export default function SettingsPage() {
  return (
    <ProtectedPage>
    <div className="mx-auto max-w-2xl px-4 py-8 space-y-10">
      <h1 className="text-2xl font-bold">{t.profile.settings}</h1>

      <ChangePasswordSection />
      <hr className="border-border" />
      <NotificationPreferencesSection />
      <hr className="border-border" />
      <BlockedUsersSection />
      <hr className="border-border" />
      <DeleteAccountSection />
    </div>
    </ProtectedPage>
  );
}
