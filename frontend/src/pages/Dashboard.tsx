import { MatchingAnalytics } from "@/components/MatchingAnalytics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboardAnalytics, useQuickStats, useRecentCandidates } from "@/hooks/useAnalytics";
import { useAuth } from "@/hooks/useAuth";
import type { CandidateMatch } from "@/types/match";
import {
  Activity,
  Briefcase,
  Clock,
  FileText,
  Target,
  Users,
  UserCheck,
  Calendar
} from "lucide-react";
import { useMemo } from "react";

export default function Dashboard() {
  const { user } = useAuth();
  const { data: analytics, isLoading: analyticsLoading } = useDashboardAnalytics();
  const { data: quickStats, isLoading: statsLoading } = useQuickStats();
  const { data: recentCandidates, isLoading: candidatesLoading } = useRecentCandidates(5);

  // Convert recent candidates to CandidateMatch format for MatchingAnalytics
  const mockCandidateMatches: CandidateMatch[] = useMemo(() => {
    if (!recentCandidates) return [];
    
    return recentCandidates.map(candidate => ({
      candidate: {
        id: candidate.id,
        first_name: candidate.first_name || 'Unknown',
        last_name: candidate.last_name || '',
        email: candidate.email || '',
        location: candidate.location,
        experience_years: candidate.experience_years,
        skills_count: candidate.skills?.length || 0,
      },
      match: {
        overall_score: Math.floor(Math.random() * 40) + 60, // Mock scores 60-100
        tier: Math.random() > 0.7 ? 'excellent' : Math.random() > 0.4 ? 'good' : 'poor',
        breakdown: {
          overall: Math.floor(Math.random() * 40) + 60,
          skills: Math.floor(Math.random() * 40) + 60,
          experience: Math.floor(Math.random() * 40) + 60,
          education: Math.floor(Math.random() * 40) + 60,
          additional: Math.floor(Math.random() * 40) + 60,
        },
        skills_summary: {
          matched: candidate.skills?.slice(0, 3) || [],
          missing: ['React', 'Node.js'],
          extra: candidate.skills?.slice(3) || [],
          matched_count: Math.min(candidate.skills?.length || 0, 5),
          missing_count: Math.floor(Math.random() * 3),
          extra_count: Math.max(0, (candidate.skills?.length || 0) - 5),
        },
        calculated_at: candidate.created_at,
        needs_recalculation: false,
      },
      calculated_at: candidate.created_at,
    }));
  }, [recentCandidates]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  if (analyticsLoading || statsLoading) {
    return (
      <div className="space-y-6">
        {/* Loading skeleton for overview cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-20" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-2 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
        
        {/* Loading skeleton for main content */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  const metrics = analytics?.metrics;
  const stats = quickStats;

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome back, {user?.first_name || 'User'}!
        </h1>
        <p className="text-muted-foreground mt-2">
          Here's what's happening with your talent pipeline today.
        </p>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Candidates</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_candidates || 0}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">+{metrics?.recent_activity.candidates_added_last_7_days || 0}</span> this week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Jobs</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.job_metrics.active_jobs || 0}</div>
            <p className="text-xs text-muted-foreground">
              {metrics?.job_metrics.draft_jobs || 0} drafts, {metrics?.job_metrics.closed_jobs || 0} closed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Match Success Rate</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.match_success_rate?.toFixed(1) || 0}%</div>
            <Progress value={stats?.match_success_rate || 0} className="h-2 mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Applications</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {stats?.pending_applications || 0}
            </div>
            <p className="text-xs text-muted-foreground">Require review</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Activity Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Activity Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Quick Metrics */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">Candidates with Resumes</div>
                <div className="text-2xl font-bold text-blue-600">
                  {metrics?.candidate_metrics.candidates_with_resumes || 0}
                </div>
                <Progress 
                  value={((metrics?.candidate_metrics.candidates_with_resumes || 0) / (stats?.total_candidates || 1)) * 100}
                  className="h-2" 
                />
              </div>
              
              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">Avg Experience</div>
                <div className="text-2xl font-bold text-green-600">
                  {metrics?.candidate_metrics.average_experience_years || 0}
                  <span className="text-sm text-muted-foreground ml-1">years</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  Across all candidates
                </div>
              </div>
            </div>

            {/* Top Skills */}
            <div>
              <h4 className="font-medium mb-3">Top Skills in Pipeline</h4>
              <div className="space-y-2">
                {metrics?.candidate_metrics.top_skills.slice(0, 5).map((skill) => (
                  <div key={skill.skill} className="flex items-center justify-between">
                    <span className="text-sm">{skill.skill}</span>
                    <div className="flex items-center gap-2">
                      <Progress 
                        value={(skill.count / (stats?.total_candidates || 1)) * 100} 
                        className="w-16 h-2" 
                      />
                      <span className="text-xs text-muted-foreground w-8">{skill.count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Candidates */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5" />
              Recent Candidates
            </CardTitle>
          </CardHeader>
          <CardContent>
            {candidatesLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-1 flex-1">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <Skeleton className="h-3 w-16" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {recentCandidates?.map((candidate) => (
                  <div key={candidate.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                        <Users className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          {candidate.first_name} {candidate.last_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {candidate.email}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(candidate.created_at)}
                      </div>
                      {candidate.experience_years && (
                        <div className="text-xs text-muted-foreground">
                          {candidate.experience_years}y exp
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                
                {(!recentCandidates || recentCandidates.length === 0) && (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">No candidates added yet</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Matching Analytics Section */}
      <div>
        <div className="mb-4">
          <h2 className="text-2xl font-bold tracking-tight">Matching Analytics</h2>
          <p className="text-muted-foreground">
            Insights into candidate-job matching performance
          </p>
        </div>
        
        <MatchingAnalytics 
          candidates={mockCandidateMatches}
          className="w-full"
        />
      </div>
    </div>
  );
}
