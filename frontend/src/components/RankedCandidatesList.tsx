import { DataTable, DataTableColumnHeader } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { CandidateMatch } from "@/types/match";
import type { ColumnDef, FilterFn } from "@tanstack/react-table";
import { MoreHorizontal } from "lucide-react";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { MatchAnalysisDetails } from "./MatchAnalysisDetails";
import { MatchScoreCard } from "./MatchScoreCard";

interface RankedCandidatesListProps {
  candidates: CandidateMatch[];
  isLoading?: boolean;
  onLoadMore?: () => void;
  hasMore?: boolean;
  onCandidateSelect?: (candidateId: number) => void;
  onViewDetails?: (candidateId: number) => void;
  /** Shown on the toolbar right (e.g. Calculate matches) */
  toolbarActions?: ReactNode;
  showFilters?: boolean;
  className?: string;
}

const globalFilterFn: FilterFn<CandidateMatch> = (row, _columnId, filterValue) => {
  const q = String(filterValue).toLowerCase();
  if (!q) return true;
  const c = row.original.candidate;
  const name = `${c.first_name} ${c.last_name}`.toLowerCase();
  const email = c.email?.toLowerCase() ?? "";
  return name.includes(q) || email.includes(q);
};

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

export function RankedCandidatesList({
  candidates,
  isLoading = false,
  onLoadMore,
  hasMore = false,
  onCandidateSelect,
  onViewDetails,
  toolbarActions,
  showFilters = true,
  className = "",
}: RankedCandidatesListProps) {
  const tierItems = useMemo(
    () =>
      [
        { label: "All tiers", value: "all" as const },
        { label: "Excellent", value: "excellent" as const },
        { label: "Good", value: "good" as const },
        { label: "Poor", value: "poor" as const },
      ] as const,
    []
  );

  const [selectedTier, setSelectedTier] = useState<(typeof tierItems)[number]["value"]>("all");
  const [detailCandidate, setDetailCandidate] = useState<CandidateMatch | null>(null);

  const filteredCandidates = useMemo(() => {
    return candidates.filter((c) => {
      if (selectedTier !== "all" && c.match.tier !== selectedTier) return false;
      return true;
    });
  }, [candidates, selectedTier]);

  const formatExperience = (years: number | undefined) => {
    if (years == null || years === 0) return "—";
    return `${years} yr${years !== 1 ? "s" : ""}`;
  };

  const columns = useMemo<ColumnDef<CandidateMatch>[]>(
    () => [
      {
        id: "name",
        accessorFn: (row) => `${row.candidate.first_name} ${row.candidate.last_name}`,
        header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
        cell: ({ row }) => (
          <span className="font-medium">
            {row.original.candidate.first_name} {row.original.candidate.last_name}
          </span>
        ),
      },
      {
        id: "email",
        accessorFn: (row) => row.candidate.email ?? "",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Email" />,
        cell: ({ row }) => (
          <span className="text-muted-foreground">{row.original.candidate.email ?? "—"}</span>
        ),
      },
      {
        id: "score",
        accessorFn: (row) => row.match.overall_score,
        header: ({ column }) => <DataTableColumnHeader column={column} title="Score" />,
        cell: ({ row }) => (
          <div className="text-left font-medium whitespace-nowrap tabular-nums">
            {row.original.match.overall_score.toFixed(1)}
          </div>
        ),
      },
      {
        id: "tier",
        accessorFn: (row) => row.match.tier,
        header: "Tier",
        enableSorting: false,
        cell: ({ row }) => (
          <Badge
            variant="outline"
            className={cn("capitalize", tierBadgeClass(row.original.match.tier))}
          >
            {row.original.match.tier}
          </Badge>
        ),
      },
      {
        id: "experience",
        accessorFn: (row) => row.candidate.experience_years ?? 0,
        header: "Experience",
        enableSorting: false,
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {formatExperience(row.original.candidate.experience_years)}
          </span>
        ),
      },
      {
        id: "actions",
        enableHiding: false,
        cell: ({ row }) => {
          const candidate = row.original;
          return (
            <DropdownMenu>
              <DropdownMenuTrigger
                className={cn(
                  buttonVariants({ variant: "ghost", size: "icon" }),
                  "text-muted-foreground data-[popup-open]:bg-muted size-8"
                )}
                aria-label="Open menu"
              >
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="size-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem onClick={() => setDetailCandidate(candidate)}>
                  Match details
                </DropdownMenuItem>
                {onViewDetails ? (
                  <DropdownMenuItem onClick={() => onViewDetails(candidate.candidate.id)}>
                    View profile
                  </DropdownMenuItem>
                ) : null}
                {onCandidateSelect ? (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => onCandidateSelect(candidate.candidate.id)}>
                      Contact
                    </DropdownMenuItem>
                  </>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    [onCandidateSelect, onViewDetails]
  );

  if (isLoading && candidates.length === 0) {
    return (
      <div className={`space-y-4 ${className}`}>
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="bg-card animate-pulse rounded-md border p-6">
            <div className="mb-2 h-4 w-48 rounded bg-muted" />
            <div className="h-4 w-32 rounded bg-muted" />
          </div>
        ))}
      </div>
    );
  }

  if (candidates.length === 0) {
    return (
      <div
        className={`bg-card text-muted-foreground rounded-md border p-6 text-center text-sm ${className}`}
      >
        No candidates have been matched against this job yet.
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <DataTable
        columns={columns}
        data={filteredCandidates}
        searchPlaceholder="Filter candidates..."
        globalFilterFn={globalFilterFn}
        initialSorting={[{ id: "score", desc: true }]}
        toolbarRight={toolbarActions}
        emptyMessage={
          selectedTier !== "all" ? "No candidates match these filters." : "No candidates found."
        }
        toolbarExtra={
          showFilters ? (
            <Select
              value={selectedTier}
              onValueChange={(value) =>
                setSelectedTier((value ?? "all") as typeof selectedTier)
              }
            >
              <SelectTrigger className="w-full max-w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Tier</SelectLabel>
                  {tierItems.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          ) : null
        }
      />

      {hasMore && !isLoading && onLoadMore ? (
        <div className="text-center">
          <Button variant="outline" size="sm" onClick={onLoadMore}>
            Load more
          </Button>
        </div>
      ) : null}

      {isLoading && candidates.length > 0 ? (
        <p className="text-muted-foreground text-center text-sm">Loading…</p>
      ) : null}

      <Dialog
        open={detailCandidate !== null}
        onOpenChange={(open) => !open && setDetailCandidate(null)}
      >
        <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Match analysis: {detailCandidate?.candidate.first_name}{" "}
              {detailCandidate?.candidate.last_name}
            </DialogTitle>
          </DialogHeader>
          {detailCandidate ? (
            <>
              <MatchScoreCard match={detailCandidate.match} showDetails size="lg" />
              <MatchAnalysisDetails match={detailCandidate.match} />
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
