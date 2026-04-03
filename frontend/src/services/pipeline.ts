import api from "@/utils/api";
import type {
  BulkAddApplicantsResponse,
  EligibleCandidatesResponse,
  GlobalPipelineResponse,
  JobPipelineResponse,
  PipelineCard,
  PipelineStage,
  StageMovePayload,
} from "@/types/pipeline";

export const pipelineApi = {
  getJobPipeline: async (jobId: number): Promise<JobPipelineResponse> => {
    const { data } = await api.get(`/jobs/${jobId}/pipeline`);
    return data;
  },

  getGlobalPipeline: async (jobId?: number): Promise<GlobalPipelineResponse> => {
    const params = jobId ? { job_id: jobId } : undefined;
    const { data } = await api.get(`/pipeline`, { params });
    return data;
  },

  moveApplicationStage: async (applicationId: number, stage: PipelineStage): Promise<PipelineCard> => {
    const payload: StageMovePayload = { stage };
    const { data } = await api.patch(`/job-applications/${applicationId}/stage`, payload);
    return data;
  },

  getEligiblePipelineCandidates: async (
    jobId: number,
    search?: string
  ): Promise<EligibleCandidatesResponse> => {
    const { data } = await api.get(`/jobs/${jobId}/pipeline/eligible-candidates`, {
      params: search?.trim() ? { search: search.trim() } : undefined,
    });
    return data;
  },

  addPipelineApplicants: async (
    jobId: number,
    candidateIds: number[]
  ): Promise<BulkAddApplicantsResponse> => {
    const { data } = await api.post(`/jobs/${jobId}/pipeline/applicants`, {
      candidate_ids: candidateIds,
    });
    return data;
  },
};

