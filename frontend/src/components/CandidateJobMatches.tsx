import { MatchScoreCard } from "@/components/MatchScoreCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { matchesApi } from "@/services/matches";
import type { JobMatch } from "@/types/match";
import { cn } from "@/lib/utils";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

interface CandidateJobMatchesProps {
  candidateId: number;
  limit?: number;
  className?: string;
}

function tierBadgeClass(tier: string) {
  switch (tier) {
    case "excellent":
      return "border-emerald-200 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100";
    case "good":
      return "border-sky-200 bg-sky-50 text-sky-900 dark:bg-sky-950/30 dark:text-sky-100";
    case "poor":
      return "border-amber-200 bg-amber-50 text-amber-900 dark:bg-amber-950/30 dark:text-amber-100";
    default:
      return "text-muted-foreground";
  }
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
  const [detailMatch, setDetailMatch] = useState<JobMatch | null>(null);
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
      <div className={cn("space-y-4", className)}>
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={loadJobMatches} disabled={isLoading}>
            Retry
          </Button>
        </div>
        <div className="py-12 text-center">
          <p className="text-sm text-muted-foreground">Unable to load job matches</p>
          <p className="mt-1 text-sm text-muted-foreground/80">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={handleRecalculate}
          disabled={isRecalculating || isLoading}
        >
          {isRecalculating ? "Recalculating…" : "Recalculate"}
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <Card key={index} className="overflow-hidden">
              <CardHeader className="space-y-2">
                <div className="h-5 w-2/3 animate-pulse rounded-md bg-muted" />
                <div className="h-4 w-1/3 animate-pulse rounded-md bg-muted" />
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="h-8 w-24 animate-pulse rounded-md bg-muted" />
                <div className="h-9 w-full max-w-xs animate-pulse rounded-md bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : jobMatches.length === 0 ? (
        <div className="py-12 text-center">
          <p className="mb-4 text-sm text-muted-foreground">
            No matches yet. Calculate matches to see how this candidate fits your open jobs.
          </p>
          <Button variant="outline" size="sm" onClick={handleRecalculate} disabled={isRecalculating}>
            {isRecalculating ? "Calculating…" : "Calculate matches"}
          </Button>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {jobMatches.map((match) => (
              <Card key={match.job.id}>
                <CardHeader>
                  <CardTitle className="text-lg leading-snug">{match.job.title}</CardTitle>
                  <CardDescription>
                    {match.job.location ? (
                      <span className="text-foreground/80">{match.job.location}</span>
                    ) : (
                      <span className="text-muted-foreground">No location</span>
                    )}
                  </CardDescription>
                  <CardAction>
                    <Badge
                      variant="outline"
                      className={cn("capitalize", tierBadgeClass(match.match.tier))}
                    >
                      {match.match.tier}
                    </Badge>
                  </CardAction>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap items-end justify-between gap-4">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Match score
                      </p>
                      <p className="text-3xl font-semibold tabular-nums tracking-tight text-foreground">
                        {match.match.overall_score.toFixed(1)}
                        <span className="text-lg font-normal text-muted-foreground">/100</span>
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span>{match.match.skills_summary.matched_count} matched</span>
                      <span>{match.match.skills_summary.missing_count} missing</span>
                      <span>{match.match.skills_summary.extra_count} bonus</span>
                    </div>
                  </div>
                  <Separator />
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={() => setDetailMatch(match)}>
                      View details
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => navigate(`/jobs/${match.job.id}`)}>
                      View job
                    </Button>
                  </div>
                </CardContent>
                {match.calculated_at ? (
                  <CardFooter className="border-t border-border pt-6 text-xs text-muted-foreground">
                    Last calculated {formatDate(match.calculated_at)}
                  </CardFooter>
                ) : null}
              </Card>
            ))}
          </div>

          {jobMatches.length >= limit ? (
            <div className="pt-2 text-center">
              <Button
                variant="link"
                className="text-muted-foreground"
                onClick={() => navigate(`/candidates/${candidateId}/matches`)}
              >
                View all matches
              </Button>
            </div>
          ) : null}
        </>
      )}

      <Dialog open={detailMatch !== null} onOpenChange={(open) => !open && setDetailMatch(null)}>
        <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{detailMatch?.job.title}</DialogTitle>
          </DialogHeader>
          {detailMatch ? (
            <MatchScoreCard match={detailMatch.match} showDetails size="lg" />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
