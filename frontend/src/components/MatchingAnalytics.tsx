import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { CandidateMatch } from "@/types/match";
import { Activity, Award, BarChart3, PieChart, Target, TrendingUp, Users, Zap } from "lucide-react";
import { useMemo } from "react";

interface MatchingAnalyticsProps {
  candidates: CandidateMatch[];
  className?: string;
}

interface AnalyticsData {
  totalCandidates: number;
  averageScore: number;
  scoreDistribution: {
    excellent: number;
    good: number;
    poor: number;
    unscored: number;
  };
  skillsAnalysis: {
    topSkills: { skill: string; count: number; percentage: number }[];
    averageSkillsMatched: number;
    averageSkillsMissing: number;
  };
  experienceAnalysis: {
    averageExperience: number;
    experienceRanges: { range: string; count: number; percentage: number }[];
  };
  matchingTrends: {
    scoreRanges: { range: string; count: number; percentage: number }[];
    improvementPotential: number;
  };
}

export function MatchingAnalytics({ candidates, className = "" }: MatchingAnalyticsProps) {
  const analytics = useMemo((): AnalyticsData => {
    if (candidates.length === 0) {
      return {
        totalCandidates: 0,
        averageScore: 0,
        scoreDistribution: { excellent: 0, good: 0, poor: 0, unscored: 0 },
        skillsAnalysis: { topSkills: [], averageSkillsMatched: 0, averageSkillsMissing: 0 },
        experienceAnalysis: { averageExperience: 0, experienceRanges: [] },
        matchingTrends: { scoreRanges: [], improvementPotential: 0 },
      };
    }

    const totalCandidates = candidates.length;
    const averageScore =
      candidates.reduce((sum, c) => sum + c.match.overall_score, 0) / totalCandidates;

    // Score distribution
    const scoreDistribution = {
      excellent: candidates.filter((c) => c.match.tier === "excellent").length,
      good: candidates.filter((c) => c.match.tier === "good").length,
      poor: candidates.filter((c) => c.match.tier === "poor").length,
      unscored: candidates.filter((c) => c.match.tier === "unscored").length,
    };

    // Skills analysis
    const skillsMatched = candidates.map((c) => c.match.skills_summary.matched_count);
    const skillsMissing = candidates.map((c) => c.match.skills_summary.missing_count);
    const averageSkillsMatched =
      skillsMatched.reduce((sum, count) => sum + count, 0) / totalCandidates;
    const averageSkillsMissing =
      skillsMissing.reduce((sum, count) => sum + count, 0) / totalCandidates;

    // Mock top skills data (would come from actual skills matching)
    const topSkills = [
      { skill: "JavaScript", count: Math.floor(totalCandidates * 0.7), percentage: 70 },
      { skill: "React", count: Math.floor(totalCandidates * 0.6), percentage: 60 },
      { skill: "Node.js", count: Math.floor(totalCandidates * 0.5), percentage: 50 },
      { skill: "Python", count: Math.floor(totalCandidates * 0.4), percentage: 40 },
      { skill: "SQL", count: Math.floor(totalCandidates * 0.3), percentage: 30 },
    ].slice(0, 5);

    // Experience analysis
    const experienceValues = candidates
      .map((c) => c.candidate.experience_years || 0)
      .filter((exp) => exp > 0);
    const averageExperience =
      experienceValues.length > 0
        ? experienceValues.reduce((sum, exp) => sum + exp, 0) / experienceValues.length
        : 0;

    const experienceRanges = [
      { range: "0-2 years", count: 0, percentage: 0 },
      { range: "3-5 years", count: 0, percentage: 0 },
      { range: "6-10 years", count: 0, percentage: 0 },
      { range: "10+ years", count: 0, percentage: 0 },
    ];

    candidates.forEach((c) => {
      const exp = c.candidate.experience_years || 0;
      if (exp <= 2) experienceRanges[0].count++;
      else if (exp <= 5) experienceRanges[1].count++;
      else if (exp <= 10) experienceRanges[2].count++;
      else experienceRanges[3].count++;
    });

    experienceRanges.forEach((range) => {
      range.percentage = Math.round((range.count / totalCandidates) * 100);
    });

    // Score ranges for trend analysis
    const scoreRanges = [
      { range: "90-100", count: 0, percentage: 0 },
      { range: "80-89", count: 0, percentage: 0 },
      { range: "70-79", count: 0, percentage: 0 },
      { range: "60-69", count: 0, percentage: 0 },
      { range: "50-59", count: 0, percentage: 0 },
      { range: "0-49", count: 0, percentage: 0 },
    ];

    candidates.forEach((c) => {
      const score = c.match.overall_score;
      if (score >= 90) scoreRanges[0].count++;
      else if (score >= 80) scoreRanges[1].count++;
      else if (score >= 70) scoreRanges[2].count++;
      else if (score >= 60) scoreRanges[3].count++;
      else if (score >= 50) scoreRanges[4].count++;
      else scoreRanges[5].count++;
    });

    scoreRanges.forEach((range) => {
      range.percentage = Math.round((range.count / totalCandidates) * 100);
    });

    const improvementPotential = Math.round(100 - averageScore);

    return {
      totalCandidates,
      averageScore,
      scoreDistribution,
      skillsAnalysis: { topSkills, averageSkillsMatched, averageSkillsMissing },
      experienceAnalysis: { averageExperience, experienceRanges },
      matchingTrends: { scoreRanges, improvementPotential },
    };
  }, [candidates]);

  if (candidates.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="p-8 text-center">
          <BarChart3 className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Analytics Data</h3>
          <p className="text-muted-foreground">
            Analytics will appear once you have candidates with match scores.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Total Candidates</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalCandidates}</div>
            <p className="text-xs text-muted-foreground">with match scores</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Average Score</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics.averageScore.toFixed(1)}
              <span className="text-lg text-muted-foreground">/100</span>
            </div>
            <Progress value={analytics.averageScore} className="h-2 mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Top Matches</CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {analytics.scoreDistribution.excellent}
            </div>
            <p className="text-xs text-muted-foreground">excellent matches (80+)</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Potential</CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {analytics.matchingTrends.improvementPotential}%
            </div>
            <p className="text-xs text-muted-foreground">room for improvement</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Match Quality Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Match Quality Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-sm">Excellent (80-100)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">
                    {analytics.scoreDistribution.excellent}
                  </span>
                  <Badge variant="secondary" className="text-xs">
                    {Math.round(
                      (analytics.scoreDistribution.excellent / analytics.totalCandidates) * 100
                    )}
                    %
                  </Badge>
                </div>
              </div>
              <Progress
                value={(analytics.scoreDistribution.excellent / analytics.totalCandidates) * 100}
                className="h-2"
              />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <span className="text-sm">Good (60-79)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{analytics.scoreDistribution.good}</span>
                  <Badge variant="secondary" className="text-xs">
                    {Math.round(
                      (analytics.scoreDistribution.good / analytics.totalCandidates) * 100
                    )}
                    %
                  </Badge>
                </div>
              </div>
              <Progress
                value={(analytics.scoreDistribution.good / analytics.totalCandidates) * 100}
                className="h-2"
              />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span className="text-sm">Poor (0-59)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{analytics.scoreDistribution.poor}</span>
                  <Badge variant="secondary" className="text-xs">
                    {Math.round(
                      (analytics.scoreDistribution.poor / analytics.totalCandidates) * 100
                    )}
                    %
                  </Badge>
                </div>
              </div>
              <Progress
                value={(analytics.scoreDistribution.poor / analytics.totalCandidates) * 100}
                className="h-2"
              />
            </div>
          </CardContent>
        </Card>

        {/* Skills Analysis */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Skills Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {analytics.skillsAnalysis.averageSkillsMatched.toFixed(1)}
                </div>
                <div className="text-xs text-muted-foreground">Avg Skills Matched</div>
              </div>
              <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <div className="text-2xl font-bold text-red-600">
                  {analytics.skillsAnalysis.averageSkillsMissing.toFixed(1)}
                </div>
                <div className="text-xs text-muted-foreground">Avg Skills Missing</div>
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-3">Most Common Skills</h4>
              <div className="space-y-2">
                {analytics.skillsAnalysis.topSkills.map((skill) => (
                  <div key={skill.skill} className="flex items-center justify-between">
                    <span className="text-sm">{skill.skill}</span>
                    <div className="flex items-center gap-2">
                      <Progress value={skill.percentage} className="w-20 h-2" />
                      <span className="text-xs text-muted-foreground w-8">{skill.percentage}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Experience Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Experience Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {analytics.experienceAnalysis.averageExperience.toFixed(1)}
              </div>
              <div className="text-xs text-muted-foreground">Average Years Experience</div>
            </div>

            <div className="space-y-3">
              {analytics.experienceAnalysis.experienceRanges.map((range) => (
                <div key={range.range} className="flex items-center justify-between">
                  <span className="text-sm">{range.range}</span>
                  <div className="flex items-center gap-2">
                    <Progress value={range.percentage} className="w-20 h-2" />
                    <span className="text-xs text-muted-foreground w-8">{range.percentage}%</span>
                    <Badge variant="outline" className="text-xs">
                      {range.count}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Score Distribution Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Score Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.matchingTrends.scoreRanges.map((range) => (
                <div key={range.range} className="flex items-center justify-between">
                  <span className="text-sm">{range.range}%</span>
                  <div className="flex items-center gap-2">
                    <Progress value={range.percentage} className="w-20 h-2" />
                    <span className="text-xs text-muted-foreground w-8">{range.percentage}%</span>
                    <Badge variant="outline" className="text-xs">
                      {range.count}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
