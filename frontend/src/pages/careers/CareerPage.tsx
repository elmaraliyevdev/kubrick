import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useCareerPage } from "@/hooks/useCareers";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CareerPageFilters } from "@/types/career";
import { Search, MapPin, ChevronRight, Briefcase } from "lucide-react";
import { cn } from "@/lib/utils";

const WORK_ARRANGEMENTS: Record<string, string> = {
  remote_only: "Remote Only",
  remote_possible: "Remote Possible",
  hybrid: "Hybrid",
  onsite: "Onsite",
  relocation_required: "Relocation Required",
};

const EMPLOYMENT_TYPES: Record<string, string> = {
  full_time: "Full Time",
  part_time: "Part Time",
  contract: "Contract",
  internship: "Internship",
};

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "1 day ago";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
}

interface CareerPageProps {
  orgSlug?: string;
}

export default function CareerPage({ orgSlug: propSlug }: CareerPageProps) {
  const { orgSlug: paramSlug } = useParams<{ orgSlug: string }>();
  const orgSlug = propSlug || paramSlug;
  const [filters, setFilters] = useState<CareerPageFilters>({});
  const [searchInput, setSearchInput] = useState("");

  const { data, isLoading, error } = useCareerPage(orgSlug || "", filters);

  const handleSearch = () => {
    setFilters((f) => ({ ...f, search: searchInput || undefined }));
  };

  const clearFilters = () => {
    setFilters({});
    setSearchInput("");
  };

  const hasFilters =
    filters.category ||
    filters.work_arrangement ||
    filters.employment_type ||
    filters.search;

  if (error) {
    return (
      <div className="text-center py-20 max-w-md mx-auto">
        <h2 className="text-lg font-semibold text-foreground mb-2">Page not found</h2>
        <p className="text-sm text-muted-foreground">The career page you&apos;re looking for doesn&apos;t exist.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-10 lg:gap-12">
      {/* Filters */}
      <aside className="w-full lg:w-72 shrink-0">
        <div className="lg:sticky lg:top-24 space-y-6">
          <Card className="shadow-sm border-border/80">
            <CardContent className="pt-6 space-y-5">
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Search</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                    <Input
                      placeholder="Role, keyword…"
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                      className="h-10 pl-9"
                    />
                  </div>
                  <Button type="button" variant="secondary" className="shrink-0" onClick={handleSearch}>
                    Go
                  </Button>
                </div>
              </div>

              {data && data.categories.length > 0 && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground block">Category</label>
                  <Select
                    value={filters.category || ""}
                    onValueChange={(v) =>
                      setFilters((f) => ({
                        ...f,
                        category: v === "all" ? undefined : v,
                      }))
                    }
                  >
                    <SelectTrigger className="h-10 w-full">
                      <SelectValue placeholder="All categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All categories</SelectItem>
                      {data.categories.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground block">Work arrangement</label>
                <Select
                  value={filters.work_arrangement || ""}
                  onValueChange={(v) =>
                    setFilters((f) => ({
                      ...f,
                      work_arrangement: v === "all" ? undefined : v,
                    }))
                  }
                >
                  <SelectTrigger className="h-10 w-full">
                    <SelectValue placeholder="All arrangements" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All arrangements</SelectItem>
                    {Object.entries(WORK_ARRANGEMENTS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground block">Employment type</label>
                <Select
                  value={filters.employment_type || ""}
                  onValueChange={(v) =>
                    setFilters((f) => ({
                      ...f,
                      employment_type: v === "all" ? undefined : v,
                    }))
                  }
                >
                  <SelectTrigger className="h-10 w-full">
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All types</SelectItem>
                    {Object.entries(EMPLOYMENT_TYPES).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {hasFilters && (
                <Button type="button" variant="outline" className="w-full" onClick={clearFilters}>
                  Clear filters
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 min-w-0">
        <div className="mb-8 rounded-2xl border border-border/80 bg-gradient-to-br from-card via-card to-muted/40 p-6 sm:p-8 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
              <Briefcase className="size-5" aria-hidden />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
                Open positions
              </h1>
              <p className="text-muted-foreground text-sm sm:text-base mt-2 max-w-2xl leading-relaxed">
                Explore roles that match your skills. Use the filters to narrow by category, arrangement, or
                employment type.
              </p>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="rounded-xl border border-border bg-card p-6 animate-pulse"
              >
                <div className="h-5 bg-muted rounded w-2/3 mb-3" />
                <div className="h-4 bg-muted rounded w-1/3 mb-4" />
                <div className="h-6 bg-muted rounded w-40" />
              </div>
            ))}
          </div>
        ) : data && data.jobs.length > 0 ? (
          <>
            <p className="text-sm font-medium text-muted-foreground mb-4">
              {data.total_count} open position{data.total_count !== 1 ? "s" : ""}
            </p>
            <ul className="space-y-3">
              {data.jobs.map((job) => {
                const href = propSlug ? `/${job.slug}` : `/${orgSlug}/${job.slug}`;
                return (
                  <li key={job.slug}>
                    <Link
                      to={href}
                      className={cn(
                        "group flex items-center gap-4 rounded-xl border border-border/80 bg-card p-5 sm:p-6",
                        "shadow-sm transition-all duration-200",
                        "hover:border-primary/25 hover:shadow-md hover:bg-card/95"
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <h2 className="text-base sm:text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
                          {job.title}
                        </h2>
                        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                          {job.location && (
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="size-3.5 shrink-0 opacity-70" aria-hidden />
                              {job.location}
                            </span>
                          )}
                          <span>{EMPLOYMENT_TYPES[job.employment_type] || job.employment_type}</span>
                          <span className="text-muted-foreground/80">{timeAgo(job.created_at)}</span>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-3">
                          <Badge variant="secondary" className="font-normal text-xs">
                            {WORK_ARRANGEMENTS[job.work_arrangement] || job.work_arrangement}
                          </Badge>
                          {job.category && (
                            <Badge variant="outline" className="font-normal text-xs">
                              {job.category}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <ChevronRight
                        className="size-5 text-muted-foreground shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:text-foreground"
                        aria-hidden
                      />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </>
        ) : (
          <div className="rounded-xl border border-dashed border-border bg-muted/30 px-6 py-16 text-center">
            <h3 className="text-base font-semibold text-foreground mb-2">No open positions</h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              {hasFilters
                ? "No jobs match your filters. Try adjusting your search."
                : "Check back later for new opportunities."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
