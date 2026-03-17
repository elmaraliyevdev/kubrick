import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { matchesApi } from "@/services/matches";
import type { JobMatch } from "@/types/match";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MatchScoreCard } from "./MatchScoreCard";

interface CandidateJobMatchesProps {
  candidateId: number;
  limit?: number;
  className?: string;
}

export function CandidateJobMatches({
  candidateId,
  limit = 5,
  className = "",
}: CandidateJobMatchesProps) {
  const [jobMatches, setJobMatches] = useState<JobMatch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<JobMatch | null>(null);
  const navigate = useNavigate();

  const loadJobMatches = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await matchesApi.getCandidateJobMatches(candidateId, limit);
      setJobMatches(response.jobs);
    } catch (err) {
      console.error("Error loading job matches:", err);
      const errorMessage =
        err instanceof Error && "response" in err
          ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail ||
            "Failed to load job matches"
          : "Failed to load job matches";
      setError(errorMessage);
      setJobMatches([]);
    } finally {
      setIsLoading(false);
    }
  }, [candidateId, limit]);

  const handleRecalculate = async () => {
    try {
      setIsRecalculating(true);
      await matchesApi.recalculateCandidateMatches(candidateId);
      await loadJobMatches();
    } catch (err) {
      console.error("Error recalculating matches:", err);
      const errorMessage =
        err instanceof Error && "response" in err
          ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail ||
            "Failed to recalculate matches"
          : "Failed to recalculate matches";
      setError(errorMessage);
    } finally {
      setIsRecalculating(false);
    }
  };

  useEffect(() => {
    loadJobMatches();
  }, [loadJobMatches]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (error && jobMatches.length === 0) {
    return (
      <div className={`bg-white border border-gray-200 rounded-lg p-6 ${className}`}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-sm font-medium text-gray-900">Job Matches</h3>
          <button
            onClick={loadJobMatches}
            disabled={isLoading}
            className="border border-gray-200 text-gray-700 rounded-md h-8 px-3 text-sm hover:bg-gray-50 disabled:opacity-50"
          >
            Retry
          </button>
        </div>
        <div className="text-center py-8">
          <p className="text-sm text-gray-500 mb-1">Unable to load job matches</p>
          <p className="text-sm text-gray-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-sm font-medium text-gray-900">Job Matches</h3>
        <button
          onClick={handleRecalculate}
          disabled={isRecalculating || isLoading}
          className="border border-gray-200 text-gray-700 rounded-md h-8 px-3 text-sm hover:bg-gray-50 disabled:opacity-50"
        >
          {isRecalculating ? "Recalculating..." : "Recalculate"}
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="border border-gray-100 rounded-lg p-4 animate-pulse">
              <div className="h-4 bg-gray-100 rounded w-2/3 mb-3" />
              <div className="h-3 bg-gray-100 rounded w-1/3 mb-2" />
              <div className="h-3 bg-gray-100 rounded w-1/4" />
            </div>
          ))}
        </div>
      ) : jobMatches.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-sm text-gray-500 mb-3">
            No matches yet. Calculate matches to see how this candidate fits your open jobs.
          </p>
          <button
            onClick={handleRecalculate}
            disabled={isRecalculating}
            className="border border-gray-200 text-gray-700 rounded-md h-8 px-3 text-sm hover:bg-gray-50 disabled:opacity-50"
          >
            {isRecalculating ? "Calculating..." : "Calculate matches"}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {jobMatches.map((match) => (
            <div
              key={match.job.id}
              className="border border-gray-200 rounded-lg p-4"
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium text-gray-900 mb-1">
                    {match.job.title}
                  </h4>
                  <div className="flex items-center gap-3 text-sm text-gray-500">
                    {match.job.location && <span>{match.job.location}</span>}
                  </div>
                </div>
                <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-xs capitalize ml-3">
                  {match.match.tier}
                </span>
              </div>

              <div className="flex justify-between items-center mb-3">
                <div className="text-lg font-semibold text-gray-900">
                  {match.match.overall_score.toFixed(1)}
                  <span className="text-sm text-gray-400 font-normal">/100</span>
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span>{match.match.skills_summary.matched_count} matched</span>
                  <span>{match.match.skills_summary.missing_count} missing</span>
                  <span>{match.match.skills_summary.extra_count} bonus</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Dialog>
                  <DialogTrigger asChild>
                    <button
                      onClick={() => setSelectedMatch(match)}
                      className="border border-gray-200 text-gray-700 rounded-md h-8 px-3 text-sm hover:bg-gray-50"
                    >
                      View details
                    </button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>{selectedMatch?.job.title}</DialogTitle>
                    </DialogHeader>
                    {selectedMatch && (
                      <MatchScoreCard match={selectedMatch.match} showDetails={true} size="lg" />
                    )}
                  </DialogContent>
                </Dialog>

                <button
                  onClick={() => navigate(`/jobs/${match.job.id}`)}
                  className="border border-gray-200 text-gray-700 rounded-md h-8 px-3 text-sm hover:bg-gray-50"
                >
                  View job
                </button>
              </div>

              {match.calculated_at && (
                <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-400">
                  Last calculated: {formatDate(match.calculated_at)}
                </div>
              )}
            </div>
          ))}

          {jobMatches.length >= limit && (
            <div className="text-center pt-2">
              <button
                onClick={() => navigate(`/candidates/${candidateId}/matches`)}
                className="text-sm text-gray-500 hover:text-gray-900"
              >
                View all matches
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
