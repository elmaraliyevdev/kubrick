import { CalculateMatchesButton } from "@/components/CalculateMatchesButton";
import { JobDrawer } from "@/components/JobDrawer";
import { RankedCandidatesList } from "@/components/RankedCandidatesList";
import { PipelineBoard } from "@/components/PipelineBoard";
import { SegmentedTabs } from "@/components/SegmentedTabs";
import { useDeleteJob, useJob } from "@/hooks/useJobs";
import { cn } from "@/lib/utils";
import { matchesApi } from "@/services/matches";
import type { CandidateMatch, MatchCalculationResult } from "@/types/match";
import * as Dialog from "@radix-ui/react-dialog";
import { IconTrash } from "@tabler/icons-react";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

type JobTab = "details" | "matches" | "pipeline" | "applicants" | "statistics";

function formatEnumLabel(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function MetaItem({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1 min-w-0">
      <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <div className="text-sm text-gray-900 break-words">{children}</div>
    </div>
  );
}

function BulletSection({ title, items }: { title: string; items: string[] | undefined }) {
  const cleaned = (items || []).map((s) => s?.trim()).filter(Boolean) as string[];
  if (!cleaned.length) return null;
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-3">{title}</h2>
      <ul className="list-disc space-y-2 pl-5 text-sm text-gray-700 leading-relaxed">
        {cleaned.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    </section>
  );
}

function actionButtonClassName(variant: "solid" | "outline" | "destructive") {
  return cn(
    "inline-flex h-9 items-center justify-center rounded-md px-3 text-sm font-medium transition-colors",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2 focus-visible:ring-offset-white",
    "disabled:pointer-events-none disabled:opacity-50",
    variant === "solid" && "bg-gray-900 text-white hover:bg-gray-800",
    variant === "outline" && "border border-gray-200 bg-white text-gray-900 hover:bg-gray-50",
    variant === "destructive" && "bg-red-600 text-white hover:bg-red-700"
  );
}

export default function JobDetail() {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const { data: job, isLoading, error } = useJob(parseInt(jobId || "0"));
  const deleteJobMutation = useDeleteJob();

  // AI Matching state
  const [rankedCandidates, setRankedCandidates] = useState<CandidateMatch[]>([]);
  const [isLoadingMatches, setIsLoadingMatches] = useState(false);
  const [activeTab, setActiveTab] = useState<JobTab>("details");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [primarySkills, setPrimarySkills] = useState<string[]>([]);
  const [requiredSkills, setRequiredSkills] = useState<string[]>([]);
  const [niceToHaveSkills, setNiceToHaveSkills] = useState<string[]>([]);

  const loadRankedCandidates = useCallback(async () => {
    if (!job?.id) return;

    try {
      setIsLoadingMatches(true);
      const response = await matchesApi.getRankedCandidates(job.id, {
        limit: 50,
        offset: 0,
      });
      setRankedCandidates(response.candidates);
    } catch (err) {
      console.log("No matches calculated yet:", err);
    } finally {
      setIsLoadingMatches(false);
    }
  }, [job?.id]);

  useEffect(() => {
    if (job?.id) {
      loadRankedCandidates();
    }
  }, [job?.id, loadRankedCandidates]);

  const loadRequirements = useCallback(async () => {
    if (!job?.id) return;
    try {
      const data = (await matchesApi.getJobRequirements(job.id)) as unknown as Record<
        string,
        unknown
      >;
      const reqs = data.requirements as Record<string, unknown> | undefined;
      setPrimarySkills((reqs?.primary_skills as string[]) || []);
      setRequiredSkills((reqs?.required_skills as string[]) || []);
      setNiceToHaveSkills((reqs?.nice_to_have_skills as string[]) || []);
    } catch {
      // Requirements may not be parsed yet
    }
  }, [job?.id]);

  useEffect(() => {
    loadRequirements();
  }, [loadRequirements]);

  const handleCalculationComplete = (result: MatchCalculationResult) => {
    console.log("Match calculation complete:", result);
    loadRankedCandidates();
    setActiveTab("matches");
  };

  const handleCandidateSelect = (candidateId: number) => {
    navigate(`/candidates/${candidateId}`);
  };

  const handleViewDetails = (candidateId: number) => {
    navigate(`/candidates/${candidateId}`);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const handleConfirmRemoveJob = () => {
    if (!job) return;
    deleteJobMutation.mutate(job.id, {
      onSuccess: () => {
        setRemoveDialogOpen(false);
        navigate("/jobs");
      },
      onError: () => {
        toast.error("Could not remove this job.");
      },
    });
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-100 rounded w-1/4"></div>
          <div className="h-4 bg-gray-100 rounded w-1/2"></div>
          <div className="h-32 bg-gray-100 rounded"></div>
        </div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="p-6">
        <div className="text-center space-y-4">
          <h1 className="text-lg font-medium text-gray-900">Job Not Found</h1>
          <p className="text-sm text-gray-500">
            The job you're looking for doesn't exist or you don't have permission to view it.
          </p>
          <button
            onClick={() => navigate("/jobs")}
            className="bg-gray-900 text-white rounded-md h-9 px-4 text-sm hover:bg-gray-800"
          >
            Go to Jobs
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Tabs at top — minimal style */}
      <div className="mb-6">
        <SegmentedTabs<JobTab>
          variant="minimal"
          value={activeTab}
          onValueChange={setActiveTab}
          items={[
            { value: "details", label: "Details" },
            { value: "matches", label: "Matching", count: rankedCandidates.length },
            { value: "pipeline", label: "Pipeline" },
            { value: "applicants", label: "Applicants", disabled: true },
            { value: "statistics", label: "Statistics", disabled: true },
          ]}
        />
      </div>

      {/* Tab content */}
      {activeTab === "details" && (
        <div className="space-y-6">
          {/* Summary */}
          <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 space-y-2">
                <h1 className="text-xl font-semibold tracking-tight text-gray-900">{job.title}</h1>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex rounded-md border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs font-medium capitalize text-gray-800">
                    {job.status}
                  </span>
                  {job.category ? (
                    <span className="inline-flex rounded-md border border-gray-200 bg-white px-2 py-0.5 text-xs text-gray-700">
                      {job.category}
                    </span>
                  ) : null}
                  <span className="inline-flex rounded-md border border-gray-200 bg-white px-2 py-0.5 text-xs tabular-nums text-gray-600">
                    {job.candidate_count} application{job.candidate_count === 1 ? "" : "s"}
                  </span>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2 self-end sm:self-start">
                <button
                  type="button"
                  onClick={() => setDrawerOpen(true)}
                  className="h-9 rounded-md border border-gray-200 px-3 text-sm text-gray-700 hover:bg-gray-50"
                >
                  Edit job
                </button>
                <button
                  type="button"
                  onClick={() => setRemoveDialogOpen(true)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md text-red-600 transition-colors hover:bg-red-50"
                  aria-label="Remove job"
                >
                  <IconTrash className="size-5" stroke={1.5} />
                </button>
              </div>
            </div>

            <div className="mt-6 grid gap-x-8 gap-y-5 border-t border-gray-100 pt-6 sm:grid-cols-2 lg:grid-cols-3">
              <MetaItem label="Location">{job.location?.trim() ? job.location : "Not specified"}</MetaItem>
              <MetaItem label="Employment type">{formatEnumLabel(job.employment_type)}</MetaItem>
              <MetaItem label="Work arrangement">{formatEnumLabel(job.work_arrangement)}</MetaItem>
              {job.experience_level ? (
                <MetaItem label="Experience level">{formatEnumLabel(job.experience_level)}</MetaItem>
              ) : (
                <MetaItem label="Experience level">
                  <span className="text-gray-500">Not set</span>
                </MetaItem>
              )}
              <MetaItem label="Posted">{formatDate(job.created_at)}</MetaItem>
              <MetaItem label="Last updated">{formatDate(job.updated_at)}</MetaItem>
            </div>
          </section>

          {/* Description */}
          <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-3">
              Description
            </h2>
            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{job.description}</p>
          </section>

          <BulletSection title="Responsibilities" items={job.responsibilities} />
          <BulletSection title="Requirements" items={job.requirements} />
          <BulletSection title="Nice to have" items={job.nice_to_have} />
          <BulletSection title="Benefits" items={job.benefits} />

          {/* Parsed skills for matching (from requirements parser) */}
          <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1">
              Skills for matching
            </h2>
            <p className="text-xs text-gray-500 mb-4">
              Extracted for AI ranking. Job bullet lists above are shown separately.
            </p>

            {primarySkills.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-medium text-gray-600 mb-2">Primary</p>
                <div className="flex flex-wrap gap-2">
                  {primarySkills.map((skill) => (
                    <span
                      key={skill}
                      className="rounded-md border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs text-gray-800"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {requiredSkills.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-medium text-gray-600 mb-2">Required</p>
                <div className="flex flex-wrap gap-2">
                  {requiredSkills.map((skill) => (
                    <span
                      key={skill}
                      className="rounded-md border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs text-gray-800"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {niceToHaveSkills.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-medium text-gray-600 mb-2">Nice to have</p>
                <div className="flex flex-wrap gap-2">
                  {niceToHaveSkills.map((skill) => (
                    <span
                      key={skill}
                      className="rounded-md border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs text-gray-800"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {!requiredSkills.length &&
              !niceToHaveSkills.length &&
              !primarySkills.length &&
              (job.skills_required ? (
                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {job.skills_required}
                </p>
              ) : (
                <p className="text-sm text-gray-500">
                  No parsed skills yet. Run match calculation or parse requirements to populate this section.
                </p>
              ))}
          </section>
        </div>
      )}

      {activeTab === "matches" && (
        <div className="space-y-4">
          {!(rankedCandidates.length > 0 && !isLoadingMatches) && (
            <div className="flex justify-end">
              <CalculateMatchesButton
                jobId={job.id}
                onCalculationComplete={handleCalculationComplete}
                variant="default"
              />
            </div>
          )}
          {isLoadingMatches ? (
            <div className="animate-pulse space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-24 bg-gray-100 rounded"></div>
              ))}
            </div>
          ) : rankedCandidates.length > 0 ? (
            <RankedCandidatesList
              candidates={rankedCandidates}
              onCandidateSelect={handleCandidateSelect}
              onViewDetails={handleViewDetails}
              toolbarActions={
                <CalculateMatchesButton
                  jobId={job.id}
                  onCalculationComplete={handleCalculationComplete}
                  variant="default"
                />
              }
            />
          ) : (
            <div className="bg-white border border-gray-200 rounded-lg p-6 text-center">
              <h3 className="text-sm font-medium text-gray-900 mb-2">No AI Matches Yet</h3>
              <p className="text-sm text-gray-500">
                Calculate AI matches to see how candidates rank against this job's requirements.
              </p>
            </div>
          )}
        </div>
      )}

      {activeTab === "pipeline" && (
        <div>
          <PipelineBoard jobId={job.id} />
        </div>
      )}

      <JobDrawer open={drawerOpen} onOpenChange={setDrawerOpen} job={job} mode="edit" />

      <Dialog.Root open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
          <Dialog.Content
            className={cn(
              "fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2",
              "rounded-xl border border-gray-200 bg-white p-6 shadow-xl",
              "focus:outline-none"
            )}
          >
            <div className="space-y-1">
              <Dialog.Title className="text-base font-semibold text-gray-900">Remove job?</Dialog.Title>
              <Dialog.Description className="text-sm text-gray-600">
                Are you sure you want to remove this job? This action cannot be undone.
              </Dialog.Description>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                className={actionButtonClassName("outline")}
                onClick={() => setRemoveDialogOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className={actionButtonClassName("destructive")}
                disabled={deleteJobMutation.isPending}
                onClick={handleConfirmRemoveJob}
              >
                {deleteJobMutation.isPending ? "Removing…" : "Remove"}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
