"use client";

import { useEffect, useState } from "react";
import {
  Brain,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  ShieldAlert,
  FileText,
  Loader2,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Info,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import {
  getTrends,
  getAnomalies,
  getSummary,
  getRiskScores,
  type TrendsResponse,
  type AnomaliesResponse,
  type SummaryResponse,
  type RiskScoresResponse,
  type UserRiskScore,
} from "@/lib/api/admin-analytics";

// ─── Sub-components ──────────────────────────────────────

function SectionSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-card p-5 animate-pulse space-y-3">
      <div className="h-5 w-32 rounded bg-muted" />
      <div className="h-4 w-full rounded bg-muted" />
      <div className="h-4 w-3/4 rounded bg-muted" />
    </div>
  );
}

function TrendIcon({ trend }: { trend: string }) {
  if (trend === "up")
    return <TrendingUp className="h-4 w-4 text-success" />;
  if (trend === "down")
    return <TrendingDown className="h-4 w-4 text-destructive" />;
  return <Minus className="h-4 w-4 text-muted-foreground" />;
}

function GrowthBadge({ growth }: { growth: number }) {
  const isPositive = growth > 0;
  const isNegative = growth < 0;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        isPositive && "bg-success/10 text-success",
        isNegative && "bg-destructive/10 text-destructive",
        !isPositive && !isNegative && "bg-muted text-muted-foreground",
      )}
    >
      {growth > 0 ? "+" : ""}
      {growth.toFixed(1)}%
    </span>
  );
}

function HighlightIcon({ type }: { type: string }) {
  if (type === "warning")
    return <AlertTriangle className="h-4 w-4 text-warning shrink-0" />;
  if (type === "success")
    return <CheckCircle2 className="h-4 w-4 text-success shrink-0" />;
  return <Info className="h-4 w-4 text-primary shrink-0" />;
}

function RiskLevelBadge({ level }: { level: string }) {
  const config: Record<string, { label: string; className: string }> = {
    low: { label: "Low", className: "bg-success/10 text-success" },
    medium: { label: "Medium", className: "bg-warning/10 text-warning" },
    high: { label: "High", className: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" },
    critical: {
      label: "Critical",
      className: "bg-destructive/10 text-destructive",
    },
  };
  const c = config[level] ?? config.low;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        c.className,
      )}
    >
      {c.label}
    </span>
  );
}

function RiskScoreBar({ score }: { score: number }) {
  const color =
    score >= 70
      ? "bg-destructive"
      : score >= 50
        ? "bg-orange-500"
        : score >= 25
          ? "bg-warning"
          : "bg-success";
  return (
    <div className="flex items-center gap-2 flex-1 min-w-0">
      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all", color)}
          style={{ width: `${Math.min(score, 100)}%` }}
        />
      </div>
      <span className="text-xs font-mono font-bold w-8 text-right">
        {score}
      </span>
    </div>
  );
}

// ─── Summary section ─────────────────────────────────────

function SummarySection({ data }: { data: SummaryResponse }) {
  return (
    <div className="rounded-lg border border-border bg-card p-5 space-y-4">
      <div className="flex items-center gap-2">
        <FileText className="h-5 w-5 text-primary" />
        <h2 className="text-sm font-semibold">
          Platform summary ({data.period_days}d)
        </h2>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { label: "New users", value: data.new_users },
          { label: "New listings", value: data.new_listings },
          { label: "Messages", value: data.new_messages },
          { label: "Reports filed", value: data.new_reports },
          { label: "Resolved", value: data.resolved_reports },
          { label: "Pending", value: data.pending_reports },
        ].map((m) => (
          <div
            key={m.label}
            className="rounded-md border border-border bg-background p-3 text-center"
          >
            <p className="text-lg font-bold">{m.value}</p>
            <p className="text-[10px] text-muted-foreground">{m.label}</p>
          </div>
        ))}
      </div>

      {/* Narrative */}
      <div className="rounded-md bg-primary/5 border border-primary/10 p-3">
        <p className="text-sm leading-relaxed">{data.narrative}</p>
      </div>

      {/* Highlights */}
      {data.highlights.length > 0 && (
        <div className="space-y-2">
          {data.highlights.map((h, i) => (
            <div
              key={i}
              className={cn(
                "flex items-start gap-2 rounded-md px-3 py-2 text-sm",
                h.type === "warning" && "bg-warning/10",
                h.type === "success" && "bg-success/10",
                h.type === "info" && "bg-primary/5",
              )}
            >
              <HighlightIcon type={h.type} />
              <span>{h.message}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Trends section ──────────────────────────────────────

function TrendsSection({ data }: { data: TrendsResponse }) {
  return (
    <div className="rounded-lg border border-border bg-card p-5 space-y-4">
      <div className="flex items-center gap-2">
        <TrendingUp className="h-5 w-5 text-primary" />
        <h2 className="text-sm font-semibold">
          Trends ({data.period_days}d vs. previous)
        </h2>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {(
          Object.entries(data.metrics) as [
            string,
            (typeof data.metrics)[keyof typeof data.metrics],
          ][]
        ).map(([name, m]) => (
          <div
            key={name}
            className="rounded-md border border-border bg-background p-4 space-y-2"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground capitalize">
                {name}
              </p>
              <TrendIcon trend={m.trend} />
            </div>
            <p className="text-2xl font-bold">
              {m.current_total.toLocaleString()}
            </p>
            <div className="flex items-center gap-2">
              <GrowthBadge growth={m.growth_pct} />
              <span className="text-[10px] text-muted-foreground">
                vs. {m.previous_total.toLocaleString()} prev
              </span>
            </div>
          </div>
        ))}
      </div>

      {data.narrative && (
        <div className="rounded-md bg-primary/5 border border-primary/10 p-3">
          <p className="text-sm leading-relaxed">{data.narrative}</p>
        </div>
      )}
    </div>
  );
}

// ─── Anomalies section ───────────────────────────────────

function AnomaliesSection({ data }: { data: AnomaliesResponse }) {
  if (data.count === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-5">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-primary" />
          <h2 className="text-sm font-semibold">Anomalies</h2>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          No anomalies detected. All metrics are within normal ranges.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card p-5 space-y-4">
      <div className="flex items-center gap-2">
        <ShieldAlert className="h-5 w-5 text-destructive" />
        <h2 className="text-sm font-semibold">
          Anomalies ({data.count} detected)
        </h2>
      </div>
      <div className="space-y-2">
        {data.anomalies.map((a, i) => (
          <div
            key={i}
            className={cn(
              "flex items-start gap-3 rounded-md border px-4 py-3",
              a.severity === "critical"
                ? "border-destructive/50 bg-destructive/5"
                : "border-warning/50 bg-warning/5",
            )}
          >
            <AlertTriangle
              className={cn(
                "h-4 w-4 mt-0.5 shrink-0",
                a.severity === "critical"
                  ? "text-destructive"
                  : "text-warning",
              )}
            />
            <div className="space-y-1 min-w-0">
              <p className="text-sm font-medium">{a.message}</p>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>z-score: {a.z_score.toFixed(1)}</span>
                <span>avg: {a.daily_average}/day</span>
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                    a.severity === "critical"
                      ? "bg-destructive/10 text-destructive"
                      : "bg-warning/10 text-warning",
                  )}
                >
                  {a.severity}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Risk scores section ─────────────────────────────────

function RiskScoreRow({ user }: { user: UserRiskScore }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border-b border-border last:border-0">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-accent/30 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium truncate">
              {user.display_name || user.user_id.slice(0, 8)}
            </span>
            <RiskLevelBadge level={user.level} />
          </div>
        </div>
        <RiskScoreBar score={user.score} />
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
      </button>
      {expanded && (
        <div className="px-4 pb-4 space-y-3 bg-accent/10">
          <p className="text-sm">{user.explanation}</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {Object.entries(user.factors).map(([name, factor]) => (
              <div
                key={name}
                className="rounded-md border border-border bg-card p-2 text-center"
              >
                <p className="text-xs font-bold">
                  {factor.score.toFixed(0)}/{factor.weight}
                </p>
                <p className="text-[10px] text-muted-foreground capitalize">
                  {name.replace(/_/g, " ")}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function RiskScoresSection({ data }: { data: RiskScoresResponse }) {
  if (data.count === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-5">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-primary" />
          <h2 className="text-sm font-semibold">User risk scores</h2>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          No users to score. Risk scores are computed for recently active or
          reported users.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="flex items-center gap-2 p-5 pb-3">
        <ShieldAlert className="h-5 w-5 text-primary" />
        <h2 className="text-sm font-semibold">
          User risk scores ({data.count} users)
        </h2>
      </div>
      <div>
        {data.scores.map((user) => (
          <RiskScoreRow key={user.user_id} user={user} />
        ))}
      </div>
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────

export default function AdminInsightsPage() {
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [trends, setTrends] = useState<TrendsResponse | null>(null);
  const [anomalies, setAnomalies] = useState<AnomaliesResponse | null>(null);
  const [riskScores, setRiskScores] = useState<RiskScoresResponse | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchAll() {
    setIsLoading(true);
    setError(null);
    try {
      const [summaryData, trendsData, anomalyData, riskData] =
        await Promise.all([
          getSummary(7),
          getTrends(30),
          getAnomalies(30),
          getRiskScores(20),
        ]);
      setSummary(summaryData);
      setTrends(trendsData);
      setAnomalies(anomalyData);
      setRiskScores(riskData);
    } catch {
      setError("Failed to load AI insights. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchAll();
  }, []);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Brain className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">AI Insights</h1>
            <p className="text-sm text-muted-foreground">
              AI-powered analytics and intelligence
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={fetchAll}
          disabled={isLoading}
          className={cn(
            "inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
            isLoading
              ? "bg-muted text-muted-foreground"
              : "bg-primary text-primary-foreground hover:bg-primary/90",
          )}
        >
          <RefreshCw
            className={cn("h-4 w-4", isLoading && "animate-spin")}
          />
          Refresh
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SectionSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Content */}
      {!isLoading && !error && (
        <div className="space-y-6">
          {summary && <SummarySection data={summary} />}
          {anomalies && <AnomaliesSection data={anomalies} />}
          {trends && <TrendsSection data={trends} />}
          {riskScores && <RiskScoresSection data={riskScores} />}
        </div>
      )}
    </div>
  );
}
