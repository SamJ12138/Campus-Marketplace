"use client";

import { useState } from "react";
import Link from "next/link";
import {
  UserPlus,
  Megaphone,
  Lightbulb,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { api } from "@/lib/api/client";

// ── Form state ──

type FormStatus = "idle" | "submitting" | "success" | "error";

interface FormData {
  email: string;
  name: string;
  marketing_pitch: string;
  platform_ideas: string;
}

const INITIAL_FORM: FormData = {
  email: "",
  name: "",
  marketing_pitch: "",
  platform_ideas: "",
};

// ── What ambassadors do ──

const AMBASSADOR_DUTIES = [
  {
    icon: Megaphone,
    title: "Promote on campus",
    desc: "Spread the word about GimmeDat through flyers, social media, word of mouth, and creative campaigns.",
  },
  {
    icon: Sparkles,
    title: "Create buzz",
    desc: "Organize launch events, giveaways, or partnerships with student organizations to drive sign-ups.",
  },
  {
    icon: Lightbulb,
    title: "Share ideas",
    desc: "Help shape the platform by sharing feedback from your campus and suggesting new features.",
  },
];

export default function JoinTeamPage() {
  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [status, setStatus] = useState<FormStatus>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg("");

    // Client validation
    if (!form.email.trim()) {
      setErrorMsg("Email is required.");
      return;
    }
    if (!form.marketing_pitch.trim()) {
      setErrorMsg("Marketing pitch is required.");
      return;
    }
    if (form.marketing_pitch.trim().length < 50) {
      setErrorMsg("Marketing pitch must be at least 50 characters.");
      return;
    }

    setStatus("submitting");
    try {
      await api.post(
        "/api/v1/applications",
        {
          email: form.email.trim(),
          name: form.name.trim() || null,
          marketing_pitch: form.marketing_pitch.trim(),
          platform_ideas: form.platform_ideas.trim() || null,
        },
        true, // skipAuth
      );
      setStatus("success");
    } catch (err) {
      setStatus("error");
      setErrorMsg(
        err instanceof Error ? err.message : "Something went wrong. Please try again.",
      );
    }
  }

  // ── Success state ──

  if (status === "success") {
    return (
      <div className="flex min-h-[70vh] items-center justify-center px-5 py-20">
        <div className="mx-auto max-w-md text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            Application submitted!
          </h1>
          <p className="mt-3 text-muted-foreground">
            Thanks for your interest in joining the GimmeDat team. We&apos;ll review
            your application and get back to you at{" "}
            <span className="font-medium text-foreground">{form.email}</span>.
          </p>
          <Link
            href="/"
            className="mt-8 inline-flex items-center gap-2 rounded-xl bg-primary px-7 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Back to home
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  // ── Main page ──

  return (
    <div className="mx-auto max-w-4xl px-5 py-16 space-y-16">
      {/* Hero */}
      <div className="text-center space-y-4">
        <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <UserPlus className="h-7 w-7" />
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          Join the GimmeDat Team
        </h1>
        <p className="mx-auto max-w-xl text-lg text-muted-foreground">
          Become a <span className="font-semibold text-foreground">Campus Marketing Ambassador</span> and
          help bring GimmeDat to your university.
        </p>
      </div>

      {/* What ambassadors do */}
      <div className="space-y-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground">
            What does an ambassador do?
          </h2>
          <p className="mt-2 text-muted-foreground">
            Ambassadors are the driving force behind GimmeDat on their campus.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-3">
          {AMBASSADOR_DUTIES.map((duty) => (
            <div
              key={duty.title}
              className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-card p-6 text-center"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <duty.icon className="h-6 w-6" />
              </div>
              <h3 className="text-base font-semibold text-foreground">
                {duty.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {duty.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Application form */}
      <div className="mx-auto max-w-lg space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground">Apply now</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Tell us about yourself and how you&apos;d promote GimmeDat.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email */}
          <div className="space-y-1.5">
            <label
              htmlFor="email"
              className="block text-sm font-medium text-foreground"
            >
              Email <span className="text-destructive">*</span>
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              value={form.email}
              onChange={handleChange}
              placeholder="you@university.edu"
              className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          {/* Name */}
          <div className="space-y-1.5">
            <label
              htmlFor="name"
              className="block text-sm font-medium text-foreground"
            >
              Name <span className="text-muted-foreground text-xs">(optional)</span>
            </label>
            <input
              id="name"
              name="name"
              type="text"
              value={form.name}
              onChange={handleChange}
              placeholder="Your name"
              className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          {/* Marketing pitch */}
          <div className="space-y-1.5">
            <label
              htmlFor="marketing_pitch"
              className="block text-sm font-medium text-foreground"
            >
              Marketing pitch <span className="text-destructive">*</span>
            </label>
            <p className="text-xs text-muted-foreground">
              How would you promote GimmeDat on campus? What creative ideas do
              you have for building buzz? (min 50 characters)
            </p>
            <textarea
              id="marketing_pitch"
              name="marketing_pitch"
              required
              rows={5}
              value={form.marketing_pitch}
              onChange={handleChange}
              placeholder="I would promote GimmeDat by..."
              className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
            />
            <p className="text-xs text-muted-foreground text-right">
              {form.marketing_pitch.length} / 10,000
            </p>
          </div>

          {/* Platform ideas */}
          <div className="space-y-1.5">
            <label
              htmlFor="platform_ideas"
              className="block text-sm font-medium text-foreground"
            >
              Platform ideas{" "}
              <span className="text-muted-foreground text-xs">(optional)</span>
            </label>
            <p className="text-xs text-muted-foreground">
              Any features or improvements you&apos;d love to see?
            </p>
            <textarea
              id="platform_ideas"
              name="platform_ideas"
              rows={3}
              value={form.platform_ideas}
              onChange={handleChange}
              placeholder="It would be cool if..."
              className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
            />
          </div>

          {/* Error */}
          {errorMsg && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {errorMsg}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={status === "submitting"}
            className={cn(
              "flex w-full items-center justify-center gap-2 rounded-xl px-7 py-3 text-sm font-semibold transition-colors",
              status === "submitting"
                ? "bg-muted text-muted-foreground cursor-not-allowed"
                : "bg-primary text-primary-foreground hover:bg-primary/90",
            )}
          >
            {status === "submitting" ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                Submit Application
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
