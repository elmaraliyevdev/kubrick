import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { matchesApi } from "@/services/matches";
import type { MatchCalculationResult } from "@/types/match";
import { useState } from "react";

interface CalculateMatchesButtonProps {
  jobId: number;
  onCalculationComplete?: (result: MatchCalculationResult) => void;
  candidateIds?: number[];
  forceRecalculate?: boolean;
  disabled?: boolean;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg";
  className?: string;
}

export function CalculateMatchesButton({
  jobId,
  onCalculationComplete,
  candidateIds,
  forceRecalculate = false,
  disabled = false,
  className = "",
}: CalculateMatchesButtonProps) {
  const [isCalculating, setIsCalculating] = useState(false);
  const [result, setResult] = useState<MatchCalculationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showDialog, setShowDialog] = useState(false);

  const handleCalculate = async () => {
    try {
      setIsCalculating(true);
      setError(null);
      setResult(null);

      console.log("Calculate matches called with:", { jobId, candidateIds, forceRecalculate });

      // First, ensure job requirements are parsed
      await matchesApi.parseJobRequirements(jobId, false);

      // Then calculate matches
      const calculationResult = await matchesApi.calculateJobMatches(
        jobId,
        candidateIds,
        forceRecalculate
      );

      setResult(calculationResult);
      setShowDialog(true);

      if (onCalculationComplete) {
        onCalculationComplete(calculationResult);
      }
    } catch (err) {
      console.error("Error calculating matches:", err);

      // Log the full response for debugging
      if (err instanceof Error && "response" in err) {
        const axiosError = err as { response?: { data?: any; status?: number } };
        console.error("Full error response:", axiosError.response?.data);
        console.error("Error status:", axiosError.response?.status);
      }

      let errorMessage = "Failed to calculate matches";

      if (err instanceof Error && "response" in err) {
        const axiosError = err as { response?: { data?: { detail?: string | Array<{msg: string}> } } };
        const detail = axiosError.response?.data?.detail;

        if (typeof detail === "string") {
          errorMessage = detail;
        } else if (Array.isArray(detail)) {
          // Handle Pydantic validation errors
          errorMessage = detail.map(error => error.msg).join(", ");
        } else if (detail) {
          errorMessage = "Validation error occurred";
        }
      }

      setError(errorMessage);
    } finally {
      setIsCalculating(false);
    }
  };

  const getProgressPercentage = () => {
    if (!result) return 0;
    return result.total_candidates > 0 ? (result.processed / result.total_candidates) * 100 : 0;
  };

  return (
    <>
      <button
        onClick={handleCalculate}
        disabled={disabled || isCalculating}
        className={`inline-flex items-center justify-center bg-gray-900 text-white rounded-lg h-10 min-h-10 px-4 text-sm font-medium leading-5 disabled:opacity-50 ${className}`}
      >
        {isCalculating
          ? "Calculating..."
          : forceRecalculate
            ? "Recalculate matches"
            : "Calculate matches"}
      </button>

      {/* Inline Error Display */}
      {error && !showDialog && (
        <p className="text-sm text-red-600 mt-2">{typeof error === "string" ? error : "An error occurred"}</p>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Match Calculation Results</DialogTitle>
          </DialogHeader>

          {result && (
            <div className="space-y-6">
              {/* Summary Stats */}
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-semibold text-gray-900">{result.total_candidates}</div>
                  <div className="text-sm text-gray-500">Total</div>
                </div>
                <div>
                  <div className="text-2xl font-semibold text-green-600">{result.successful}</div>
                  <div className="text-sm text-gray-500">Successful</div>
                </div>
                <div>
                  <div className="text-2xl font-semibold text-gray-900">{result.failed}</div>
                  <div className="text-sm text-gray-500">Failed</div>
                </div>
              </div>

              {/* Progress */}
              <p className="text-sm text-gray-500 text-center">
                {getProgressPercentage().toFixed(0)}% complete
              </p>

              {/* Top Results */}
              {result.results.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Top Matches</h4>
                  <div className="space-y-2">
                    {result.results.slice(0, 5).map((match, index) => (
                      <div
                        key={match.candidate_id}
                        className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
                      >
                        <div>
                          <span className="text-sm text-gray-400 mr-3">#{index + 1}</span>
                          <span className="text-sm font-medium text-gray-900">{match.candidate_name}</span>
                          <span className="text-sm text-gray-500 ml-3">
                            {match.skills_matched} matched, {match.skills_missing} missing
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-gray-500 capitalize">{match.tier}</span>
                          <span className="text-sm font-medium text-green-600">
                            {match.match_score.toFixed(1)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Errors */}
              {result.errors.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-900 mb-1">Some matches failed:</p>
                  <ul className="list-disc list-inside text-sm text-gray-500">
                    {result.errors.slice(0, 3).map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                    {result.errors.length > 3 && (
                      <li>... and {result.errors.length - 3} more errors</li>
                    )}
                  </ul>
                </div>
              )}

              {/* Success Message */}
              {result.successful > 0 && result.failed === 0 && (
                <p className="text-sm text-green-600">
                  Successfully calculated match scores for {result.successful} candidates.
                </p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
