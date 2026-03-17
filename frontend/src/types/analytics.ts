export interface DashboardMetrics {
  overview: {
    total_candidates: number;
    total_jobs: number;
    total_matches: number;
    active_applications: number;
  };
  candidate_metrics: {
    recent_candidates_count: number; // Last 30 days
    candidates_with_resumes: number;
    average_experience_years: number;
    top_skills: Array<{ skill: string; count: number }>;
  };
  job_metrics: {
    active_jobs: number;
    draft_jobs: number;
    closed_jobs: number;
    average_applications_per_job: number;
  };
  matching_metrics: {
    total_matches: number;
    excellent_matches: number; // 80+ score
    good_matches: number; // 60-79 score
    poor_matches: number; // <60 score
    average_match_score: number;
    matches_needing_recalculation: number;
  };
  recent_activity: {
    candidates_added_last_7_days: number;
    jobs_created_last_7_days: number;
    matches_calculated_last_7_days: number;
  };
  quality_distribution: {
    excellent: number;
    good: number;
    poor: number;
    unscored: number;
  };
}

export interface QuickStats {
  total_candidates: number;
  total_jobs: number;
  pending_applications: number;
  match_success_rate: number; // percentage of matches above 60 score
}

export interface TrendData {
  period: string; // e.g., "2024-01"
  candidates_added: number;
  jobs_created: number;
  matches_calculated: number;
}

export interface SkillAnalytics {
  skill: string;
  candidate_count: number;
  job_demand_count: number;
  average_match_score: number;
  growth_trend: number; // percentage change from last period
}

export interface DashboardAnalytics {
  metrics: DashboardMetrics;
  trends: TrendData[];
  skill_insights: SkillAnalytics[];
  last_updated: string;
}
