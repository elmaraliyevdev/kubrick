import { DashboardApplicationsTable } from "@/components/dashboard/DashboardApplicationsTable";
import { CandidatesDataTable } from "@/components/CandidatesDataTable";
import { JobsDataTable } from "@/components/JobsDataTable";
import { SegmentedTabs } from "@/components/SegmentedTabs";
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
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import {
  useDashboardApplications,
  useDashboardStats,
  type DashboardPeriod,
} from "@/hooks/useDashboard";
import { useCandidates } from "@/hooks/useCandidates";
import { useJobs } from "@/hooks/useJobs";
import { isIsoDateInRange } from "@/utils/dateRangeFilter";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

const PERIOD_ITEMS: { value: DashboardPeriod; label: string }[] = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "month", label: "This month" },
  { value: "custom", label: "Custom" },
];

function defaultCustomRange() {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 7);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [period, setPeriod] = useState<DashboardPeriod>("7d");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  useEffect(() => {
    if (period === "custom" && (!customStart || !customEnd)) {
      const d = defaultCustomRange();
      setCustomStart(d.start);
      setCustomEnd(d.end);
    }
  }, [period, customStart, customEnd]);

  const customParams =
    period === "custom" && customStart && customEnd
      ? { start: customStart, end: customEnd }
      : undefined;

  const rangeQueryEnabled = period !== "custom" || Boolean(customParams);
  const { data: stats, isLoading: statsLoading } = useDashboardStats(
    period,
    customParams,
    rangeQueryEnabled
  );
  const { data: applications = [], isLoading: appsLoading } = useDashboardApplications(
    period,
    customParams,
    rangeQueryEnabled
  );
  const { data: jobsData, isLoading: jobsLoading } = useJobs();
  const { data: candidatesData, isLoading: candidatesLoading } = useCandidates({
    limit: 1000,
  });
  const allJobs = Array.isArray(jobsData) ? jobsData : [];
  const allCandidates = Array.isArray(candidatesData) ? candidatesData : [];

  const range = stats?.range;
  const filteredJobs = useMemo(() => {
    if (!range?.start || !range?.end) return [];
    return allJobs.filter((j) => isIsoDateInRange(j.created_at, range.start, range.end));
  }, [allJobs, range]);

  const filteredCandidates = useMemo(() => {
    if (!range?.start || !range?.end) return [];
    return allCandidates.filter((c) => isIsoDateInRange(c.created_at, range.start, range.end));
  }, [allCandidates, range]);

  const appTrend = stats?.trends?.applications ?? 0;
  const appTrendPositive = appTrend >= 0;

  const tableLoading = statsLoading || jobsLoading || candidatesLoading;

  if (statsLoading && !stats) {
    return (
      <div className="space-y-8 p-6">
        <div className="h-6 w-48 animate-pulse rounded bg-muted" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
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

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <div>
        <p className="text-lg font-medium text-foreground">
          Welcome back, {user?.first_name || "User"}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Here&apos;s an overview of your hiring pipeline.
        </p>
      </div>

      {/* Period + optional custom range */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <SegmentedTabs
          value={period}
          onValueChange={(v) => setPeriod(v as DashboardPeriod)}
          items={PERIOD_ITEMS.map((p) => ({ value: p.value, label: p.label }))}
          className="w-full max-w-xl lg:w-auto"
        />
        {period === "custom" ? (
          <div className="flex flex-wrap items-end gap-3 lg:ml-auto">
            <div className="space-y-1.5">
              <Label htmlFor="dash-from" className="text-xs text-muted-foreground">
                From
              </Label>
              <input
                id="dash-from"
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="border-input bg-background h-9 rounded-md border px-3 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dash-to" className="text-xs text-muted-foreground">
                To
              </Label>
              <input
                id="dash-to"
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="border-input bg-background h-9 rounded-md border px-3 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
          </div>
        ) : null}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="@container/card">
          <CardHeader>
            <CardDescription>Open positions</CardDescription>
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

        <Card className="@container/card">
          <CardHeader>
            <CardDescription>New applications</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              {stats?.new_applications ?? 0}
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
                {appTrendPositive ? "Up" : "Down"} vs previous period
                {appTrendPositive ? (
                  <IconTrendingUp className="size-4" />
                ) : (
                  <IconTrendingDown className="size-4" />
                )}
              </div>
            )}
            <div className="text-muted-foreground">In selected date range</div>
          </CardFooter>
        </Card>

        <Card className="@container/card">
          <CardHeader>
            <CardDescription>New candidates</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              {stats?.new_candidates ?? 0}
            </CardTitle>
            <CardAction>
              {(stats?.new_candidates ?? 0) > 0 && (
                <Badge variant="outline" className="text-xs">
                  Added
                </Badge>
              )}
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="text-muted-foreground">Profiles created in this range</div>
          </CardFooter>
        </Card>

        <Card className="@container/card">
          <CardHeader>
            <CardDescription>Top match</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              {stats?.top_match_score != null ? `${stats.top_match_score}%` : "—"}
            </CardTitle>
            <CardAction>
              {stats?.top_match_score != null && stats.top_match_score >= 80 && (
                <Badge variant="outline" className="text-xs">
                  <IconTrendingUp className="size-3.5" />
                  Strong
                </Badge>
              )}
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="text-muted-foreground">
              {stats?.top_match_score != null
                ? "Best score in your organization"
                : "Run matching to see scores"}
            </div>
          </CardFooter>
        </Card>
      </div>

      {/* Table tabs */}
      <Tabs defaultValue="candidates" className="w-full space-y-4">
        <TabsList>
          <TabsTrigger value="candidates">Candidates</TabsTrigger>
          <TabsTrigger value="jobs">Jobs</TabsTrigger>
          <TabsTrigger value="applications">Applications</TabsTrigger>
        </TabsList>

        <TabsContent value="candidates" className="mt-0 space-y-4">
          <CandidatesDataTable
            data={filteredCandidates}
            isLoading={tableLoading}
            hideToolbar
            onEditCandidate={(c) => navigate(`/candidates/${c.id}`)}
          />
        </TabsContent>

        <TabsContent value="jobs" className="mt-0 space-y-4">
          <JobsDataTable
            data={filteredJobs}
            isLoading={tableLoading}
            hideToolbar
            onEditJob={(job) => navigate(`/jobs/${job.id}`)}
          />
        </TabsContent>

        <TabsContent value="applications" className="mt-0 space-y-4">
          <DashboardApplicationsTable data={applications} isLoading={appsLoading || statsLoading} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
