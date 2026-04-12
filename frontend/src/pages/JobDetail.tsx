import { JobApplicationFormTab } from "@/components/JobApplicationFormSection";
import { CalculateMatchesButton } from "@/components/CalculateMatchesButton";
import { JobDrawer } from "@/components/JobDrawer";
import { JobDescriptionHtml } from "@/components/job-form/JobDescriptionHtml";
import { RankedCandidatesList } from "@/components/RankedCandidatesList";
import { PipelineBoard } from "@/components/PipelineBoard";
import { SegmentedTabs } from "@/components/SegmentedTabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useDeleteJob, useJob } from "@/hooks/useJobs";
import { cn } from "@/lib/utils";
import { matchesApi } from "@/services/matches";
import type { CandidateMatch, MatchCalculationResult } from "@/types/match";
import * as Dialog from "@radix-ui/react-dialog";
import {
  IconCalendar,
  IconMapPin,
  IconTrash,
  IconBriefcase,
  IconUsers,
} from "@tabler/icons-react";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

type JobTab = "details" | "application-form" | "matches" | "pipeline" | "applicants" | "statistics";

function formatEnumLabel(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function SectionHeading({ children }: { children: ReactNode }) {
  return (
    <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{children}</h2>
  );
}

function DetailMetaItem({
  label,
  icon,
  children,
}: {
  label: string;
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex min-w-0 gap-3">
      {icon ? (
        <span className="text-muted-foreground mt-0.5 shrink-0 [&_svg]:size-4">{icon}</span>
      ) : null}
      <div className="min-w-0 space-y-0.5">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="text-sm leading-snug text-foreground break-words">{children}</p>
      </div>
    </div>
  );
}

function BulletSection({ title, items }: { title: string; items: string[] | undefined }) {
  const cleaned = (items || []).map((s) => s?.trim()).filter(Boolean) as string[];
  if (!cleaned.length) return null;
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold tracking-tight">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <ul className="space-y-3">
          {cleaned.map((item, i) => (
            <li key={i} className="flex gap-3 text-sm leading-relaxed text-foreground/90">
              <span
                className="mt-2 h-1 w-1 shrink-0 rounded-full bg-primary/50"
                aria-hidden
              />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function actionButtonClassName(variant: "solid" | "outline" | "destructive") {
  return cn(
    "inline-flex h-9 items-center justify-center rounded-md px-3 text-sm font-medium transition-colors",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
    "disabled:pointer-events-none disabled:opacity-50",
    variant === "solid" && "bg-primary text-primary-foreground hover:bg-primary/90",
    variant === "outline" && "border border-border bg-background hover:bg-muted",
    variant === "destructive" && "bg-destructive text-destructive-foreground hover:bg-destructive/90"
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

  const tabItems = [
    { value: "details" as const, label: "Details" },
    { value: "application-form" as const, label: "Application" },
    {
      value: "matches" as const,
      label: "Matching",
      count: rankedCandidates.length,
    },
    { value: "pipeline" as const, label: "Pipeline" },
    { value: "applicants" as const, label: "Applicants", disabled: true },
    { value: "statistics" as const, label: "Statistics", disabled: true },
  ];

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
    <div
      className={cn(
        "flex min-h-0 flex-1 flex-col pt-6",
        // Pipeline: keep scroll inside the board only — do not grow / scroll the main shell
        activeTab === "pipeline" ? "overflow-hidden pb-0" : "pb-6"
      )}
    >
      {/* Tabs — keep horizontal inset so they align with other pages */}
      <div className="mb-6 shrink-0 px-6">
        <SegmentedTabs<JobTab>
          variant="minimal"
          value={activeTab}
          onValueChange={setActiveTab}
          items={tabItems}
        />
      </div>

      {/* Details: same horizontal inset as tabs; full width within that (no max-w column) */}
      {activeTab === "details" && (
        <div className="space-y-8 px-6 pb-4">
          {/* Summary */}
          <Card className="overflow-hidden">
            <CardHeader className="border-b border-border/80 bg-muted/30 pb-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 space-y-3">
                  <div className="space-y-1">
                    <SectionHeading>Job posting</SectionHeading>
                    <CardTitle className="text-2xl font-semibold tracking-tight text-foreground">
                      {job.title}
                    </CardTitle>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary" className="capitalize">
                      {job.status}
                    </Badge>
                    {job.category ? (
                      <Badge variant="outline" className="font-normal">
                        {job.category}
                      </Badge>
                    ) : null}
                    <Badge variant="outline" className="tabular-nums font-normal text-muted-foreground">
                      {job.candidate_count} application{job.candidate_count === 1 ? "" : "s"}
                    </Badge>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2 sm:pt-1">
                  <Button type="button" variant="outline" size="sm" onClick={() => setDrawerOpen(true)}>
                    Edit job
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => setRemoveDialogOpen(true)}
                    aria-label="Remove job"
                  >
                    <IconTrash className="size-5" stroke={1.5} />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                <DetailMetaItem label="Location" icon={<IconMapPin stroke={1.5} />}>
                  {job.location?.trim() ? job.location : "Not specified"}
                </DetailMetaItem>
                <DetailMetaItem label="Employment type" icon={<IconBriefcase stroke={1.5} />}>
                  {formatEnumLabel(job.employment_type)}
                </DetailMetaItem>
                <DetailMetaItem label="Work arrangement" icon={<IconUsers stroke={1.5} />}>
                  {formatEnumLabel(job.work_arrangement)}
                </DetailMetaItem>
                <DetailMetaItem label="Experience level" icon={<IconBriefcase stroke={1.5} />}>
                  {job.experience_level ? (
                    formatEnumLabel(job.experience_level)
                  ) : (
                    <span className="text-muted-foreground">Not set</span>
                  )}
                </DetailMetaItem>
                <DetailMetaItem label="Posted" icon={<IconCalendar stroke={1.5} />}>
                  {formatDate(job.created_at)}
                </DetailMetaItem>
                <DetailMetaItem label="Last updated" icon={<IconCalendar stroke={1.5} />}>
                  {formatDate(job.updated_at)}
                </DetailMetaItem>
              </div>
            </CardContent>
          </Card>

          {/* Description */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Description</CardTitle>
              <CardDescription>Full text as published on this job.</CardDescription>
            </CardHeader>
            <Separator />
            <CardContent className="pt-6">
              <JobDescriptionHtml html={job.description} className="text-foreground/90" />
            </CardContent>
          </Card>

          <div className="space-y-6">
            <BulletSection title="Responsibilities" items={job.responsibilities} />
            <BulletSection title="Requirements" items={job.requirements} />
            <BulletSection title="Nice to have" items={job.nice_to_have} />
            <BulletSection title="Benefits" items={job.benefits} />
          </div>

          {/* Parsed skills for matching */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Skills for matching</CardTitle>
              <CardDescription>
                Parsed for AI ranking. Bullet lists above are the human-readable job copy.
              </CardDescription>
            </CardHeader>
            <Separator />
            <CardContent className="space-y-6 pt-6">
              {primarySkills.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Primary
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {primarySkills.map((skill) => (
                      <Badge key={skill} variant="secondary" className="font-normal">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {requiredSkills.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Required
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {requiredSkills.map((skill) => (
                      <Badge key={skill} variant="outline" className="font-normal">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {niceToHaveSkills.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Nice to have
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {niceToHaveSkills.map((skill) => (
                      <Badge key={skill} variant="outline" className="font-normal text-muted-foreground">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {!requiredSkills.length &&
                !niceToHaveSkills.length &&
                !primarySkills.length &&
                (job.skills_required ? (
                  <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">
                    {job.skills_required}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No parsed skills yet. Run match calculation or parse requirements to populate this section.
                  </p>
                ))}
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "application-form" && (
        <div className="min-h-0 flex-1 overflow-auto px-6 pb-8">
          <JobApplicationFormTab jobId={job.id} />
        </div>
      )}

      {activeTab === "matches" && (
        <div className="space-y-4 px-6">
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
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-6 pb-6">
          <PipelineBoard jobId={job.id} />
        </div>
      )}

      <JobDrawer open={drawerOpen} onOpenChange={setDrawerOpen} job={job} />

      <Dialog.Root open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
          <Dialog.Content
            className={cn(
              "fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2",
              "rounded-xl border border-gray-200 bg-white p-6 shadow-none",
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
