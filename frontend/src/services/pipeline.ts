import api from "@/utils/api";
import type {
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
};

