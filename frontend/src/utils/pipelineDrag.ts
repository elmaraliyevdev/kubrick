import { PIPELINE_STAGES } from "@/constants/pipeline";
import type { PipelineCard, PipelineStage } from "@/types/pipeline";

export function findCardInStages(
  stages: Record<PipelineStage, PipelineCard[]>,
  activeId: string
): { card: PipelineCard; stage: PipelineStage } | null {
  const id = Number(activeId);
  if (Number.isNaN(id)) return null;
  for (const s of PIPELINE_STAGES) {
    const card = stages[s]?.find((c) => c.application_id === id);
    if (card) return { card, stage: s };
  }
  return null;
}
