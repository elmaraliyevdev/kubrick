import type { PipelineCard as PipelineCardType, PipelineStage } from "@/types/pipeline";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { PipelineCard } from "@/components/PipelineCard";

interface PipelineColumnProps {
  stage: PipelineStage;
  cards: PipelineCardType[];
}

export function PipelineColumn({ stage, cards }: PipelineColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: stage,
    data: { stage },
  });

  return (
    <div className="w-80 shrink-0">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-900 capitalize">{stage}</h3>
        <span className="text-xs text-gray-500">{cards.length}</span>
      </div>

      <div
        ref={setNodeRef}
        className={`min-h-24 rounded-lg border p-2.5 ${
          isOver ? "bg-gray-50 border-gray-300" : "bg-white border-gray-200"
        }`}
      >
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

