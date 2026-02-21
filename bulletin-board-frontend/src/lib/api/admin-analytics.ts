import { api } from "./client";

// ─── Types ────────────────────────────────────────────────

export interface TrendMetric {
  daily: { date: string; count: number }[];
  current_total: number;
  previous_total: number;
  growth_pct: number;
  trend: "up" | "down" | "stable";
}

export interface TrendsResponse {
  period_days: number;
  metrics: {
    users: TrendMetric;
    listings: TrendMetric;
    messages: TrendMetric;
    reports: TrendMetric;
  };
  narrative: string;
}

export interface Anomaly {
  metric: string;
  recent_count: number;
  daily_average: number;
  std_dev: number;
  z_score: number;
  direction: "spike" | "drop";
  severity: "warning" | "critical";
  message: string;
}

export interface AnomaliesResponse {
  anomalies: Anomaly[];
  count: number;
}

export interface RiskFactor {
  score: number;
  weight: number;
  [key: string]: unknown;
}

export interface UserRiskScore {
  user_id: string;
  display_name?: string;
  score: number;
  level: "low" | "medium" | "high" | "critical" | "unknown";
  factors: Record<string, RiskFactor>;
  explanation: string;
}

export interface RiskScoresResponse {
  scores: UserRiskScore[];
  count: number;
}

export interface SummaryHighlight {
  type: "info" | "warning" | "success";
  message: string;
}

export interface SummaryResponse {
  period_days: number;
  period_start: string;
  period_end: string;
  new_users: number;
  new_listings: number;
  new_messages: number;
  new_reports: number;
  resolved_reports: number;
  pending_reports: number;
  narrative: string;
  highlights: SummaryHighlight[];
}

// ─── API functions ────────────────────────────────────────

export function getTrends(period = 30) {
  return api.get<TrendsResponse>("/api/v1/admin/analytics/trends", {
    period,
  });
}

export function getAnomalies(lookback = 30) {
  return api.get<AnomaliesResponse>("/api/v1/admin/analytics/anomalies", {
    lookback,
  });
}

export function getUserRiskScore(userId: string) {
  return api.get<UserRiskScore>(
    `/api/v1/admin/analytics/risk-scores/${userId}`,
  );
}

export function getRiskScores(limit = 50) {
  return api.get<RiskScoresResponse>("/api/v1/admin/analytics/risk-scores", {
    limit,
  });
}

export function getSummary(period = 7) {
  return api.get<SummaryResponse>("/api/v1/admin/analytics/summary", {
    period,
  });
}
