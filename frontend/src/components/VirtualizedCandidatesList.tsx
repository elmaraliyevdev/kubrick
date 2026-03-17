import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { CandidateMatch } from "@/types/match";
import { Eye, Mail, MapPin, MessageSquare, User } from "lucide-react";
import { useMemo } from "react";
import { List as FixedSizeList } from "react-window";

import { MatchScoreCard } from "./MatchScoreCard";

interface VirtualizedCandidatesListProps {
  candidates: CandidateMatch[];
  onCandidateSelect?: (candidateId: number) => void;
  onViewDetails?: (candidateId: number) => void;
  height?: number;
  itemHeight?: number;
  className?: string;
}

interface CandidateRowProps {
  candidates: CandidateMatch[];
  onCandidateSelect?: (candidateId: number) => void;
  onViewDetails?: (candidateId: number) => void;
}

function CandidateItem(props: {
  index: number;
  style: React.CSSProperties;
  ariaAttributes: { "aria-posinset": number; "aria-setsize": number; role: "listitem" };
} & CandidateRowProps) {
  const { index, style, candidates, onCandidateSelect, onViewDetails } = props;
  const candidate = candidates[index];

  if (!candidate) {
    return <div style={style} />;
  }

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase();
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case "excellent":
        return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400";
      case "good":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400";
      case "poor":
        return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400";
    }
  };

  const formatExperience = (years: number | undefined) => {
    if (!years) return "No experience listed";
    return `${years} year${years !== 1 ? "s" : ""} experience`;
  };

  return (
    <div style={style} className="px-4">
      <Card className="hover:shadow-md transition-shadow mb-4">
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Candidate Info */}
            <div className="flex-1 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-blue-100 text-blue-600 dark:bg-blue-900/20">
                      {getInitials(candidate.candidate.first_name, candidate.candidate.last_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold">
                      {candidate.candidate.first_name} {candidate.candidate.last_name}
                    </h3>
                    <div className="flex items-center space-x-3 text-xs text-muted-foreground">
                      {candidate.candidate.email && (
                        <div className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {candidate.candidate.email}
                        </div>
                      )}
                      {candidate.candidate.location && (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {candidate.candidate.location}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <Badge className={getTierColor(candidate.match.tier)}>
                  {candidate.match.tier === "excellent" && "Excellent"}
                  {candidate.match.tier === "good" && "Good"}
                  {candidate.match.tier === "poor" && "Poor"}
                  {candidate.match.tier === "unscored" && "Unscored"}
                </Badge>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-muted-foreground">Experience:</span>
                  <p className="font-medium text-xs">
                    {formatExperience(candidate.candidate.experience_years)}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Skills:</span>
                  <p className="font-medium text-xs">{candidate.candidate.skills_count} skills</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Matched:</span>
                  <p className="font-medium text-green-600 text-xs">
                    {candidate.match.skills_summary.matched_count}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Missing:</span>
                  <p className="font-medium text-red-600 text-xs">
                    {candidate.match.skills_summary.missing_count}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-2">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Eye className="h-3 w-3 mr-1" />
                      Details
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>
                        Match Analysis: {candidate.candidate.first_name}{" "}
                        {candidate.candidate.last_name}
                      </DialogTitle>
                    </DialogHeader>
                    <MatchScoreCard match={candidate.match} showDetails={true} size="lg" />
                  </DialogContent>
                </Dialog>

                {onViewDetails && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onViewDetails(candidate.candidate.id)}
                  >
                    <User className="h-3 w-3 mr-1" />
                    Profile
                  </Button>
                )}

                {onCandidateSelect && (
                  <Button size="sm" onClick={() => onCandidateSelect(candidate.candidate.id)}>
                    <MessageSquare className="h-3 w-3 mr-1" />
                    Contact
                  </Button>
                )}
              </div>
            </div>

            {/* Match Score - Compact version for virtualized list */}
            <div className="lg:w-48">
              <div className="text-center p-3 border rounded-lg">
                <div className="text-2xl font-bold text-blue-600 mb-1">
                  {candidate.match.overall_score.toFixed(1)}
                  <span className="text-sm text-muted-foreground">/100</span>
                </div>
                <div className="text-xs text-muted-foreground mb-2">Match Score</div>
                <div className="flex justify-between text-xs">
                  <div className="text-center">
                    <div className="font-medium text-green-600">
                      {candidate.match.skills_summary.matched_count}
                    </div>
                    <div className="text-muted-foreground">Match</div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium text-red-600">
                      {candidate.match.skills_summary.missing_count}
                    </div>
                    <div className="text-muted-foreground">Miss</div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium text-purple-600">
                      {candidate.match.skills_summary.extra_count}
                    </div>
                    <div className="text-muted-foreground">Extra</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function VirtualizedCandidatesList({
  candidates,
  onCandidateSelect,
  onViewDetails,
  height = 600,
  itemHeight = 200,
  className = "",
}: VirtualizedCandidatesListProps) {
  const rowProps = useMemo(
    () => ({
      candidates,
      onCandidateSelect,
      onViewDetails,
    }),
    [candidates, onCandidateSelect, onViewDetails]
  );

  if (candidates.length === 0) {
    return (
      <div className={`flex items-center justify-center ${className}`} style={{ height }}>
        <div className="text-center">
          <User className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">No candidates to display</h3>
          <p className="text-muted-foreground">Try adjusting your filters or search criteria.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="mb-4">
        <p className="text-sm text-muted-foreground">Showing {candidates.length} candidates</p>
      </div>

      <FixedSizeList
        style={{ height }}
        rowCount={candidates.length}
        rowHeight={itemHeight}
        rowProps={rowProps}
        className="scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
        overscanCount={5}
        rowComponent={CandidateItem}
      />
    </div>
  );
}
