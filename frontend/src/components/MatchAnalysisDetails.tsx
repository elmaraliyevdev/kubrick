import type { MatchSummary } from "@/types/match";

interface MatchAnalysisDetailsProps {
  match: MatchSummary;
}

export function MatchAnalysisDetails({ match }: MatchAnalysisDetailsProps) {
  const matched = match.skills_summary.matched || [];
  const missing = match.skills_summary.missing || [];
  const extra = match.skills_summary.extra || [];
  const primaryMissing = match.primary_skills_penalty?.missing_primary || [];

  const goodReasons: string[] = [];
  const weakReasons: string[] = [];

  if (matched.length > 0) {
    goodReasons.push(
      `Matches ${matched.length} required skill${matched.length === 1 ? "" : "s"}.`
    );
  }
  if ((match.breakdown.experience || 0) >= 15) {
    goodReasons.push("Experience component is strong for this role.");
  }
  if ((match.breakdown.education || 0) >= 9) {
    goodReasons.push("Education/background alignment is above average.");
  }
  if (extra.length > 0) {
    goodReasons.push(
      `${extra.length} additional skill${extra.length === 1 ? "" : "s"} provide extra upside.`
    );
  }

  if (missing.length > 0) {
    weakReasons.push(
      `Missing ${missing.length} required skill${missing.length === 1 ? "" : "s"}.`
    );
  }
  if (primaryMissing.length > 0) {
    weakReasons.push(
      `Missing primary skill${primaryMissing.length === 1 ? "" : "s"}: ${primaryMissing.join(", ")}.`
    );
  }
  if ((match.breakdown.skills || 0) < 20) {
    weakReasons.push("Skills component score is below expected range.");
  }
  if ((match.breakdown.additional || 0) < 8) {
    weakReasons.push("Additional factors score indicates weaker overall fit signals.");
  }

  return (
    <div className="mt-4 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border border-gray-200 rounded-lg p-4">
          <p className="text-sm font-medium text-gray-900 mb-2">Why this is a good match</p>
          {goodReasons.length > 0 ? (
            <ul className="space-y-1 text-sm text-gray-700">
              {goodReasons.map((reason) => (
                <li key={reason}>- {reason}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500">No strong positives detected yet.</p>
          )}
        </div>

        <div className="border border-gray-200 rounded-lg p-4">
          <p className="text-sm font-medium text-gray-900 mb-2">Why this is not a stronger match</p>
          {weakReasons.length > 0 ? (
            <ul className="space-y-1 text-sm text-gray-700">
              {weakReasons.map((reason) => (
                <li key={reason}>- {reason}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500">No major concerns detected.</p>
          )}
        </div>
      </div>

      <div className="border border-gray-200 rounded-lg p-4">
        <p className="text-sm font-medium text-gray-900 mb-2">Matching skills</p>
        {matched.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {matched.map((skill) => (
              <span key={skill} className="bg-green-50 text-green-700 border border-green-100 px-2 py-0.5 rounded text-xs">
                {skill}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">No matching skills found.</p>
        )}
      </div>

      <div className="border border-gray-200 rounded-lg p-4">
        <p className="text-sm font-medium text-gray-900 mb-2">Missing skills</p>
        {missing.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {missing.map((skill) => (
              <span key={skill} className="bg-red-50 text-red-700 border border-red-100 px-2 py-0.5 rounded text-xs">
                {skill}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">No missing required skills.</p>
        )}
      </div>

      {extra.length > 0 && (
        <div className="border border-gray-200 rounded-lg p-4">
          <p className="text-sm font-medium text-gray-900 mb-2">Additional candidate skills</p>
          <div className="flex flex-wrap gap-2">
            {extra.map((skill) => (
              <span key={skill} className="bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded text-xs">
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

