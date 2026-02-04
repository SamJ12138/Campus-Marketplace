"use client";

import { useState, useMemo, useEffect, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, UserPlus, GraduationCap, Check, X, Phone } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { en as t } from "@/lib/i18n/en";
import { useAuth } from "@/lib/hooks/use-auth";
import { registerSchema, type RegisterInput } from "@/lib/validation/auth";
import { ApiError } from "@/lib/api/client";
import { getCampuses } from "@/lib/api/auth";
import type { Campus } from "@/lib/types";

const FALLBACK_CAMPUSES: Campus[] = [
  { id: "gettysburg", name: "Gettysburg College", domain: "gettysburg.edu", slug: "gettysburg" },
];

const CLASS_YEARS = Array.from({ length: 12 }, (_, i) => 2024 + i);

interface PasswordRule {
  label: string;
  test: (pw: string) => boolean;
}

const PASSWORD_RULES: PasswordRule[] = [
  { label: "At least 8 characters", test: (pw) => pw.length >= 8 },
  { label: "One uppercase letter", test: (pw) => /[A-Z]/.test(pw) },
  { label: "One lowercase letter", test: (pw) => /[a-z]/.test(pw) },
  { label: "One digit", test: (pw) => /[0-9]/.test(pw) },
];

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "";
  const { register } = useAuth();

  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [campusesLoading, setCampusesLoading] = useState(true);

  useEffect(() => {
    getCampuses()
      .then((data) => {
        setCampuses(data.length > 0 ? data : FALLBACK_CAMPUSES);
      })
      .catch(() => setCampuses(FALLBACK_CAMPUSES))
      .finally(() => setCampusesLoading(false));
  }, []);

  const [form, setForm] = useState({
    email: "",
    password: "",
    display_name: "",
    campus_slug: "",
    class_year: "" as string,
    phone_number: "",
    notify_email: true,
    notify_sms: true,
    accept_terms: false,
  });

  const selectedCampus = campuses.find((c) => c.slug === form.campus_slug);

  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const passwordChecks = useMemo(
    () => PASSWORD_RULES.map((rule) => ({ ...rule, met: rule.test(form.password) })),
    [form.password],
  );

  const passwordStrength = useMemo(() => {
    const metCount = passwordChecks.filter((c) => c.met).length;
    if (metCount === 0) return 0;
    return Math.round((metCount / PASSWORD_RULES.length) * 100);
  }, [passwordChecks]);

  function updateField(field: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErrors({});
    setServerError(null);

    const payload = {
      ...form,
      class_year: form.class_year ? Number(form.class_year) : null,
      phone_number: form.phone_number || undefined,
    };

    const result = registerSchema.safeParse(payload);
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
      const phoneNum = result.data.phone_number && result.data.phone_number !== ""
        ? result.data.phone_number
        : undefined;
      await register(
        result.data.email,
        result.data.password,
        result.data.display_name,
        result.data.campus_slug,
        result.data.class_year ?? undefined,
        phoneNum,
        { notify_email: result.data.notify_email, notify_sms: result.data.notify_sms },
      );
      router.push(redirectTo ? `/verify-email?redirect=${encodeURIComponent(redirectTo)}` : "/verify-email");
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
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-8">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <GraduationCap className="h-8 w-8" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight">
              {t.auth.registerTitle}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {t.auth.registerSubtitle}
            </p>
          </div>
        </div>

        {/* Server Error */}
        {serverError && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {serverError}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email */}
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium leading-none">
              {t.auth.emailLabel}
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={(e) => updateField("email", e.target.value)}
              placeholder="you@university.edu"
              disabled={isSubmitting}
              className={cn(
                "flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm",
                "placeholder:text-muted-foreground",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                "disabled:cursor-not-allowed disabled:opacity-50",
                errors.email ? "border-destructive" : "border-input",
              )}
            />
            <p className="text-xs text-muted-foreground">
              Use your .edu email
            </p>
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email}</p>
            )}
          </div>

          {/* Password */}
          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium leading-none">
              {t.auth.passwordLabel}
            </label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              value={form.password}
              onChange={(e) => updateField("password", e.target.value)}
              placeholder="Create a strong password"
              disabled={isSubmitting}
              className={cn(
                "flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm",
                "placeholder:text-muted-foreground",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                "disabled:cursor-not-allowed disabled:opacity-50",
                errors.password ? "border-destructive" : "border-input",
              )}
            />
            {errors.password && (
              <p className="text-xs text-destructive">{errors.password}</p>
            )}

            {/* Strength Bar */}
            {form.password.length > 0 && (
              <div className="space-y-2">
                <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-300",
                      passwordStrength <= 25 && "bg-destructive",
                      passwordStrength > 25 && passwordStrength <= 50 && "bg-warning",
                      passwordStrength > 50 && passwordStrength <= 75 && "bg-warning",
                      passwordStrength > 75 && "bg-success",
                    )}
                    style={{ width: `${passwordStrength}%` }}
                  />
                </div>

                {/* Password Rules Checklist */}
                <ul className="space-y-1">
                  {passwordChecks.map((rule) => (
                    <li
                      key={rule.label}
                      className={cn(
                        "flex items-center gap-1.5 text-xs",
                        rule.met ? "text-success" : "text-muted-foreground",
                      )}
                    >
                      {rule.met ? (
                        <Check className="h-3 w-3" />
                      ) : (
                        <X className="h-3 w-3" />
                      )}
                      {rule.label}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Display Name */}
          <div className="space-y-2">
            <label htmlFor="display_name" className="text-sm font-medium leading-none">
              {t.auth.displayNameLabel}
            </label>
            <input
              id="display_name"
              type="text"
              autoComplete="name"
              value={form.display_name}
              onChange={(e) => updateField("display_name", e.target.value)}
              placeholder="How others will see you"
              disabled={isSubmitting}
              className={cn(
                "flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm",
                "placeholder:text-muted-foreground",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                "disabled:cursor-not-allowed disabled:opacity-50",
                errors.display_name ? "border-destructive" : "border-input",
              )}
            />
            {errors.display_name && (
              <p className="text-xs text-destructive">{errors.display_name}</p>
            )}
          </div>

          {/* Campus */}
          <div className="space-y-2">
            <label htmlFor="campus_slug" className="text-sm font-medium leading-none">
              {t.auth.campusLabel}
            </label>
            <select
              id="campus_slug"
              value={form.campus_slug}
              onChange={(e) => updateField("campus_slug", e.target.value)}
              disabled={isSubmitting || campusesLoading}
              className={cn(
                "flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                "disabled:cursor-not-allowed disabled:opacity-50",
                !form.campus_slug && "text-muted-foreground",
                errors.campus_slug ? "border-destructive" : "border-input",
              )}
            >
              <option value="" disabled>
                {campusesLoading ? "Loading campuses..." : "Select your campus"}
              </option>
              {campuses.map((campus) => (
                <option key={campus.slug} value={campus.slug}>
                  {campus.name}
                </option>
              ))}
            </select>
            {selectedCampus && (
              <p className="text-xs text-muted-foreground">
                Use your @{selectedCampus.domain} email
              </p>
            )}
            {errors.campus_slug && (
              <p className="text-xs text-destructive">{errors.campus_slug}</p>
            )}
          </div>

          {/* Class Year */}
          <div className="space-y-2">
            <label htmlFor="class_year" className="text-sm font-medium leading-none">
              Class year{" "}
              <span className="font-normal text-muted-foreground">(optional)</span>
            </label>
            <select
              id="class_year"
              value={form.class_year}
              onChange={(e) => updateField("class_year", e.target.value)}
              disabled={isSubmitting}
              className={cn(
                "flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                "disabled:cursor-not-allowed disabled:opacity-50",
                !form.class_year && "text-muted-foreground",
                "border-input",
              )}
            >
              <option value="">Select class year</option>
              {CLASS_YEARS.map((year) => (
                <option key={year} value={String(year)}>
                  Class of {year}
                </option>
              ))}
            </select>
          </div>

          {/* Phone Number */}
          <div className="space-y-2">
            <label htmlFor="phone_number" className="text-sm font-medium leading-none">
              {t.auth.phoneNumberLabel}{" "}
              <span className="font-normal text-muted-foreground">
                {form.notify_sms ? "(required)" : "(optional)"}
              </span>
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                id="phone_number"
                type="tel"
                autoComplete="tel"
                value={form.phone_number}
                onChange={(e) => updateField("phone_number", e.target.value)}
                placeholder="+12345678901"
                disabled={isSubmitting}
                className={cn(
                  "flex h-10 w-full rounded-md border bg-background pl-9 pr-3 py-2 text-sm",
                  "placeholder:text-muted-foreground",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  "disabled:cursor-not-allowed disabled:opacity-50",
                  errors.phone_number ? "border-destructive" : "border-input",
                )}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {t.auth.phoneNumberHelp}
            </p>
            {errors.phone_number && (
              <p className="text-xs text-destructive">{errors.phone_number}</p>
            )}
          </div>

          {/* Notification Preferences */}
          <div className="space-y-2">
            <p className="text-sm font-medium leading-none">
              {t.auth.notificationPreferencesLabel}
            </p>
            <p className="text-xs text-muted-foreground">
              {t.auth.notificationPreferencesHelp}
            </p>
            <div className="space-y-2 pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.notify_email}
                  onChange={(e) => updateField("notify_email", e.target.checked)}
                  disabled={isSubmitting}
                  className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                />
                <span className="text-sm">Email notifications</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.notify_sms}
                  onChange={(e) => updateField("notify_sms", e.target.checked)}
                  disabled={isSubmitting}
                  className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                />
                <span className="text-sm">SMS notifications</span>
              </label>
            </div>
          </div>

          {/* Terms */}
          <div className="space-y-2">
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.accept_terms}
                onChange={(e) => updateField("accept_terms", e.target.checked)}
                disabled={isSubmitting}
                className="mt-0.5 h-4 w-4 rounded border-input text-primary focus:ring-primary"
              />
              <span className="text-sm text-muted-foreground">
                I agree to the{" "}
                <Link href="/terms" target="_blank" className="text-primary hover:underline">
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link href="/privacy" target="_blank" className="text-primary hover:underline">
                  Privacy Policy
                </Link>
              </span>
            </label>
            {errors.accept_terms && (
              <p className="text-xs text-destructive">{errors.accept_terms}</p>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting}
            className={cn(
              "inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2",
              "text-sm font-medium text-primary-foreground",
              "hover:bg-primary/90 transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              "disabled:pointer-events-none disabled:opacity-50",
            )}
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <UserPlus className="h-4 w-4" />
            )}
            {isSubmitting ? t.common.loading : t.auth.registerAction}
          </button>
        </form>

        {/* Login link */}
        <p className="text-center text-sm text-muted-foreground">
          {t.auth.hasAccount}{" "}
          <Link
            href={redirectTo ? `/login?redirect=${encodeURIComponent(redirectTo)}` : "/login"}
            className="font-medium text-primary hover:underline"
          >
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
