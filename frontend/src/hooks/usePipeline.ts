import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { GlobalPipelineResponse, JobPipelineResponse, PipelineCard, PipelineStage } from "@/types/pipeline";
import { PIPELINE_STAGES } from "@/constants/pipeline";
import { pipelineApi } from "@/services/pipeline";

const STAGES = PIPELINE_STAGES;

function sortCards(cards: PipelineCard[]): PipelineCard[] {
  return [...cards].sort((a, b) => (b.match_score ?? -1) - (a.match_score ?? -1));
}

function moveCardOptimistically<T extends { stages: Record<PipelineStage, PipelineCard[]> }>(
  prev: T,
  applicationId: number,
  toStage: PipelineStage
): T {
  const nextStages = { ...prev.stages };

  // Remove from wherever it currently is.
  let movedCard: PipelineCard | undefined;
  for (const stage of STAGES) {
    const idx = nextStages[stage].findIndex((c) => c.application_id === applicationId);
    if (idx !== -1) {
      const copy = [...nextStages[stage]];
      movedCard = copy.splice(idx, 1)[0];
      nextStages[stage] = copy;
      break;
    }
  }

  if (!movedCard) {
    // If we can't find the card in cache, don't mutate the shape.
    return prev;
  }

  const updatedCard: PipelineCard = { ...movedCard, stage: toStage };
  nextStages[toStage] = sortCards([...nextStages[toStage], updatedCard]);

  // Keep other lanes sorted too (helps if server returned different ordering).
  for (const stage of STAGES) {
    nextStages[stage] = sortCards(nextStages[stage]);
  }

  return { ...prev, stages: nextStages };
}

export const useJobPipeline = (jobId?: number) => {
  return useQuery({
    queryKey: ["pipeline", "job", jobId ?? "all"],
    queryFn: () => pipelineApi.getJobPipeline(jobId as number),
    enabled: typeof jobId === "number",
  });
};

export const useGlobalPipeline = (jobId?: number) => {
  return useQuery({
    queryKey: ["pipeline", "global", jobId ?? "all"],
    queryFn: () => pipelineApi.getGlobalPipeline(jobId),
  });
};

export const useMoveApplicationStage = (params: { scope: "job"; jobId: number } | { scope: "global"; jobId?: number }) => {
  const queryClient = useQueryClient();

  const queryKey = params.scope === "job" ? ["pipeline", "job", params.jobId] : ["pipeline", "global", params.jobId ?? "all"];

  return useMutation({
    mutationFn: async (payload: { applicationId: number; stage: PipelineStage }) =>
      pipelineApi.moveApplicationStage(payload.applicationId, payload.stage),

    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey });

      const prev = queryClient.getQueryData<JobPipelineResponse | GlobalPipelineResponse>(queryKey);
      if (!prev) return { prev: null };

      const next = moveCardOptimistically(prev as any, variables.applicationId, variables.stage);
      queryClient.setQueryData(queryKey, next);

      return { prev };
    },

    onError: (_err, _variables, context) => {
      if (!context?.prev) return;
      queryClient.setQueryData(queryKey, context.prev);
    },

    onSettled: () => {
      // Simplest approach: refresh all pipeline data after a move.
      queryClient.invalidateQueries({ queryKey: ["pipeline"] });
    },
  });
};

