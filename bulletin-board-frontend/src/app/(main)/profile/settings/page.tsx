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
  Clock,
  Mail,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { en as t } from "@/lib/i18n/en";
import { changePasswordSchema } from "@/lib/validation/auth";
import { changePassword, deleteAccount, getNotificationPreferences, updateNotificationPreferences } from "@/lib/api/users";
import type { NotificationPreferences, DigestFrequency } from "@/lib/api/users";
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
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    getNotificationPreferences()
      .then(setPrefs)
      .catch(() => {
        setPrefs({
          email_messages: true,
          email_listing_replies: true,
          email_report_updates: true,
          email_marketing: false,
          digest_frequency: "weekly",
          email_price_drops: true,
          email_listing_expiry: true,
          email_recommendations: false,
          quiet_hours_start: null,
          quiet_hours_end: null,
        });
      })
      .finally(() => setIsLoading(false));
  }, []);

  async function handleToggle(key: keyof NotificationPreferences, value: boolean) {
    if (!prefs) return;
    const prev = { ...prefs };
    setPrefs({ ...prefs, [key]: value } as NotificationPreferences);
    setIsSaving(true);
    try {
      const updated = await updateNotificationPreferences({ [key]: value });
      setPrefs(updated);
    } catch {
      setPrefs(prev);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDigestFrequency(freq: DigestFrequency) {
    if (!prefs) return;
    const prev = { ...prefs };
    setPrefs({ ...prefs, digest_frequency: freq });
    setIsSaving(true);
    try {
      const updated = await updateNotificationPreferences({ digest_frequency: freq });
      setPrefs(updated);
    } catch {
      setPrefs(prev);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleQuietHours(field: "quiet_hours_start" | "quiet_hours_end", value: number | null) {
    if (!prefs) return;
    const prev = { ...prefs };
    setPrefs({ ...prefs, [field]: value });
    setIsSaving(true);
    try {
      const updated = await updateNotificationPreferences({ [field]: value });
      setPrefs(updated);
    } catch {
      setPrefs(prev);
    } finally {
      setIsSaving(false);
    }
  }

  const emailOptions = [
    { key: "email_messages" as const, label: "New messages", desc: "Receive an email when someone messages you" },
    { key: "email_listing_replies" as const, label: "Listing activity", desc: "Receive an email when someone responds to your listing" },
    { key: "email_report_updates" as const, label: "Report updates", desc: "Receive an email when a report you filed is reviewed" },
    { key: "email_marketing" as const, label: "Campus updates", desc: "Occasional updates about new features and campus activity" },
  ];

  const smartOptions = [
    { key: "email_price_drops" as const, label: "Price drop alerts", desc: "Get notified when a favorited listing updates its price" },
    { key: "email_listing_expiry" as const, label: "Expiry reminders", desc: "Get reminded when your listings are about to expire" },
    { key: "email_recommendations" as const, label: "Recommendations", desc: "Receive personalized listing recommendations" },
  ];

  const digestFrequencyOptions: { value: DigestFrequency; label: string }[] = [
    { value: "none", label: "Off" },
    { value: "daily", label: "Daily" },
    { value: "weekly", label: "Weekly" },
  ];

  const hourOptions = Array.from({ length: 24 }, (_, i) => ({
    value: i,
    label: `${i === 0 ? 12 : i > 12 ? i - 12 : i}:00 ${i < 12 ? "AM" : "PM"}`,
  }));

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <Bell className="h-5 w-5 text-muted-foreground" />
        <h2 className="text-lg font-semibold">{t.profile.notificationsLabel}</h2>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading preferences...
        </div>
      ) : prefs ? (
        <div className="space-y-6 max-w-md">
          {/* Email notifications */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-medium text-muted-foreground">Email notifications</p>
            </div>

            {emailOptions.map((opt) => (
              <label key={opt.key} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!prefs[opt.key]}
                  onChange={(e) => handleToggle(opt.key, e.target.checked)}
                  disabled={isSaving}
                  className="h-4 w-4 rounded border-input text-primary focus:ring-primary disabled:opacity-50"
                />
                <div>
                  <p className="text-sm font-medium">{opt.label}</p>
                  <p className="text-xs text-muted-foreground">{opt.desc}</p>
                </div>
              </label>
            ))}
          </div>

          {/* Smart notifications */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-medium text-muted-foreground">Smart notifications</p>
            </div>

            {smartOptions.map((opt) => (
              <label key={opt.key} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!prefs[opt.key]}
                  onChange={(e) => handleToggle(opt.key, e.target.checked)}
                  disabled={isSaving}
                  className="h-4 w-4 rounded border-input text-primary focus:ring-primary disabled:opacity-50"
                />
                <div>
                  <p className="text-sm font-medium">{opt.label}</p>
                  <p className="text-xs text-muted-foreground">{opt.desc}</p>
                </div>
              </label>
            ))}
          </div>

          {/* Digest frequency */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-medium text-muted-foreground">Digest emails</p>
            </div>
            <p className="text-xs text-muted-foreground">
              Get a summary of new listings, updates, and activity on your campus.
            </p>
            <div className="flex gap-2">
              {digestFrequencyOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleDigestFrequency(opt.value)}
                  disabled={isSaving}
                  className={cn(
                    "inline-flex h-8 items-center rounded-md border px-3 text-sm font-medium transition-colors",
                    "disabled:pointer-events-none disabled:opacity-50",
                    prefs.digest_frequency === opt.value
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-input bg-background hover:bg-accent",
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Quiet hours */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-medium text-muted-foreground">Quiet hours</p>
            </div>
            <p className="text-xs text-muted-foreground">
              Pause non-urgent emails during these hours (UTC).
            </p>
            <div className="flex items-center gap-2">
              <select
                value={prefs.quiet_hours_start ?? ""}
                onChange={(e) => {
                  const val = e.target.value === "" ? null : Number(e.target.value);
                  handleQuietHours("quiet_hours_start", val);
                }}
                disabled={isSaving}
                className={cn(
                  "flex h-9 rounded-md border border-input bg-background px-2 py-1 text-sm",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  "disabled:cursor-not-allowed disabled:opacity-50",
                )}
              >
                <option value="">Off</option>
                {hourOptions.map((h) => (
                  <option key={h.value} value={h.value}>{h.label}</option>
                ))}
              </select>
              <span className="text-sm text-muted-foreground">to</span>
              <select
                value={prefs.quiet_hours_end ?? ""}
                onChange={(e) => {
                  const val = e.target.value === "" ? null : Number(e.target.value);
                  handleQuietHours("quiet_hours_end", val);
                }}
                disabled={isSaving}
                className={cn(
                  "flex h-9 rounded-md border border-input bg-background px-2 py-1 text-sm",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  "disabled:cursor-not-allowed disabled:opacity-50",
                )}
              >
                <option value="">Off</option>
                {hourOptions.map((h) => (
                  <option key={h.value} value={h.value}>{h.label}</option>
                ))}
              </select>
            </div>
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
          </div>
        </div>
      ) : null}
    </section>
  );
}

function BlockedUsersSection() {
  const [blockedUsers, setBlockedUsers] = useState<UserBrief[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [unblockingId, setUnblockingId] = useState<string | null>(null);
  const [unblockError, setUnblockError] = useState<string | null>(null);

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
    setUnblockError(null);
    try {
      await unblockUser(userId);
      setBlockedUsers((prev) => prev.filter((u) => u.id !== userId));
    } catch {
      setUnblockError("Failed to unblock user. Please try again.");
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

      {unblockError && (
        <p className="text-sm text-destructive">{unblockError}</p>
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
