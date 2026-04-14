import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Mail } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { PipelineCard as PipelineCardType, PipelineStage } from "@/types/pipeline";
import { PIPELINE_STAGE_LABELS } from "@/constants/pipeline";
import { SendCandidateEmailDialog } from "@/components/SendCandidateEmailDialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function PipelineCardInner({ card, stage }: { card: PipelineCardType; stage: PipelineStage }) {
  const missingPreview = (card.missing_skills || []).slice(0, 3);
  const matchedPreview = (card.matched_skills || []).slice(0, 3);

  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-medium text-gray-900">
            {card.candidate?.name ||
              `${card.candidate?.first_name ?? ""} ${card.candidate?.last_name ?? ""}`.trim() ||
              "Candidate"}
          </div>
          <div className="text-xs text-gray-500">Match: {card.match_score ?? "N/A"}</div>
        </div>
        <div className="whitespace-nowrap text-[10px] text-gray-500">{PIPELINE_STAGE_LABELS[stage]}</div>
      </div>

      {(matchedPreview.length > 0 || missingPreview.length > 0) && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {matchedPreview.map((s) => (
            <span
              key={`m-${s}`}
              className="rounded border border-green-100 bg-green-50 px-1.5 py-0.5 text-[11px] text-green-700"
            >
              +{s}
            </span>
          ))}
          {missingPreview.map((s) => (
            <span
              key={`x-${s}`}
              className="rounded border border-red-100 bg-red-50 px-1.5 py-0.5 text-[11px] text-red-700"
            >
              -{s}
            </span>
          ))}
          {(card.matched_skills?.length || 0) + (card.missing_skills?.length || 0) >
            matchedPreview.length + missingPreview.length && (
            <span className="px-1.5 py-0.5 text-[11px] text-gray-500">…</span>
          )}
        </div>
      )}
    </>
  );
}

/** Follows the pointer while dragging (render inside `DragOverlay`). */
export function PipelineCardDragPreview({ card, stage }: { card: PipelineCardType; stage: PipelineStage }) {
  return (
    <div
      className={cn(
        "w-80 max-w-[min(20rem,calc(100vw-2rem))] cursor-grabbing rounded-md border border-border bg-white p-3",
        "shadow-none ring-2 ring-black/10 dark:ring-white/10"
      )}
    >
      <PipelineCardInner card={card} stage={stage} />
    </div>
  );
}

interface PipelineCardProps {
  card: PipelineCardType;
  stage: PipelineStage;
}

export function PipelineCard({ card, stage }: PipelineCardProps) {
  const navigate = useNavigate();
  const [emailOpen, setEmailOpen] = useState(false);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: String(card.application_id),
    data: { type: "card", application_id: card.application_id, stage },
  });

  const style = useMemo(() => {
    return {
      transform: transform ? CSS.Transform.toString(transform) : undefined,
      transition,
      opacity: isDragging ? 0.35 : 1,
    };
  }, [transform, transition, isDragging]);

  const candidateLabel =
    card.candidate?.name ||
    `${card.candidate?.first_name ?? ""} ${card.candidate?.last_name ?? ""}`.trim() ||
    "Candidate";

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        className="cursor-grab rounded-md border border-border bg-white p-3 shadow-none active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <div
          onClick={() => {
            if (card.candidate?.id) navigate(`/candidates/${card.candidate.id}`);
          }}
          role="button"
          tabIndex={0}
        >
          <PipelineCardInner card={card} stage={stage} />
        </div>
        <div className="mt-2 flex justify-end border-t border-border pt-2">
          <Button
            type="button"
            variant="ghost"
            size="xs"
            className="h-7 gap-1 text-muted-foreground"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              setEmailOpen(true);
            }}
          >
            <Mail className="size-3.5" aria-hidden />
            Email
          </Button>
        </div>
      </div>
      <SendCandidateEmailDialog
        open={emailOpen}
        onOpenChange={setEmailOpen}
        applicationId={card.application_id}
        preferredStage={stage}
        candidateLabel={candidateLabel}
      />
    </>
  );
}
