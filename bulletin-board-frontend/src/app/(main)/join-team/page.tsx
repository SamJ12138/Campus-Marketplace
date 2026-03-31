"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Megaphone,
  Handshake,
  Share2,
  ArrowRight,
  CheckCircle2,
  Loader2,
  Briefcase,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { api } from "@/lib/api/client";

// ── Types ──

type FormStatus = "idle" | "submitting" | "success" | "error";

interface FormData {
  email: string;
  name: string;
  role: string;
  marketing_pitch: string;
  platform_ideas: string;
}

const INITIAL_FORM: FormData = {
  email: "",
  name: "",
  role: "",
  marketing_pitch: "",
  platform_ideas: "",
};

// ── Job listings ──

interface JobListing {
  id: string;
  icon: typeof Handshake;
  title: string;
  type: string;
  description: string;
  responsibilities: string[];
  idealCandidate: string[];
}

const JOB_LISTINGS: JobListing[] = [
  {
    id: "biz_dev",
    icon: Handshake,
    title: "Business Development \u2013 Sales/Outreach Intern",
    type: "Intern",
    description:
      "Drive GimmeDat\u2019s growth by identifying and building strategic partnerships with student organizations, campus groups, and local businesses. You\u2019ll be the face of GimmeDat in outreach efforts.",
    responsibilities: [
      "Identify partnership opportunities with student orgs and clubs",
      "Conduct outreach to local businesses for cross-promotions",
      "Develop and execute campus launch strategies",
      "Track outreach metrics and report on growth KPIs",
      "Attend campus events to represent GimmeDat",
    ],
    idealCandidate: [
      "Strong interpersonal and communication skills",
      "Experience in sales, fundraising, or student org leadership",
      "Self-motivated and comfortable with cold outreach",
      "Knowledge of your campus community and its organizations",
    ],
  },
  {
    id: "social_media",
    icon: Share2,
    title: "Social Media Specialist \u2013 Instagram/LinkedIn Intern",
    type: "Intern",
    description:
      "Own GimmeDat\u2019s social media presence across Instagram and LinkedIn. Create engaging content that resonates with college students and drives platform adoption.",
    responsibilities: [
      "Create and schedule Instagram posts, Stories, and Reels",
      "Manage LinkedIn content strategy for brand credibility",
      "Engage with followers and campus-related accounts",
      "Track social media analytics and optimize content",
      "Collaborate on campaigns tied to campus events and launches",
    ],
    idealCandidate: [
      "Strong portfolio or personal brand on Instagram/LinkedIn",
      "Eye for visual design and trending content formats",
      "Experience with Canva, CapCut, or similar tools",
      "Understanding of college student social media habits",
    ],
  },
  {
    id: "general_marketing",
    icon: Megaphone,
    title: "General Marketing/Communication",
    type: "Intern",
    description:
      "Support GimmeDat\u2019s overall marketing strategy through creative campaigns, content creation, and campus buzz. A versatile role for someone who wants broad marketing experience.",
    responsibilities: [
      "Help plan and execute campus marketing campaigns",
      "Create flyers, email copy, and promotional materials",
      "Coordinate with ambassadors and student organizations",
      "Brainstorm creative ideas for user acquisition",
      "Provide feedback on product and user experience",
    ],
    idealCandidate: [
      "Creative thinker with strong writing skills",
      "Interest in marketing, branding, or communications",
      "Organized and able to manage multiple small projects",
      "Enthusiastic about the GimmeDat mission",
    ],
  },
];

const ROLE_LABELS: Record<string, string> = {
  biz_dev: "Business Development \u2013 Sales/Outreach Intern",
  social_media: "Social Media Specialist \u2013 Instagram/LinkedIn Intern",
  general_marketing: "General Marketing/Communication",
};

// ── Job Card ──

function JobCard({
  job,
  onApply,
}: {
  job: JobListing;
  onApply: (roleId: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const Icon = job.icon;

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden transition-shadow hover:shadow-md">
      {/* Header — always visible */}
      <div className="p-6 space-y-3">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Icon className="h-6 w-6" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-lg font-semibold text-foreground">
                {job.title}
              </h3>
              <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                {job.type}
              </span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              {job.description}
            </p>
          </div>
        </div>

        {/* Expand/collapse toggle */}
        <button
          onClick={() => setExpanded((prev) => !prev)}
          className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
        >
          {expanded ? "Hide details" : "View details"}
          {expanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="border-t border-border px-6 pb-6 pt-4 space-y-5">
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-2">
              Responsibilities
            </h4>
            <ul className="space-y-1.5">
              {job.responsibilities.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2 text-sm text-muted-foreground"
                >
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-foreground mb-2">
              Ideal Candidate
            </h4>
            <ul className="space-y-1.5">
              {job.idealCandidate.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2 text-sm text-muted-foreground"
                >
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Apply button */}
      <div className="border-t border-border px-6 py-4">
        <button
          onClick={() => onApply(job.id)}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Apply for this role
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// ── Main Page ──

export default function JoinTeamPage() {
  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [status, setStatus] = useState<FormStatus>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function scrollToApply(roleId: string) {
    setForm((prev) => ({ ...prev, role: roleId }));
    setTimeout(() => {
      document.getElementById("apply")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg("");

    if (!form.role) {
      setErrorMsg("Please select a position.");
      return;
    }
    if (!form.email.trim()) {
      setErrorMsg("Email is required.");
      return;
    }
    if (!form.name.trim()) {
      setErrorMsg("Name is required.");
      return;
    }
    if (!form.marketing_pitch.trim()) {
      setErrorMsg("Please tell us why you're a good fit.");
      return;
    }
    if (form.marketing_pitch.trim().length < 50) {
      setErrorMsg("Your response must be at least 50 characters.");
      return;
    }

    setStatus("submitting");
    try {
      await api.post(
        "/api/v1/applications",
        {
          email: form.email.trim(),
          name: form.name.trim() || null,
          role: form.role,
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
            Thanks for applying for the{" "}
            <span className="font-semibold text-foreground">
              {ROLE_LABELS[form.role] ?? form.role}
            </span>{" "}
            position. We&apos;ll review your application and get back to you at{" "}
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
          <Briefcase className="h-7 w-7" />
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          Join the GimmeDat Team
        </h1>
        <p className="mx-auto max-w-xl text-lg text-muted-foreground">
          We&apos;re looking for driven students to help grow the campus marketplace.
          Explore our open positions and apply below.
        </p>
      </div>

      {/* Open Positions */}
      <div className="space-y-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground">
            Open Positions
          </h2>
          <p className="mt-2 text-muted-foreground">
            Find the role that matches your skills and interests.
          </p>
        </div>

        <div className="space-y-5">
          {JOB_LISTINGS.map((job) => (
            <JobCard key={job.id} job={job} onApply={scrollToApply} />
          ))}
        </div>
      </div>

      {/* Application form */}
      <div id="apply" className="scroll-mt-24 mx-auto max-w-lg space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground">Apply Now</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Tell us about yourself and why you&apos;d be a great fit.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Role */}
          <div className="space-y-1.5">
            <label
              htmlFor="role"
              className="block text-sm font-medium text-foreground"
            >
              Position <span className="text-destructive">*</span>
            </label>
            <select
              id="role"
              name="role"
              required
              value={form.role}
              onChange={handleChange}
              className={cn(
                "w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50",
                !form.role && "text-muted-foreground",
              )}
            >
              <option value="" disabled>
                Select a position...
              </option>
              {JOB_LISTINGS.map((job) => (
                <option key={job.id} value={job.id}>
                  {job.title}
                </option>
              ))}
            </select>
          </div>

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
              Name <span className="text-destructive">*</span>
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              value={form.name}
              onChange={handleChange}
              placeholder="Your full name"
              className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          {/* Why are you a good fit? (marketing_pitch) */}
          <div className="space-y-1.5">
            <label
              htmlFor="marketing_pitch"
              className="block text-sm font-medium text-foreground"
            >
              Why are you a good fit? <span className="text-destructive">*</span>
            </label>
            <p className="text-xs text-muted-foreground">
              Tell us what excites you about this role and what you&apos;d bring to the team. (min 50 characters)
            </p>
            <textarea
              id="marketing_pitch"
              name="marketing_pitch"
              required
              rows={5}
              value={form.marketing_pitch}
              onChange={handleChange}
              placeholder="I'm excited about this role because..."
              className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
            />
            <p className="text-xs text-muted-foreground text-right">
              {form.marketing_pitch.length} / 10,000
            </p>
          </div>

          {/* Relevant experience (platform_ideas) */}
          <div className="space-y-1.5">
            <label
              htmlFor="platform_ideas"
              className="block text-sm font-medium text-foreground"
            >
              Relevant experience{" "}
              <span className="text-muted-foreground text-xs">(optional)</span>
            </label>
            <p className="text-xs text-muted-foreground">
              Any relevant work, projects, coursework, or extracurriculars?
            </p>
            <textarea
              id="platform_ideas"
              name="platform_ideas"
              rows={3}
              value={form.platform_ideas}
              onChange={handleChange}
              placeholder="I've worked on..."
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
