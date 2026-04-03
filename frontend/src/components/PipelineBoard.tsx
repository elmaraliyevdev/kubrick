import { DndContext, DragOverlay, PointerSensor, closestCenter, useSensor, useSensors } from "@dnd-kit/core";
import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core";
import { useState } from "react";
import type { PipelineStage } from "@/types/pipeline";
import { PIPELINE_STAGES } from "@/constants/pipeline";
import { useMoveApplicationStage, useJobPipeline } from "@/hooks/usePipeline";
import { PipelineColumn } from "@/components/PipelineColumn";
import { PipelineCardDragPreview } from "@/components/PipelineCard";
import { findCardInStages } from "@/utils/pipelineDrag";

const STAGES = PIPELINE_STAGES;

interface PipelineBoardProps {
  jobId: number;
}

export function PipelineBoard({ jobId }: PipelineBoardProps) {
  const { data, isLoading, error } = useJobPipeline(jobId);

  const moveMutation = useMoveApplicationStage({ scope: "job", jobId });

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragId(null);
    const overStageRaw = (event.over?.data.current as any)?.stage;
    const overStage =
      typeof overStageRaw === "string" && STAGES.includes(overStageRaw as PipelineStage)
        ? (overStageRaw as PipelineStage)
        : undefined;

    if (!event.over || !overStage) return;

    const activeStageRaw = (event.active.data.current as any)?.stage;
    const activeStage =
      typeof activeStageRaw === "string" && STAGES.includes(activeStageRaw as PipelineStage)
        ? (activeStageRaw as PipelineStage)
        : undefined;

    const applicationId = Number(event.active.id);
    if (!applicationId || Number.isNaN(applicationId)) return;

    if (activeStage && activeStage === overStage) return;

    moveMutation.mutate({ applicationId, stage: overStage });
  };

  const handleDragCancel = () => {
    setActiveDragId(null);
  };

  const activeDrag =
    data && activeDragId ? findCardInStages(data.stages, activeDragId) : null;

  if (isLoading) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="animate-pulse space-y-3">
          <div className="h-10 w-1/3 rounded bg-muted" />
          <div className="min-h-[12rem] rounded bg-muted" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="py-8 text-center">
        <h3 className="mb-2 text-sm font-medium text-foreground">Failed to load pipeline</h3>
        <p className="text-sm text-muted-foreground">Try refreshing the page.</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="min-h-0 flex-1 overflow-auto overscroll-contain">
          <div className="inline-flex items-start gap-4">
            {STAGES.map((stage) => (
              <PipelineColumn key={stage} stage={stage} cards={data.stages[stage] || []} jobId={jobId} />
            ))}
          </div>
        </div>

        <DragOverlay dropAnimation={null}>
          {activeDrag ? (
            <PipelineCardDragPreview card={activeDrag.card} stage={activeDrag.stage} />
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

