import { DndContext, PointerSensor, closestCenter, useSensor, useSensors } from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import { PipelineColumn } from "@/components/PipelineColumn";
import type { PipelineStage } from "@/types/pipeline";
import { useGlobalPipeline, useMoveApplicationStage } from "@/hooks/usePipeline";
import { PIPELINE_STAGES } from "@/constants/pipeline";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";

const STAGES = PIPELINE_STAGES;

export default function Pipeline() {
  const [selectedJobId, setSelectedJobId] = useState<number | undefined>(undefined);

  const jobPipelineQuery = useGlobalPipeline(selectedJobId);
  const moveMutation = useMoveApplicationStage({ scope: "global", jobId: selectedJobId });

  const board = jobPipelineQuery.data;

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

  const jobs = board?.jobs ?? [];

  if (jobPipelineQuery.isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-3">
          <div className="h-10 bg-gray-100 rounded w-1/3" />
          <div className="h-24 bg-gray-100 rounded" />
        </div>
      </div>
    );
  }

  if (jobPipelineQuery.error || !board) {
    return (
      <div className="p-6">
        <div className="bg-white border border-gray-200 rounded-lg p-6 text-center">
          <h3 className="text-sm font-medium text-gray-900 mb-2">Failed to load pipeline</h3>
          <p className="text-sm text-gray-500">Try refreshing the page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-medium text-gray-900">Candidate Pipeline</h1>
          <p className="text-sm text-gray-500">Move applications across stages with drag and drop.</p>
        </div>

        <div className="w-72">
          <Select
            value={selectedJobId ? selectedJobId.toString() : "all"}
            onValueChange={(value) => {
              if (value === "all") setSelectedJobId(undefined);
              else setSelectedJobId(parseInt(value));
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Filter by job" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All jobs</SelectItem>
              {jobs.map((j) => (
                <SelectItem key={j.id} value={j.id.toString()}>
                  {j.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {STAGES.map((stage) => (
              <PipelineColumn key={stage} stage={stage} cards={board.stages[stage] || []} />
            ))}
          </div>
        </DndContext>
      </div>
    </div>
  );
}

