import type { PipelineStage as PipelineStageConst } from "@/constants/pipeline";

export type PipelineStage = PipelineStageConst;

export interface PipelineCandidate {
  id: number | null;
  first_name: string | null;
  last_name: string | null;
  name: string | null;
  experience_years: number | null;
  skills: string[];
}

export interface PipelineCard {
  application_id: number;
  candidate: PipelineCandidate;
  stage: PipelineStage;
  match_score: number | null;
  matched_skills: string[];
  missing_skills: string[];
  ai_summary?: string | null;
  ai_reasoning?: string | null;
  updated_at?: string | null;

  // Present on job/global pipeline responses.
  job_id?: number | null;
  job_title?: string | null;
}

export interface JobPipelineResponse {
  job_id: number;
  job_title: string;
  stages: Record<PipelineStage, PipelineCard[]>;
}

export interface GlobalPipelineResponse {
  job_filter: {
    job_id: number | null;
    job_title: string | null;
  };
  jobs: { id: number; title: string }[];
  stages: Record<PipelineStage, PipelineCard[]>;
}

export interface StageMovePayload {
  stage: PipelineStage;
}

