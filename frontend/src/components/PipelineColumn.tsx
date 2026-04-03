import type { PipelineCard as PipelineCardType, PipelineStage } from "@/types/pipeline";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useState } from "react";
import { AddApplicantsDialog } from "@/components/AddApplicantsDialog";
import { PipelineCard } from "@/components/PipelineCard";
import { Button } from "@/components/ui/button";
import { PlusIcon } from "lucide-react";

interface PipelineColumnProps {
  stage: PipelineStage;
  cards: PipelineCardType[];
  /** When set (e.g. job detail pipeline), the Applied column can add candidates to this job. */
  jobId?: number;
}

export function PipelineColumn({ stage, cards, jobId }: PipelineColumnProps) {
  const [addApplicantsOpen, setAddApplicantsOpen] = useState(false);
  const { setNodeRef, isOver } = useDroppable({
    id: stage,
    data: { stage },
  });

  return (
    <div className="flex w-80 shrink-0 flex-col">
      <div className="mb-3 flex shrink-0 items-center justify-between">
        <h3 className="text-sm font-medium capitalize text-foreground">{stage}</h3>
        <span className="text-xs text-muted-foreground">{cards.length}</span>
      </div>

      <div
        ref={setNodeRef}
        className={`min-h-24 rounded-lg border p-2.5 ${
          isOver ? "border-primary/40 bg-sidebar-accent" : "border-border bg-sidebar"
        }`}
      >
        {stage === "applied" && typeof jobId === "number" ? (
          <>
            <Button
              type="button"
              size="xs"
              className="mb-2.5 h-6 w-full gap-1 bg-foreground px-2 text-background hover:bg-foreground/90"
              onClick={() => setAddApplicantsOpen(true)}
            >
              <PlusIcon className="size-3" aria-hidden />
              Add applicants
            </Button>
            <AddApplicantsDialog jobId={jobId} open={addApplicantsOpen} onOpenChange={setAddApplicantsOpen} />
          </>
        ) : null}
        <SortableContext
          items={cards.map((c) => String(c.application_id))}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {cards.map((card) => (
              <PipelineCard key={card.application_id} card={card} stage={stage} />
            ))}
          </div>
        </SortableContext>
      </div>
    </div>
  );
}

