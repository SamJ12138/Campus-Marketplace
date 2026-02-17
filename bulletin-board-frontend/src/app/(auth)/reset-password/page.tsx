"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Loader2, KeyRound, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { en as t } from "@/lib/i18n/en";
import { resetPasswordSchema } from "@/lib/validation/auth";
import { resetPassword } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") ?? "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErrors({});
    setServerError(null);

    const result = resetPasswordSchema.safeParse({
      token,
      new_password: newPassword,
      confirm_password: confirmPassword,
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
      await resetPassword(result.data.token, result.data.new_password);
      setIsSuccess(true);
      setTimeout(() => {
        router.push("/login");
      }, 5000);
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

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 py-12">
        <div className="w-full max-w-md text-center space-y-4">
          <p className="text-muted-foreground">
            Invalid or missing reset token. Please request a new password reset
            link.
          </p>
          <Link
            href="/forgot-password"
            className="text-sm font-medium text-primary hover:underline"
          >
            Request new link
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-8">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Image src="/images/logo.png" alt="GimmeDat" width={32} height={32} className="h-8 w-8 object-contain" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight">
              Set new password
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Choose a strong password for your account
            </p>
          </div>
        </div>

        {isSuccess ? (
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
              <CheckCircle2 className="h-8 w-8 text-success" />
            </div>
            <div className="text-center space-y-2">
              <p className="text-lg font-medium">Password reset!</p>
              <p className="text-sm text-muted-foreground">
                Redirecting to login...
              </p>
              <a
                href="/login"
                className="text-sm font-medium text-primary hover:underline"
              >
                Click here if not redirected
              </a>
            </div>
          </div>
        ) : (
          <>
            {/* Server Error */}
            {serverError && (
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {serverError}
              </div>
            )}

            {/* Token error */}
            {errors.token && (
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {errors.token}{" "}
                <Link
                  href="/forgot-password"
                  className="underline font-medium"
                >
                  Request a new link
                </Link>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* New Password */}
              <div className="space-y-2">
                <label
                  htmlFor="new_password"
                  className="text-sm font-medium leading-none"
                >
                  {t.auth.newPasswordLabel}
                </label>
                <div className="relative">
                  <input
                    id="new_password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter your new password"
                    disabled={isSubmitting}
                    className={cn(
                      "flex h-10 w-full rounded-md border bg-background px-3 py-2 pr-10 text-sm",
                      "placeholder:text-muted-foreground",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                      "disabled:cursor-not-allowed disabled:opacity-50",
                      errors.new_password
                        ? "border-destructive"
                        : "border-input",
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.new_password && (
                  <p className="text-xs text-destructive">
                    {errors.new_password}
                  </p>
                )}
              </div>

              {/* Confirm Password */}
              <div className="space-y-2">
                <label
                  htmlFor="confirm_password"
                  className="text-sm font-medium leading-none"
                >
                  {t.auth.confirmPasswordLabel}
                </label>
                <input
                  id="confirm_password"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your new password"
                  disabled={isSubmitting}
                  className={cn(
                    "flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm",
                    "placeholder:text-muted-foreground",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    "disabled:cursor-not-allowed disabled:opacity-50",
                    errors.confirm_password
                      ? "border-destructive"
                      : "border-input",
                  )}
                />
                {errors.confirm_password && (
                  <p className="text-xs text-destructive">
                    {errors.confirm_password}
                  </p>
                )}
              </div>

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
                  <KeyRound className="h-4 w-4" />
                )}
                {isSubmitting ? t.common.loading : "Reset password"}
              </button>
            </form>
          </>
        )}

        <p className="text-center text-sm text-muted-foreground">
          <Link
            href="/login"
            className="font-medium text-primary hover:underline"
          >
            Back to login
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordContent />
    </Suspense>
  );
}
