"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import {
  Camera,
  Pencil,
  Loader2,
  ListOrdered,
  Heart,
  Settings,
  CalendarDays,
  Package,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { en as t } from "@/lib/i18n/en";
import { useAuth } from "@/lib/hooks/use-auth";
import { updateProfile } from "@/lib/api/users";
import { uploadFile } from "@/lib/api/uploads";
import type { UpdateProfileRequest } from "@/lib/types";
import { ApiError } from "@/lib/api/client";
import { ProtectedPage } from "@/components/auth/ProtectedPage";

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [displayName, setDisplayName] = useState(user?.display_name ?? "");
  const [bio, setBio] = useState(user?.bio ?? "");
  const [classYear, setClassYear] = useState<string>(
    user?.class_year ? String(user.class_year) : "",
  );

  function startEditing() {
    setDisplayName(user?.display_name ?? "");
    setBio(user?.bio ?? "");
    setClassYear(user?.class_year ? String(user.class_year) : "");
    setSaveError(null);
    setIsEditing(true);
  }

  function cancelEditing() {
    setIsEditing(false);
    setSaveError(null);
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaveError(null);
    setIsSaving(true);

    const payload: UpdateProfileRequest = {
      display_name: displayName.trim(),
      bio: bio.trim() || null,
      class_year: classYear ? Number(classYear) : null,
    };

    try {
      await updateProfile(payload);
      await refreshUser();
      setIsEditing(false);
    } catch (err) {
      if (err instanceof ApiError) {
        setSaveError(err.detail);
      } else {
        setSaveError(t.errors.generic);
      }
    } finally {
      setIsSaving(false);
    }
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingAvatar(true);
    try {
      await uploadFile(file, "avatar");
      await refreshUser();
    } catch {
      // Avatar upload errors are silently handled; the user can try again
    } finally {
      setIsUploadingAvatar(false);
    }
  }

  if (!user) {
    return (
      <ProtectedPage>
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
      </ProtectedPage>
    );
  }

  const initials = user.display_name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const memberSince = new Date(user.created_at).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  return (
    <ProtectedPage>
    <div className="mx-auto max-w-2xl px-4 py-8 space-y-8">
      {/* Profile Header */}
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:gap-6">
        {/* Avatar */}
        <div className="relative group">
          {user.avatar_url ? (
            <img
              src={user.avatar_url}
              alt={user.display_name}
              className="h-24 w-24 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary/10 text-2xl font-bold text-primary">
              {initials}
            </div>
          )}

          {/* Change overlay */}
          <label
            className={cn(
              "absolute inset-0 flex cursor-pointer items-center justify-center rounded-full",
              "bg-black/50 text-white opacity-0 transition-opacity",
              "group-hover:opacity-100",
              isUploadingAvatar && "opacity-100",
            )}
          >
            {isUploadingAvatar ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <Camera className="h-6 w-6" />
            )}
            <input
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="sr-only"
              disabled={isUploadingAvatar}
            />
          </label>
        </div>

        {/* Info */}
        <div className="flex-1 text-center sm:text-left space-y-2">
          {!isEditing ? (
            <>
              <h1 className="text-2xl font-bold">{user.display_name}</h1>
              {user.class_year && (
                <p className="text-sm text-muted-foreground">
                  {t.profile.classOf.replace("{year}", String(user.class_year))}
                </p>
              )}
              {user.bio && (
                <p className="text-sm text-muted-foreground">{user.bio}</p>
              )}

              {/* Stats */}
              <div className="flex items-center gap-4 justify-center sm:justify-start pt-1">
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Package className="h-4 w-4" />
                  {t.profile.listingsCount.replace(
                    "{count}",
                    String(user.listing_count),
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <CalendarDays className="h-4 w-4" />
                  {t.profile.memberSince.replace("{date}", memberSince)}
                </div>
              </div>

              <button
                type="button"
                onClick={startEditing}
                className={cn(
                  "inline-flex items-center gap-2 rounded-md border border-input bg-background px-3 py-1.5",
                  "text-sm font-medium",
                  "hover:bg-accent hover:text-accent-foreground transition-colors",
                  "mt-2",
                )}
              >
                <Pencil className="h-3.5 w-3.5" />
                {t.profile.editProfile}
              </button>
            </>
          ) : (
            /* Edit form */
            <form onSubmit={handleSave} className="space-y-4 w-full">
              {saveError && (
                <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {saveError}
                </div>
              )}

              <div className="space-y-2">
                <label htmlFor="edit-name" className="text-sm font-medium">
                  {t.auth.displayNameLabel}
                </label>
                <input
                  id="edit-name"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  disabled={isSaving}
                  className={cn(
                    "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    "disabled:cursor-not-allowed disabled:opacity-50",
                  )}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="edit-year" className="text-sm font-medium">
                  Class year
                </label>
                <select
                  id="edit-year"
                  value={classYear}
                  onChange={(e) => setClassYear(e.target.value)}
                  disabled={isSaving}
                  className={cn(
                    "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    "disabled:cursor-not-allowed disabled:opacity-50",
                  )}
                >
                  <option value="">No class year</option>
                  {Array.from({ length: 12 }, (_, i) => 2024 + i).map(
                    (year) => (
                      <option key={year} value={String(year)}>
                        Class of {year}
                      </option>
                    ),
                  )}
                </select>
              </div>

              <div className="space-y-2">
                <label htmlFor="edit-bio" className="text-sm font-medium">
                  Bio
                </label>
                <textarea
                  id="edit-bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={3}
                  maxLength={500}
                  disabled={isSaving}
                  placeholder="Tell others about yourself..."
                  className={cn(
                    "flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm",
                    "placeholder:text-muted-foreground",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    "disabled:cursor-not-allowed disabled:opacity-50",
                    "resize-none",
                  )}
                />
                <p className="text-xs text-muted-foreground text-right">
                  {bio.length}/500
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={isSaving}
                  className={cn(
                    "inline-flex h-9 items-center justify-center gap-2 rounded-md bg-primary px-4 py-2",
                    "text-sm font-medium text-primary-foreground",
                    "hover:bg-primary/90 transition-colors",
                    "disabled:pointer-events-none disabled:opacity-50",
                  )}
                >
                  {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {t.common.save}
                </button>
                <button
                  type="button"
                  onClick={cancelEditing}
                  disabled={isSaving}
                  className={cn(
                    "inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-4 py-2",
                    "text-sm font-medium",
                    "hover:bg-accent hover:text-accent-foreground transition-colors",
                    "disabled:pointer-events-none disabled:opacity-50",
                  )}
                >
                  {t.common.cancel}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Navigation Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Link
          href="/profile/listings"
          className={cn(
            "flex items-center gap-3 rounded-lg border border-border bg-card p-4",
            "hover:bg-accent/50 transition-colors",
          )}
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <ListOrdered className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium">{t.profile.myListings}</p>
            <p className="text-xs text-muted-foreground">
              Manage your posts
            </p>
          </div>
        </Link>

        <Link
          href="/profile/saved"
          className={cn(
            "flex items-center gap-3 rounded-lg border border-border bg-card p-4",
            "hover:bg-accent/50 transition-colors",
          )}
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Heart className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium">{t.profile.savedListings}</p>
            <p className="text-xs text-muted-foreground">
              Your favorites
            </p>
          </div>
        </Link>

        <Link
          href="/profile/settings"
          className={cn(
            "flex items-center gap-3 rounded-lg border border-border bg-card p-4",
            "hover:bg-accent/50 transition-colors",
          )}
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Settings className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium">{t.profile.settings}</p>
            <p className="text-xs text-muted-foreground">
              Account settings
            </p>
          </div>
        </Link>
      </div>
    </div>
    </ProtectedPage>
  );
}
