"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import { Loader2, ArrowLeft, Mail } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { en as t } from "@/lib/i18n/en";
import { forgotPasswordSchema } from "@/lib/validation/auth";
import { forgotPassword } from "@/lib/api/auth";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const result = forgotPasswordSchema.safeParse({ email });
    if (!result.success) {
      setError(result.error.issues[0].message);
      return;
    }

    setIsSubmitting(true);
    try {
      await forgotPassword(result.data.email);
    } catch {
      // Intentionally swallow errors -- never leak whether an account exists
    } finally {
      setIsSubmitting(false);
      setIsSubmitted(true);
    }
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
              {t.auth.resetPasswordTitle}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {t.auth.resetPasswordSubtitle}
            </p>
          </div>
        </div>

        {isSubmitted ? (
          /* Success message */
          <div className="space-y-6">
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
                <Mail className="h-8 w-8 text-success" />
              </div>
              <div className="text-center space-y-1">
                <p className="text-lg font-medium">Check your email</p>
                <p className="text-sm text-muted-foreground">
                  If an account exists with that email, we have sent a password
                  reset link.
                </p>
              </div>
              <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/50 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
                <p className="font-medium">Can&apos;t find the email?</p>
                <p className="mt-1 text-amber-700 dark:text-amber-300">
                  Check your spam or junk folder. University email filters may flag password reset emails.
                </p>
              </div>
            </div>

            <Link
              href="/login"
              className={cn(
                "inline-flex h-10 w-full items-center justify-center gap-2 rounded-md",
                "border border-input bg-background px-4 py-2",
                "text-sm font-medium",
                "hover:bg-accent hover:text-accent-foreground transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              )}
            >
              <ArrowLeft className="h-4 w-4" />
              Back to login
            </Link>
          </div>
        ) : (
          /* Form */
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label
                htmlFor="email"
                className="text-sm font-medium leading-none"
              >
                {t.auth.emailLabel}
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError(null);
                }}
                placeholder="you@university.edu"
                disabled={isSubmitting}
                className={cn(
                  "flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm",
                  "placeholder:text-muted-foreground",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  "disabled:cursor-not-allowed disabled:opacity-50",
                  error ? "border-destructive" : "border-input",
                )}
              />
              {error && (
                <p className="text-xs text-destructive">{error}</p>
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
                <Mail className="h-4 w-4" />
              )}
              {isSubmitting ? t.common.loading : "Send reset link"}
            </button>

            <Link
              href="/login"
              className="flex items-center justify-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-3 w-3" />
              Back to login
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
