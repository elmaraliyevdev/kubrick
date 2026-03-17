import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useCareerPage } from "@/hooks/useCareers";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CareerPageFilters } from "@/types/career";

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

function formatSalary(min?: number, max?: number): string | null {
  if (!min && !max) return null;
  const fmt = (n: number) =>
    n >= 1000 ? `$${Math.round(n / 1000)}k` : `$${n}`;
  if (min && max) return `${fmt(min)} - ${fmt(max)}`;
  if (min) return `From ${fmt(min)}`;
  return `Up to ${fmt(max!)}`;
}

export default function CareerPage() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
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
      <div className="text-center py-20">
        <h2 className="text-lg font-medium text-gray-900 mb-2">
          Page not found
        </h2>
        <p className="text-sm text-gray-500">
          The career page you're looking for doesn't exist.
        </p>
      </div>
    );
  }

  return (
    <div className="flex gap-8">
      {/* Left sidebar - Filters */}
      <aside className="w-64 shrink-0">
        <div className="sticky top-8 space-y-5">
          <div>
            <label className="text-sm font-medium text-gray-900 mb-1.5 block">
              Search
            </label>
            <Input
              placeholder="Job title..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="h-9 text-sm"
            />
          </div>

          {data && data.categories.length > 0 && (
            <div>
              <label className="text-sm font-medium text-gray-900 mb-1.5 block">
                Category
              </label>
              <Select
                value={filters.category || ""}
                onValueChange={(v) =>
                  setFilters((f) => ({
                    ...f,
                    category: v === "all" ? undefined : v,
                  }))
                }
              >
                <SelectTrigger className="h-9 text-sm">
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

          <div>
            <label className="text-sm font-medium text-gray-900 mb-1.5 block">
              Work Arrangement
            </label>
            <Select
              value={filters.work_arrangement || ""}
              onValueChange={(v) =>
                setFilters((f) => ({
                  ...f,
                  work_arrangement: v === "all" ? undefined : v,
                }))
              }
            >
              <SelectTrigger className="h-9 text-sm">
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

          <div>
            <label className="text-sm font-medium text-gray-900 mb-1.5 block">
              Employment Type
            </label>
            <Select
              value={filters.employment_type || ""}
              onValueChange={(v) =>
                setFilters((f) => ({
                  ...f,
                  employment_type: v === "all" ? undefined : v,
                }))
              }
            >
              <SelectTrigger className="h-9 text-sm">
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
            <button
              onClick={clearFilters}
              className="border border-gray-200 text-gray-700 rounded-md h-9 px-4 text-sm w-full"
            >
              Clear Filters
            </button>
          )}
        </div>
      </aside>

      {/* Main area - Job list */}
      <div className="flex-1 min-w-0">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-lg p-6 animate-pulse">
                <div className="h-4 bg-gray-100 rounded w-48 mb-3" />
                <div className="h-3 bg-gray-100 rounded w-32" />
              </div>
            ))}
          </div>
        ) : data && data.jobs.length > 0 ? (
          <>
            <p className="text-sm text-gray-500 mb-4">
              {data.total_count} open position{data.total_count !== 1 ? "s" : ""}
            </p>
            <div className="space-y-2">
              {data.jobs.map((job) => {
                const salary = formatSalary(job.salary_min, job.salary_max);
                return (
                  <Link key={job.slug} to={`/${orgSlug}/${job.slug}`}>
                    <div className="bg-white border border-gray-200 rounded-lg p-6 hover:border-gray-300 transition-colors cursor-pointer">
                      <h3 className="text-sm font-medium text-gray-900 mb-2">
                        {job.title}
                      </h3>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mb-3">
                        {job.location && <span>{job.location}</span>}
                        <span>
                          {EMPLOYMENT_TYPES[job.employment_type] || job.employment_type}
                        </span>
                        <span>{timeAgo(job.created_at)}</span>
                        {salary && (
                          <span className="text-gray-900 font-medium">{salary}</span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-xs">
                          {WORK_ARRANGEMENTS[job.work_arrangement] || job.work_arrangement}
                        </span>
                        {job.category && (
                          <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-xs">
                            {job.category}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </>
        ) : (
          <div className="text-center py-20">
            <h3 className="text-sm font-medium text-gray-900 mb-1">
              No open positions
            </h3>
            <p className="text-sm text-gray-500">
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
