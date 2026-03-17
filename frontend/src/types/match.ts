// Types for AI matching system

export interface MatchScore {
  overall: number;
  skills: number;
  experience: number;
  education: number;
  additional: number;
}

export interface SkillMatch {
  job_skill: string;
  candidate_skill: string;
  match_type: "direct/synonym" | "fuzzy";
  similarity: number;
  required: boolean;
}

export interface SkillsAnalysis {
  matched_skills: SkillMatch[];
  missing_required: string[];
  missing_nice_to_have: string[];
  extra_skills: string[];
  match_counts: {
    required_matched: number;
    required_total: number;
    nice_to_have_matched: number;
    nice_to_have_total: number;
    extra_count: number;
  };
}

// Education types for detailed analysis
export interface EducationEntry {
  degree: string;
  school: string;
  field?: string;
  year?: string;
  gpa?: number;
}

export interface ExperienceAnalysis {
  years_match: boolean;
  candidate_years: number;
  required_years: number;
  experience_relevance: number;
  gap_assessment: string;
}

export interface EducationAnalysis {
  degree_match: boolean;
  field_relevance: number;
  education_level_score: number;
  requirements_met: boolean;
}

export interface AdditionalFactorsAnalysis {
  location_match: boolean;
  salary_compatibility: boolean;
  work_arrangement_match: boolean;
  employment_type_match: boolean;
  additional_score_breakdown: {
    location: number;
    salary: number;
    work_arrangement: number;
    employment_type: number;
  };
}

export interface MatchAnalysisSummary {
  strengths: string[];
  concerns: string[];
  recommendations: string[];
  overall_fit_assessment: string;
}

export interface CalculationMetadata {
  algorithm_version: string;
  calculation_time_ms: number;
  data_completeness: {
    candidate_profile: number;
    job_requirements: number;
  };
  confidence_score: number;
}

export interface MatchSummary {
  overall_score: number;
  tier: "excellent" | "good" | "poor" | "unscored";
  breakdown: MatchScore;
  skills_summary: {
    matched: string[];
    missing: string[];
    extra: string[];
    matched_count: number;
    missing_count: number;
    extra_count: number;
  };
  calculated_at: string | null;
  needs_recalculation: boolean;
  primary_skills_penalty?: {
    applied: number;
    raw_score: number | null;
    missing_primary: string[];
  };
}

export interface CandidateMatch {
  candidate: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    location?: string;
    experience_years?: number;
    skills_count: number;
  };
  match: MatchSummary;
  calculated_at: string | null;
}

export interface JobMatch {
  job: {
    id: number;
    title: string;
    location?: string;
    employment_type: string;
    experience_level: string;
    work_arrangement: string;
  };
  match: MatchSummary;
  calculated_at: string | null;
}

export interface MatchCalculationResult {
  message: string;
  job_id: number;
  total_candidates: number;
  processed: number;
  successful: number;
  failed: number;
  results: Array<{
    candidate_id: number;
    candidate_name: string;
    match_score: number;
    tier: string;
    skills_matched: number;
    skills_missing: number;
  }>;
  errors: string[];
}

export interface RankedCandidatesResponse {
  job_id: number;
  total_matches: number;
  page_size: number;
  offset: number;
  returned_count: number;
  candidates: CandidateMatch[];
  has_more: boolean;
}

export interface CandidateJobMatchesResponse {
  candidate_id: number;
  total_matches: number;
  jobs: JobMatch[];
}

export interface DetailedMatchAnalysis {
  candidate: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    experience_years?: number;
    skills: string[];
    education: EducationEntry[];
    location?: string;
  };
  job: {
    id: number;
    title: string;
    location?: string;
    employment_type: string;
    experience_level: string;
    work_arrangement: string;
  };
  match_analysis: {
    overall_score: number;
    tier: string;
    tier_color: string;
    component_scores: MatchScore;
    detailed_analysis: {
      skills: SkillsAnalysis;
      experience: ExperienceAnalysis;
      education: EducationAnalysis;
      additional: AdditionalFactorsAnalysis;
    };
    summary: MatchAnalysisSummary;
    calculation_metadata: CalculationMetadata;
  };
  summary: MatchSummary;
  calculated_at: string | null;
}

export interface SkillsGapAnalysis {
  candidate_id: number;
  job_id: number;
  skills_gap_analysis: {
    matched_skills: SkillMatch[];
    missing_required: string[];
    missing_nice_to_have: string[];
    extra_skills: string[];
    match_counts: {
      required_matched: number;
      required_total: number;
      nice_to_have_matched: number;
      nice_to_have_total: number;
      extra_count: number;
    };
  };
  recommendations: {
    skills_to_develop: string[];
    bonus_skills_to_learn: string[];
    strengths: string[];
  };
  match_score: {
    overall: number;
    skills_component: number;
  };
}

export interface MatchingStatistics {
  organization_id: number;
  total_matches: number;
  needs_recalculation: number;
  quality_distribution: {
    excellent: number;
    good: number;
    poor: number;
  };
  completion_rate: number;
}

// Filter and sorting options
export interface MatchFilters {
  min_score?: number;
  max_score?: number;
  tier?: "excellent" | "good" | "poor";
  has_required_skills?: boolean;
  experience_match?: boolean;
}

export interface MatchSortOptions {
  sort_by: "score" | "date" | "name" | "experience";
  sort_order: "asc" | "desc";
}

// Job requirements types
export interface JobRequirements {
  job_id: number;
  required_skills: string[];
  nice_to_have_skills: string[];
  minimum_experience_years: number;
  preferred_experience_years?: number;
  education_requirements: string[];
  location_requirements?: string;
  parsed_at: string;
  needs_reparsing: boolean;
}

export interface JobRequirementsParseResult {
  success: boolean;
  message: string;
  job_id: number;
  requirements: JobRequirements;
  parsing_details?: {
    skills_found: number;
    experience_detected: boolean;
    education_detected: boolean;
  };
}

// Recalculation result types
export interface CandidateMatchesRecalculationResult {
  success: boolean;
  message: string;
  candidate_id: number;
  matches_updated: number;
  failed_matches: number;
  processing_time_ms: number;
}

export interface SingleMatchRecalculationResult {
  success: boolean;
  message: string;
  candidate_id: number;
  job_id: number;
  previous_score: number;
  new_score: number;
  match_summary: MatchSummary;
  processing_time_ms: number;
}

// UI state types
export interface MatchingUIState {
  isCalculating: boolean;
  isLoading: boolean;
  error: string | null;
  progress?: {
    processed: number;
    total: number;
  };
}
