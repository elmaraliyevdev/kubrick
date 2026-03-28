import { describe, it, expect, vi } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { useQuery } from "@tanstack/react-query";

import { useMoveApplicationStage } from "@/hooks/usePipeline";
import type { JobPipelineResponse, PipelineCard, PipelineStage } from "@/types/pipeline";
import { pipelineApi } from "@/services/pipeline";
import { render } from "@/test/utils";

vi.mock("@/services/pipeline", () => ({
  pipelineApi: {
    moveApplicationStage: vi.fn(),
  },
}));

const initialCard = (application_id: number, stage: PipelineStage): PipelineCard => ({
  application_id,
  candidate: {
    id: 1,
    first_name: "John",
    last_name: "Doe",
    name: "John Doe",
    experience_years: 3,
    skills: ["Python"],
  },
  stage,
  match_score: 80,
  matched_skills: ["Python"],
  missing_skills: ["AWS"],
  ai_summary: null,
  ai_reasoning: null,
  updated_at: null,
  job_id: 1,
  job_title: "Job",
});

function TestHarness({
  jobId,
  applicationId,
  toStage,
  initialData,
}: {
  jobId: number;
  applicationId: number;
  toStage: PipelineStage;
  initialData: JobPipelineResponse;
}) {
  const queryKey = ["pipeline", "job", jobId] as const;
  const moveMutation = useMoveApplicationStage({ scope: "job", jobId });

  const { data } = useQuery({
    queryKey,
    enabled: false,
    queryFn: async () => initialData,
    initialData,
  });

  return (
    <div>
      <div data-testid="applied-count">{data.stages.applied.length}</div>
      <div data-testid="screening-count">{data.stages.screening.length}</div>
      <button
        onClick={() => moveMutation.mutate({ applicationId, stage: toStage })}
      >
        move
      </button>
    </div>
  );
}

describe("useMoveApplicationStage", () => {
  it("optimistically moves a card forward on success", async () => {
    const moveMock = vi.mocked(pipelineApi.moveApplicationStage);
    moveMock.mockResolvedValue(
      initialCard(1, "screening") as unknown as any
    );

    const initialData: JobPipelineResponse = {
      job_id: 1,
      job_title: "Job",
      stages: {
        applied: [initialCard(1, "applied")],
        screening: [],
        interview: [],
        offer: [],
        hired: [],
      },
    };

    render(
      <TestHarness
        jobId={1}
        applicationId={1}
        toStage={"screening"}
        initialData={initialData}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /move/i }));

    await waitFor(() => {
      expect(screen.getByTestId("applied-count").textContent).toBe("0");
      expect(screen.getByTestId("screening-count").textContent).toBe("1");
    });

    expect(moveMock).toHaveBeenCalledWith(1, "screening");
  });

  it("rolls back the optimistic move on API failure", async () => {
    const moveMock = vi.mocked(pipelineApi.moveApplicationStage);
    moveMock.mockRejectedValue(new Error("Failed"));

    const initialData: JobPipelineResponse = {
      job_id: 1,
      job_title: "Job",
      stages: {
        applied: [initialCard(1, "applied")],
        screening: [],
        interview: [],
        offer: [],
        hired: [],
      },
    };

    // Start with applied=1 (card.stage=screening doesn't matter for cache placement),
    // but the optimistic move should move based on application id.
    render(
      <TestHarness
        jobId={1}
        applicationId={1}
        toStage={"screening"}
        initialData={initialData}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /move/i }));

    await waitFor(() => {
      // After rollback, the cache should still reflect the initial application placement.
      expect(screen.getByTestId("applied-count").textContent).toBe("1");
      expect(screen.getByTestId("screening-count").textContent).toBe("0");
    });
  });
});

