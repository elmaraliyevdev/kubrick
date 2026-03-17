import type { MatchSummary } from "@/types/match";

interface MatchScoreCardProps {
  match: MatchSummary;
  showDetails?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function MatchScoreCard({
  match,
  showDetails = true,
  size = "md",
  className = "",
}: MatchScoreCardProps) {
  const getTierText = (tier: string) => {
    switch (tier) {
      case "excellent":
        return "Excellent Match";
      case "good":
        return "Good Match";
      case "poor":
        return "Poor Match";
      default:
        return "Not Scored";
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <span className={`text-sm font-medium text-gray-700 ${size === "sm" ? "text-xs" : ""}`}>
          Match Score
        </span>
        <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-xs">
          {getTierText(match.tier)}
        </span>
      </div>

      {/* Overall Score */}
      <div className="mb-4">
        <span className="text-2xl font-semibold text-green-600">
          {match.overall_score.toFixed(1)}
        </span>
        <span className="text-sm text-gray-500 ml-1">/100</span>
      </div>

      {showDetails && (
        <>
          {/* Component Scores */}
          <div className="space-y-2 mb-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Skills</span>
              <span className="font-medium text-gray-900">{match.breakdown.skills.toFixed(1)}/40</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Experience</span>
              <span className="font-medium text-gray-900">{match.breakdown.experience.toFixed(1)}/25</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Education</span>
              <span className="font-medium text-gray-900">{match.breakdown.education.toFixed(1)}/15</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Other Factors</span>
              <span className="font-medium text-gray-900">{match.breakdown.additional.toFixed(1)}/20</span>
            </div>
          </div>

          {/* Primary Skills Penalty Warning */}
          {match.primary_skills_penalty && match.primary_skills_penalty.applied < 1.0 && (
            <div className="border border-gray-200 rounded-lg p-3 mb-4">
              <p className="text-sm font-medium text-gray-700">
                Primary Skills Penalty ({Math.round(match.primary_skills_penalty.applied * 100)}%)
              </p>
              {match.primary_skills_penalty.missing_primary.length > 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  Missing: {match.primary_skills_penalty.missing_primary.join(", ")}
                </p>
              )}
              {match.primary_skills_penalty.raw_score != null && (
                <p className="text-xs text-gray-500">
                  Raw score before penalty: {match.primary_skills_penalty.raw_score.toFixed(1)}/100
                </p>
              )}
            </div>
          )}

          {/* Skills Summary */}
          <div className="border-t border-gray-100 pt-4">
            <div className="flex gap-6 text-sm">
              <div>
                <span className="font-medium text-gray-900">{match.skills_summary.matched_count}</span>
                <span className="text-gray-500 ml-1">matched</span>
              </div>
              <div>
                <span className="font-medium text-gray-900">{match.skills_summary.missing_count}</span>
                <span className="text-gray-500 ml-1">missing</span>
              </div>
              <div>
                <span className="font-medium text-gray-900">{match.skills_summary.extra_count}</span>
                <span className="text-gray-500 ml-1">bonus</span>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Calculation Info */}
      {match.calculated_at && (
        <p className="text-xs text-gray-400 mt-4 pt-4 border-t border-gray-100">
          Calculated {formatDate(match.calculated_at)}
          {match.needs_recalculation && " (needs recalculation)"}
        </p>
      )}
    </div>
  );
}
