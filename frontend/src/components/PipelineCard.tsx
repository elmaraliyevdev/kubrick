import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import type { PipelineCard as PipelineCardType, PipelineStage } from "@/types/pipeline";

interface PipelineCardProps {
  card: PipelineCardType;
  stage: PipelineStage;
}

export function PipelineCard({ card, stage }: PipelineCardProps) {
  const navigate = useNavigate();

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: String(card.application_id),
    data: { type: "card", application_id: card.application_id, stage },
  });

  const style = useMemo(() => {
    return {
      transform: transform ? CSS.Transform.toString(transform) : undefined,
      transition,
      opacity: isDragging ? 0.65 : 1,
    };
  }, [transform, transition, isDragging]);

  const missingPreview = (card.missing_skills || []).slice(0, 3);
  const matchedPreview = (card.matched_skills || []).slice(0, 3);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="rounded-md border border-gray-200 bg-white p-3 shadow-sm cursor-grab active:cursor-grabbing"
      {...attributes}
      {...listeners}
      onClick={() => {
        if (card.candidate?.id) navigate(`/candidates/${card.candidate.id}`);
      }}
      role="button"
      tabIndex={0}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-medium text-gray-900 truncate">
            {card.candidate?.name || `${card.candidate?.first_name ?? ""} ${card.candidate?.last_name ?? ""}`.trim() || "Candidate"}
          </div>
          <div className="text-xs text-gray-500">
            Match: {card.match_score ?? "N/A"}
          </div>
        </div>
        <div className="text-[10px] text-gray-500 whitespace-nowrap">
          {stage}
        </div>
      </div>

      {(matchedPreview.length > 0 || missingPreview.length > 0) && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {matchedPreview.map((s) => (
            <span key={`m-${s}`} className="bg-green-50 text-green-700 border border-green-100 px-1.5 py-0.5 rounded text-[11px]">
              +{s}
            </span>
          ))}
          {missingPreview.map((s) => (
            <span key={`x-${s}`} className="bg-red-50 text-red-700 border border-red-100 px-1.5 py-0.5 rounded text-[11px]">
              -{s}
            </span>
          ))}
          {(card.matched_skills?.length || 0) + (card.missing_skills?.length || 0) > matchedPreview.length + missingPreview.length && (
            <span className="text-[11px] text-gray-500 px-1.5 py-0.5">
              …
            </span>
          )}
        </div>
      )}
    </div>
  );
}

