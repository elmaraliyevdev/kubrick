import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CandidateMatch } from "@/types/match";
import { useState } from "react";
import { MatchScoreCard } from "./MatchScoreCard";

interface RankedCandidatesListProps {
  candidates: CandidateMatch[];
  isLoading?: boolean;
  onLoadMore?: () => void;
  hasMore?: boolean;
  onCandidateSelect?: (candidateId: number) => void;
  onViewDetails?: (candidateId: number) => void;
  showFilters?: boolean;
  className?: string;
}

export function RankedCandidatesList({
  candidates,
  isLoading = false,
  onLoadMore,
  hasMore = false,
  onCandidateSelect,
  onViewDetails,
  showFilters = true,
  className = "",
}: RankedCandidatesListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTier, setSelectedTier] = useState<string>("all");
  const [minScore, setMinScore] = useState<string>("");
  const [sortBy, setSortBy] = useState<string>("score");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateMatch | null>(null);

  // Filter candidates based on current filters
  const filteredCandidates = candidates
    .filter((candidate) => {
      // Search filter
      const searchLower = searchTerm.toLowerCase();
      const nameMatch = `${candidate.candidate.first_name} ${candidate.candidate.last_name}`
        .toLowerCase()
        .includes(searchLower);
      const emailMatch = candidate.candidate.email?.toLowerCase().includes(searchLower) || false;

      if (searchTerm && !nameMatch && !emailMatch) return false;

      // Tier filter
      if (selectedTier !== "all" && candidate.match.tier !== selectedTier) return false;

      // Min score filter
      if (minScore && candidate.match.overall_score < parseFloat(minScore)) return false;

      return true;
    })
    .sort((a, b) => {
      let valueA: number | string | Date;
      let valueB: number | string | Date;

      switch (sortBy) {
        case "score":
          valueA = a.match.overall_score;
          valueB = b.match.overall_score;
          break;
        case "name":
          valueA = `${a.candidate.first_name} ${a.candidate.last_name}`;
          valueB = `${b.candidate.first_name} ${b.candidate.last_name}`;
          break;
        case "experience":
          valueA = a.candidate.experience_years || 0;
          valueB = b.candidate.experience_years || 0;
          break;
        case "date":
          valueA = new Date(a.calculated_at || 0);
          valueB = new Date(b.calculated_at || 0);
          break;
        default:
          valueA = a.match.overall_score;
          valueB = b.match.overall_score;
      }

      if (sortOrder === "asc") {
        return valueA > valueB ? 1 : -1;
      } else {
        return valueA < valueB ? 1 : -1;
      }
    });

  const formatExperience = (years: number | undefined) => {
    if (!years) return "No experience listed";
    return `${years} year${years !== 1 ? "s" : ""} experience`;
  };

  if (isLoading && candidates.length === 0) {
    return (
      <div className={`space-y-4 ${className}`}>
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="bg-white border border-gray-200 rounded-lg p-6 animate-pulse">
            <div className="h-4 bg-gray-100 rounded w-48 mb-2" />
            <div className="h-4 bg-gray-100 rounded w-32" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Filters */}
      {showFilters && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-sm font-medium text-gray-900 mb-4">Filter & Sort</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <Input
              placeholder="Search candidates..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />

            <Select value={selectedTier} onValueChange={setSelectedTier}>
              <SelectTrigger>
                <SelectValue placeholder="All tiers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tiers</SelectItem>
                <SelectItem value="excellent">Excellent</SelectItem>
                <SelectItem value="good">Good</SelectItem>
                <SelectItem value="poor">Poor</SelectItem>
              </SelectContent>
            </Select>

            <Input
              placeholder="Min score (0-100)"
              value={minScore}
              onChange={(e) => setMinScore(e.target.value)}
              type="number"
              min="0"
              max="100"
            />

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="score">Match Score</SelectItem>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="experience">Experience</SelectItem>
                <SelectItem value="date">Date Calculated</SelectItem>
              </SelectContent>
            </Select>

            <button
              onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
              className="border border-gray-200 text-gray-700 rounded-md h-9 px-4 text-sm"
            >
              {sortOrder === "asc" ? "Ascending" : "Descending"}
            </button>
          </div>
        </div>
      )}

      {/* Results Summary */}
      <p className="text-sm text-gray-500">
        Showing {filteredCandidates.length} of {candidates.length} candidates
        {searchTerm && ` matching "${searchTerm}"`}
      </p>

      {/* Candidates List */}
      <div className="space-y-1">
        {filteredCandidates.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-lg p-6 text-center">
            <h3 className="text-sm font-medium text-gray-900">No candidates found</h3>
            <p className="text-sm text-gray-500 mt-1">
              {searchTerm || selectedTier !== "all" || minScore
                ? "Try adjusting your filters to see more results."
                : "No candidates have been matched against this job yet."}
            </p>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-100">
            {filteredCandidates.map((candidate, index) => (
              <div key={candidate.candidate.id} className="flex items-center gap-6 px-6 py-4">
                {/* Rank */}
                <span className="text-sm text-gray-400 w-6 text-right">{index + 1}</span>

                {/* Name & Email */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">
                    {candidate.candidate.first_name} {candidate.candidate.last_name}
                  </p>
                  {candidate.candidate.email && (
                    <p className="text-sm text-gray-500">{candidate.candidate.email}</p>
                  )}
                </div>

                {/* Experience */}
                <span className="text-sm text-gray-500 hidden lg:block">
                  {formatExperience(candidate.candidate.experience_years)}
                </span>

                {/* Skills info */}
                <span className="text-sm text-gray-500 hidden md:block">
                  {candidate.match.skills_summary.matched_count} matched, {candidate.match.skills_summary.missing_count} missing
                </span>

                {/* Tier */}
                <span className="text-xs text-gray-500 capitalize hidden sm:block">
                  {candidate.match.tier}
                </span>

                {/* Score */}
                <span className="text-sm font-medium text-green-600 w-12 text-right">
                  {candidate.match.overall_score.toFixed(1)}
                </span>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <button
                        onClick={() => setSelectedCandidate(candidate)}
                        className="border border-gray-200 text-gray-700 rounded-md h-9 px-4 text-sm"
                      >
                        Details
                      </button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>
                          Match Analysis: {selectedCandidate?.candidate.first_name}{" "}
                          {selectedCandidate?.candidate.last_name}
                        </DialogTitle>
                      </DialogHeader>
                      {selectedCandidate && (
                        <MatchScoreCard
                          match={selectedCandidate.match}
                          showDetails={true}
                          size="lg"
                        />
                      )}
                    </DialogContent>
                  </Dialog>

                  {onViewDetails && (
                    <button
                      onClick={() => onViewDetails(candidate.candidate.id)}
                      className="border border-gray-200 text-gray-700 rounded-md h-9 px-4 text-sm"
                    >
                      Profile
                    </button>
                  )}

                  {onCandidateSelect && (
                    <button
                      onClick={() => onCandidateSelect(candidate.candidate.id)}
                      className="bg-gray-900 text-white rounded-md h-9 px-4 text-sm"
                    >
                      Contact
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Load More Button */}
        {hasMore && !isLoading && (
          <div className="text-center pt-4">
            <button
              onClick={onLoadMore}
              className="border border-gray-200 text-gray-700 rounded-md h-9 px-4 text-sm"
            >
              Load More Candidates
            </button>
          </div>
        )}

        {/* Loading More */}
        {isLoading && candidates.length > 0 && (
          <div className="text-center py-4">
            <p className="text-sm text-gray-500">Loading...</p>
          </div>
        )}
      </div>
    </div>
  );
}
