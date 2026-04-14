import { useQuery } from "@tanstack/react-query";
import api from "@/utils/api";

export type DashboardPeriod = "7d" | "30d" | "month" | "custom";

export interface DashboardStats {
  period: string;
  open_positions: number;
  new_applications: number;
  new_applications_7d: number;
  new_candidates: number;
  new_jobs: number;
  candidates_to_review: number;
  top_match_score: number | null;
  trends: { applications?: number | null };
  range?: { start: string; end: string };
}

export interface DashboardApplicationRow {
  id: number;
  job_id: number;
  job_title: string;
  candidate_id: number;
  candidate_name: string;
  status: string;
  match_score: number | null;
  created_at: string | null;
}

function buildParams(period: DashboardPeriod, custom?: { start: string; end: string }) {
  const params = new URLSearchParams();
  params.set("period", period);
  if (period === "custom" && custom?.start && custom?.end) {
    params.set("start", custom.start);
    params.set("end", custom.end);
  }
  return params.toString();
}

export function useDashboardStats(
  period: DashboardPeriod,
  custom?: { start: string; end: string },
  enabled = true
) {
  return useQuery({
    queryKey: ["dashboard", "stats", period, custom?.start, custom?.end],
    queryFn: async (): Promise<DashboardStats> => {
      const q = buildParams(period, custom);
      const res = await api.get(`/dashboard/stats?${q}`);
      return res.data;
    },
    staleTime: 60 * 1000,
    enabled,
  });
}

export function useDashboardApplications(
  period: DashboardPeriod,
  custom?: { start: string; end: string },
  enabled = true
) {
  return useQuery({
    queryKey: ["dashboard", "applications", period, custom?.start, custom?.end],
    queryFn: async (): Promise<DashboardApplicationRow[]> => {
      const q = buildParams(period, custom);
      const res = await api.get(`/dashboard/applications?${q}`);
      return res.data;
    },
    staleTime: 60 * 1000,
    enabled,
  });
}
