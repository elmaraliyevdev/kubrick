import { DndContext, DragOverlay, PointerSensor, closestCenter, useSensor, useSensors } from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import type { PipelineStage } from "@/types/pipeline";
import { PIPELINE_STAGES } from "@/constants/pipeline";
import { useMoveApplicationStage, useJobPipeline } from "@/hooks/usePipeline";
import { PipelineColumn } from "@/components/PipelineColumn";

const STAGES = PIPELINE_STAGES;

interface PipelineBoardProps {
  jobId: number;
}

export function PipelineBoard({ jobId }: PipelineBoardProps) {
  const { data, isLoading, error } = useJobPipeline(jobId);

  const moveMutation = useMoveApplicationStage({ scope: "job", jobId });

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const handleDragEnd = (event: DragEndEvent) => {
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

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-3">
        <div className="h-10 bg-gray-100 rounded w-1/3" />
        <div className="h-24 bg-gray-100 rounded" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6 text-center">
        <h3 className="text-sm font-medium text-gray-900 mb-2">Failed to load pipeline</h3>
        <p className="text-sm text-gray-500">Try refreshing the page.</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-2">
          {STAGES.map((stage) => (
            <PipelineColumn key={stage} stage={stage} cards={data.stages[stage] || []} />
          ))}
        </div>

        {/* Optional overlay placeholder (kept empty for now). */}
        <DragOverlay />
      </DndContext>
    </div>
  );
}

