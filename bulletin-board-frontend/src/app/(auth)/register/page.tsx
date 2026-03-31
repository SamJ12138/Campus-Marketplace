"use client";

import { Suspense, useState, useEffect, useRef, useCallback, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { Loader2, ArrowLeft, Mail, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { safeRedirect } from "@/lib/utils/format";
import { en as t } from "@/lib/i18n/en";
import { useAuth } from "@/lib/hooks/use-auth";
import { requestCodeSchema } from "@/lib/validation/auth";
import { ApiError } from "@/lib/api/client";

type Step = "username" | "code";

function AuthContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = safeRedirect(searchParams.get("redirect"), "");
  const { requestCode, verifyCode } = useAuth();

  const [step, setStep] = useState<Step>("username");
  const [username, setUsername] = useState("");
  const [code, setCode] = useState("");
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [countdown, setCountdown] = useState(0);

  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const codeInputRef = useRef<HTMLInputElement>(null);

  // Countdown timer
  useEffect(() => {
    if (!expiresAt) return;
    const tick = () => {
      const remaining = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
      setCountdown(remaining);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  // Resend cooldown
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  // Auto-submit when 6 digits entered
  useEffect(() => {
    if (code.length === 6 && step === "code" && !isSubmitting) {
      handleVerifyCode();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  const handleRequestCode = useCallback(async (e?: FormEvent) => {
    e?.preventDefault();
    setErrors({});
    setServerError(null);

    const result = requestCodeSchema.safeParse({ username: username.trim() });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const key = String(issue.path[0]);
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      const resp = await requestCode(result.data.username);
      setExpiresAt(Date.now() + resp.expires_in * 1000);
      setCode("");
      setStep("code");
      setResendCooldown(30);
      setTimeout(() => codeInputRef.current?.focus(), 100);
    } catch (err) {
      if (err instanceof ApiError) {
        setServerError(err.detail);
      } else {
        setServerError(t.errors.generic);
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [username, requestCode]);

  async function handleVerifyCode(e?: FormEvent) {
    e?.preventDefault();
    if (code.length !== 6) return;

    setErrors({});
    setServerError(null);
    setIsSubmitting(true);

    try {
      await verifyCode(username.trim().toLowerCase(), code);
      router.push(redirectTo || "/feed");
    } catch (err) {
      if (err instanceof ApiError) {
        setServerError(err.detail);
      } else {
        setServerError(t.errors.generic);
      }
      setCode("");
      codeInputRef.current?.focus();
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResend() {
    if (resendCooldown > 0) return;
    setServerError(null);
    setIsSubmitting(true);
    try {
      const resp = await requestCode(username.trim());
      setExpiresAt(Date.now() + resp.expires_in * 1000);
      setCode("");
      setResendCooldown(30);
      codeInputRef.current?.focus();
    } catch (err) {
      if (err instanceof ApiError) {
        setServerError(err.detail);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-8">
        {/* Back button */}
        <button
          type="button"
          onClick={() => {
            if (redirectTo) {
              router.push(redirectTo);
            } else if (window.history.length > 1) {
              router.back();
            } else {
              router.push("/feed");
            }
          }}
          className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Image src="/images/logo-v2.png" alt="GimmeDat" width={32} height={32} className="h-8 w-8 object-contain" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight">
              {step === "username" ? "Welcome to GimmeDat" : "Check your email"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {step === "username"
                ? "Enter your Gettysburg username to sign in or create an account"
                : (
                  <>
                    We sent a 6-digit code to{" "}
                    <span className="font-medium text-foreground">
                      {username.trim().toLowerCase()}@gettysburg.edu
                    </span>
                  </>
                )}
            </p>
          </div>
        </div>

        {/* Server Error */}
        {serverError && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {serverError}
          </div>
        )}

        {step === "username" ? (
          /* ── Step 1: Username ── */
          <form onSubmit={handleRequestCode} className="space-y-5">
            <div className="space-y-2">
              <label htmlFor="username" className="text-sm font-medium leading-none">
                Gettysburg username
              </label>
              <div
                className={cn(
                  "flex h-10 w-full rounded-md border bg-background text-sm overflow-hidden",
                  "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
                  errors.username ? "border-destructive" : "border-input",
                )}
              >
                <input
                  id="username"
                  type="text"
                  autoComplete="username"
                  autoFocus
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    setErrors({});
                  }}
                  placeholder="you"
                  disabled={isSubmitting}
                  className={cn(
                    "flex-1 bg-transparent px-3 py-2 outline-none",
                    "placeholder:text-muted-foreground",
                    "disabled:cursor-not-allowed disabled:opacity-50",
                  )}
                />
                <span className="flex items-center border-l border-input bg-muted px-2 text-xs text-muted-foreground select-none whitespace-nowrap sm:px-3 sm:text-sm">
                  @gettysburg.edu
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Type just your Gettysburg username
              </p>
              {errors.username && (
                <p className="text-xs text-destructive">{errors.username}</p>
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
              {isSubmitting ? "Sending code..." : "Continue"}
            </button>

            <p className="text-xs text-center text-muted-foreground">
              By continuing, you agree to our{" "}
              <Link href="/terms" target="_blank" className="text-primary hover:underline">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link href="/privacy" target="_blank" className="text-primary hover:underline">
                Privacy Policy
              </Link>
              .
            </p>
          </form>
        ) : (
          /* ── Step 2: Code ── */
          <form onSubmit={handleVerifyCode} className="space-y-5">
            <div className="space-y-2">
              <label htmlFor="code" className="text-sm font-medium leading-none">
                Verification code
              </label>
              <input
                ref={codeInputRef}
                id="code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                  setCode(val);
                  setErrors({});
                  setServerError(null);
                }}
                placeholder="000000"
                disabled={isSubmitting}
                className={cn(
                  "flex h-14 w-full rounded-md border bg-background px-4 py-2",
                  "text-center text-2xl font-bold tracking-[0.3em] font-mono",
                  "placeholder:text-muted-foreground/40 placeholder:tracking-[0.3em]",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  "disabled:cursor-not-allowed disabled:opacity-50",
                  errors.code ? "border-destructive" : "border-input",
                )}
              />
              {errors.code && (
                <p className="text-xs text-destructive">{errors.code}</p>
              )}

              {/* Countdown */}
              <div className="flex items-center justify-center text-xs text-muted-foreground">
                {countdown > 0 ? (
                  <span>Code expires in {formatTime(countdown)}</span>
                ) : (
                  <span className="text-destructive">Code expired</span>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || code.length !== 6}
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
              ) : null}
              {isSubmitting ? "Verifying..." : "Verify & Sign In"}
            </button>

            {/* Resend code */}
            <button
              type="button"
              onClick={handleResend}
              disabled={resendCooldown > 0 || isSubmitting}
              className={cn(
                "inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-input bg-background px-4 py-2",
                "text-sm font-medium",
                "hover:bg-accent hover:text-accent-foreground transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                "disabled:pointer-events-none disabled:opacity-50",
              )}
            >
              <RefreshCw className="h-4 w-4" />
              {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : "Resend verification code"}
            </button>

            {/* Back to username */}
            <button
              type="button"
              onClick={() => {
                setStep("username");
                setCode("");
                setServerError(null);
                setErrors({});
              }}
              className="flex w-full items-center justify-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Use a different username
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <AuthContent />
    </Suspense>
  );
}
