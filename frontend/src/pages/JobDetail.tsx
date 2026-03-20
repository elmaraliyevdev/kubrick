import { CalculateMatchesButton } from "@/components/CalculateMatchesButton";
import { JobDrawer } from "@/components/JobDrawer";
import { RankedCandidatesList } from "@/components/RankedCandidatesList";
import { useJob } from "@/hooks/useJobs";
import { matchesApi } from "@/services/matches";
import type { CandidateMatch, MatchCalculationResult } from "@/types/match";
import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

export default function JobDetail() {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const { data: job, isLoading, error } = useJob(parseInt(jobId || "0"));

  // AI Matching state
  const [rankedCandidates, setRankedCandidates] = useState<CandidateMatch[]>([]);
  const [isLoadingMatches, setIsLoadingMatches] = useState(false);
  const [activeTab, setActiveTab] = useState<"details" | "matches">("details");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [primarySkills, setPrimarySkills] = useState<string[]>([]);
  const [requiredSkills, setRequiredSkills] = useState<string[]>([]);
  const [niceToHaveSkills, setNiceToHaveSkills] = useState<string[]>([]);
  const [isReparsing, setIsReparsing] = useState(false);

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

  const handleReparseSkills = async () => {
    if (!job?.id) return;
    try {
      setIsReparsing(true);
      await matchesApi.parseJobRequirements(job.id, true);
      await loadRequirements();
    } catch (err) {
      console.error("Error re-parsing skills:", err);
    } finally {
      setIsReparsing(false);
    }
  };

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
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-medium text-gray-900">{job.title}</h1>
          <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-xs capitalize">
            {job.status}
          </span>
        </div>
        <button
          onClick={() => setDrawerOpen(true)}
          className="border border-gray-200 text-gray-700 rounded-md h-9 px-4 text-sm hover:bg-gray-50"
        >
          Edit Job
        </button>
      </div>

      {/* Metadata */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Location</span>
          <span className="text-gray-900">{job.location || "Not specified"}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Employment Type</span>
          <span className="text-gray-900 capitalize">{job.employment_type.replace("_", " ")}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Work Arrangement</span>
          <span className="text-gray-900 capitalize">{job.work_arrangement.replace("_", " ")}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Posted</span>
          <span className="text-gray-900">{formatDate(job.created_at)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Organization</span>
          <span className="text-gray-900">{job.organization?.name}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between">
        <div className="flex gap-6 border-b border-gray-200">
          <button
            onClick={() => setActiveTab("details")}
            className={`pb-2 text-sm ${
              activeTab === "details"
                ? "text-gray-900 border-b-2 border-gray-900"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Job Details
          </button>
          <button
            onClick={() => setActiveTab("matches")}
            className={`pb-2 text-sm ${
              activeTab === "matches"
                ? "text-gray-900 border-b-2 border-gray-900"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            AI Matches {rankedCandidates.length > 0 && `(${rankedCandidates.length})`}
          </button>
        </div>

        <CalculateMatchesButton
          jobId={job.id}
          onCalculationComplete={handleCalculationComplete}
          variant="default"
        />
      </div>

      {/* Tab content */}
      {activeTab === "details" && (
        <div className="space-y-6">
          {/* Description */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-sm font-medium text-gray-900 mb-4">Description</h2>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{job.description}</p>
          </div>

          {/* Skills */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-medium text-gray-900">Skills</h2>
              <button
                onClick={handleReparseSkills}
                disabled={isReparsing}
                className="border border-gray-200 text-gray-700 rounded-md h-9 px-4 text-sm hover:bg-gray-50 disabled:opacity-50"
              >
                {isReparsing ? (
                  <span className="flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Re-parsing...
                  </span>
                ) : (
                  "Re-parse"
                )}
              </button>
            </div>

            {primarySkills.length > 0 && (
              <div className="mb-4">
                <p className="text-xs text-gray-500 mb-2">Primary</p>
                <div className="flex flex-wrap gap-2">
                  {primarySkills.map((skill) => (
                    <span
                      key={skill}
                      className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-xs"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {requiredSkills.length > 0 && (
              <div className="mb-4">
                <p className="text-xs text-gray-500 mb-2">Required</p>
                <div className="flex flex-wrap gap-2">
                  {requiredSkills.map((skill) => (
                    <span
                      key={skill}
                      className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-xs"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {niceToHaveSkills.length > 0 && (
              <div className="mb-4">
                <p className="text-xs text-gray-500 mb-2">Nice to Have</p>
                <div className="flex flex-wrap gap-2">
                  {niceToHaveSkills.map((skill) => (
                    <span
                      key={skill}
                      className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-xs"
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
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{job.skills_required}</p>
              ) : (
                <p className="text-sm text-gray-500">
                  Click "Re-parse" to extract skills from the job description.
                </p>
              ))}
          </div>
        </div>
      )}

      {activeTab === "matches" && (
        <div>
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

      <JobDrawer open={drawerOpen} onOpenChange={setDrawerOpen} job={job} mode="edit" />
    </div>
  );
}
