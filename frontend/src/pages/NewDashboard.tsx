import { IconTrendingDown, IconTrendingUp } from "@tabler/icons-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useRecentCandidates } from "@/hooks/useAnalytics";
import { useQuery } from "@tanstack/react-query";
import api from "@/utils/api";
import { useNavigate } from "react-router-dom";

function useDashboardStats() {
  return useQuery({
    queryKey: ["dashboard", "stats"],
    queryFn: async () => {
      const res = await api.get("/dashboard/stats");
      return res.data as {
        open_positions: number;
        new_applications_7d: number;
        candidates_to_review: number;
        top_match_score: number | null;
        trends: {
          applications: number | null;
        };
      };
    },
    staleTime: 2 * 60 * 1000,
  });
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: stats, isLoading } = useDashboardStats();
  const { data: recentCandidates, isLoading: candidatesLoading } = useRecentCandidates(5);

  if (isLoading) {
    return (
      <div className="p-6 space-y-8">
        <div className="h-6 w-48 rounded bg-muted animate-pulse" />
        <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-32 animate-pulse rounded-lg border border-border bg-muted/40"
            />
          ))}
        </div>
      </div>
    );
  }

  const appTrend = stats?.trends?.applications ?? 0;
  const appTrendPositive = appTrend >= 0;

  return (
    <div className="p-6 space-y-8">
      {/* Welcome */}
      <div>
        <p className="text-lg font-medium text-foreground">
          Welcome back, {user?.first_name || "User"}
        </p>
        <p className="text-sm text-muted-foreground mt-1">Here's an overview of your hiring pipeline.</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
        {/* Open Positions */}
        <Card className="@container/card">
          <CardHeader>
            <CardDescription>Open Positions</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              {stats?.open_positions ?? 0}
            </CardTitle>
            <CardAction>
              <Badge variant="outline" className="text-xs">
                Active
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="text-muted-foreground">Jobs currently accepting applications</div>
          </CardFooter>
        </Card>

        {/* New Applications (7d) */}
        <Card className="@container/card">
          <CardHeader>
            <CardDescription>New Applications</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              {stats?.new_applications_7d ?? 0}
            </CardTitle>
            <CardAction>
              {appTrend !== 0 && (
                <Badge variant="outline" className="text-xs">
                  {appTrendPositive ? (
                    <IconTrendingUp className="size-3.5" />
                  ) : (
                    <IconTrendingDown className="size-3.5" />
                  )}
                  {appTrendPositive ? "+" : ""}
                  {appTrend}%
                </Badge>
              )}
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            {appTrend !== 0 && (
              <div className="line-clamp-1 flex gap-2 font-medium">
                {appTrendPositive ? "Up" : "Down"} vs previous week
                {appTrendPositive ? (
                  <IconTrendingUp className="size-4" />
                ) : (
                  <IconTrendingDown className="size-4" />
                )}
              </div>
            )}
            <div className="text-muted-foreground">Last 7 days</div>
          </CardFooter>
        </Card>

        {/* Candidates to Review */}
        <Card className="@container/card">
          <CardHeader>
            <CardDescription>To Review</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              {stats?.candidates_to_review ?? 0}
            </CardTitle>
            <CardAction>
              {(stats?.candidates_to_review ?? 0) > 0 && (
                <Badge variant="outline" className="text-xs">
                  Needs attention
                </Badge>
              )}
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="text-muted-foreground">Unreviewed applications waiting</div>
          </CardFooter>
        </Card>

        {/* Top Match Score */}
        <Card className="@container/card">
          <CardHeader>
            <CardDescription>Top Match</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              {stats?.top_match_score != null ? `${stats.top_match_score}%` : "—"}
            </CardTitle>
            <CardAction>
              {stats?.top_match_score != null && stats.top_match_score >= 80 && (
                <Badge variant="outline" className="text-xs">
                  <IconTrendingUp className="size-3.5" />
                  Excellent
                </Badge>
              )}
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="text-muted-foreground">
              {stats?.top_match_score != null
                ? "Best candidate-job match score"
                : "Run matching to see scores"}
            </div>
          </CardFooter>
        </Card>
      </div>

      {/* Recent Candidates */}
      <div>
        <p className="text-sm font-medium text-foreground mb-4">Recent candidates</p>
        <div className="rounded-lg bg-card p-6 text-card-foreground ring-1 ring-foreground/10">
          {candidatesLoading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : recentCandidates && recentCandidates.length > 0 ? (
            <div>
              {recentCandidates.map((candidate, idx) => (
                <div
                  key={candidate.id}
                  onClick={() => navigate(`/candidates/${candidate.id}`)}
                  className={`flex items-center justify-between py-3 cursor-pointer hover:bg-muted/50 -mx-2 px-2 rounded ${
                    idx < recentCandidates.length - 1 ? "border-b border-border" : ""
                  }`}
                >
                  <div className="flex items-center gap-6">
                    <span className="text-sm text-foreground">
                      {candidate.first_name} {candidate.last_name}
                    </span>
                    <span className="text-sm text-muted-foreground">{candidate.email}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {new Date(candidate.created_at).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No recent candidates</p>
          )}
        </div>
      </div>
    </div>
  );
}
