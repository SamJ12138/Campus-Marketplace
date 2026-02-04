import type { Report, ReportTargetType, ReportReason } from "@/lib/types";
import { api } from "./client";

export async function createReport(
  target_type: ReportTargetType,
  target_id: string,
  reason: ReportReason,
  description?: string,
): Promise<Report> {
  return api.post<Report>("/api/v1/reports", {
    target_type,
    target_id,
    reason,
    description,
  });
}

export async function getMyReports(): Promise<Report[]> {
  return api.get<Report[]>("/api/v1/reports/mine");
}
