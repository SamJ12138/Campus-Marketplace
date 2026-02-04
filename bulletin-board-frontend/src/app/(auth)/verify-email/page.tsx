"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Loader2,
  MailCheck,
  CheckCircle2,
  XCircle,
  RefreshCw,
  GraduationCap,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { en as t } from "@/lib/i18n/en";
import { verifyEmail, resendVerification } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";

type VerifyState = "idle" | "verifying" | "success" | "error";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [state, setState] = useState<VerifyState>(token ? "verifying" : "idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [resendEmail, setResendEmail] = useState("");
  const [resendStatus, setResendStatus] = useState<
    "idle" | "sending" | "sent" | "error"
  >("idle");
  const [resendError, setResendError] = useState<string | null>(null);

  const doVerify = useCallback(
    async (verifyToken: string) => {
      setState("verifying");
      setErrorMessage(null);

      try {
        await verifyEmail(verifyToken);
        setState("success");
        setTimeout(() => {
          router.push("/login");
        }, 3000);
      } catch (err) {
        setState("error");
        if (err instanceof ApiError) {
          setErrorMessage(err.detail);
        } else {
          setErrorMessage("Verification failed. The link may be expired.");
        }
      }
    },
    [router],
  );

  useEffect(() => {
    if (token) {
      doVerify(token);
    }
  }, [token, doVerify]);

  async function handleResend() {
    if (!resendEmail.trim()) return;
    setResendStatus("sending");
    setResendError(null);

    try {
      await resendVerification(resendEmail.trim());
      setResendStatus("sent");
    } catch (err) {
      setResendStatus("error");
      if (err instanceof ApiError) {
        setResendError(err.detail);
      } else {
        setResendError(t.errors.generic);
      }
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
          <h1 className="text-2xl font-bold tracking-tight">
            {t.auth.verifyEmailTitle}
          </h1>
        </div>

        {/* Verifying spinner */}
        {state === "verifying" && (
          <div className="flex flex-col items-center gap-4 py-8">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
              Verifying your email address...
            </p>
          </div>
        )}

        {/* Success */}
        {state === "success" && (
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
              <CheckCircle2 className="h-8 w-8 text-success" />
            </div>
            <div className="text-center space-y-1">
              <p className="text-lg font-medium">Email verified!</p>
              <p className="text-sm text-muted-foreground">
                Redirecting to login...
              </p>
            </div>
          </div>
        )}

        {/* Error */}
        {state === "error" && (
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
              <XCircle className="h-8 w-8 text-destructive" />
            </div>
            <div className="text-center space-y-1">
              <p className="text-lg font-medium">Verification failed</p>
              <p className="text-sm text-muted-foreground">
                {errorMessage ||
                  "The link may be expired. Request a new one below."}
              </p>
            </div>
          </div>
        )}

        {/* Idle: no token in URL */}
        {state === "idle" && (
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <MailCheck className="h-8 w-8 text-primary" />
            </div>
            <div className="text-center space-y-1">
              <p className="text-lg font-medium">Check your email</p>
              <p className="text-sm text-muted-foreground">
                {t.auth.verifyEmailMessage}
              </p>
            </div>
          </div>
        )}

        {/* Resend verification form (show on idle and error states) */}
        {(state === "idle" || state === "error") && (
          <div className="space-y-4 rounded-lg border border-border bg-card p-4">
            <p className="text-sm font-medium">
              {t.auth.resendVerification}
            </p>

            {resendStatus === "sent" ? (
              <div className="rounded-md bg-success/10 px-3 py-2 text-sm text-success">
                Verification email sent. Check your inbox.
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="email"
                  value={resendEmail}
                  onChange={(e) => setResendEmail(e.target.value)}
                  placeholder="your@university.edu"
                  disabled={resendStatus === "sending"}
                  className={cn(
                    "flex h-10 flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm",
                    "placeholder:text-muted-foreground",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    "disabled:cursor-not-allowed disabled:opacity-50",
                  )}
                />
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resendStatus === "sending" || !resendEmail.trim()}
                  className={cn(
                    "inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 py-2",
                    "text-sm font-medium text-primary-foreground",
                    "hover:bg-primary/90 transition-colors",
                    "disabled:pointer-events-none disabled:opacity-50",
                  )}
                >
                  {resendStatus === "sending" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  Resend
                </button>
              </div>
            )}

            {resendError && (
              <p className="text-xs text-destructive">{resendError}</p>
            )}
          </div>
        )}

        {/* Back to login */}
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

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailContent />
    </Suspense>
  );
}
