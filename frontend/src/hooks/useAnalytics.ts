import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/utils/api';
import type { DashboardAnalytics, DashboardMetrics, QuickStats } from '@/types/analytics';
import type { MatchingStatistics } from '@/types/match';
import type { CandidateListItem } from '@/types/candidate';
import type { Job } from '@/types/job';

// Get dashboard analytics with overview metrics
export const useDashboardAnalytics = () => {
  return useQuery({
    queryKey: ['dashboard', 'analytics'],
    queryFn: async (): Promise<DashboardAnalytics> => {
      // Since there's no dedicated analytics endpoint, we'll compose it from existing APIs
      const [candidatesRes, jobsRes] = await Promise.all([
        api.get('/candidates/?limit=1000'), // Get all candidates for metrics
        api.get('/jobs/'), // Get all jobs
      ]);

      const candidates: CandidateListItem[] = candidatesRes.data;
      const jobs: Job[] = jobsRes.data;

      // Calculate metrics from available data
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      // Count recent candidates
      const recentCandidates = candidates.filter(c => 
        new Date(c.created_at) >= thirtyDaysAgo
      );

      const candidatesLast7Days = candidates.filter(c => 
        new Date(c.created_at) >= sevenDaysAgo
      );

      // Calculate average experience
      const candidatesWithExp = candidates.filter(c => c.experience_years && c.experience_years > 0);
      const avgExperience = candidatesWithExp.length > 0 
        ? candidatesWithExp.reduce((sum, c) => sum + (c.experience_years || 0), 0) / candidatesWithExp.length
        : 0;

      // Extract top skills
      const skillCounts = new Map<string, number>();
      candidates.forEach(candidate => {
        candidate.skills?.forEach(skill => {
          skillCounts.set(skill, (skillCounts.get(skill) || 0) + 1);
        });
      });

      const topSkills = Array.from(skillCounts.entries())
        .map(([skill, count]) => ({ skill, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Count job statuses
      const activeJobs = jobs.filter(j => j.status === 'open').length;
      const draftJobs = jobs.filter(j => j.status === 'draft').length;
      const closedJobs = jobs.filter(j => j.status === 'closed').length;

      // Calculate application metrics
      const totalApplications = candidates.reduce((sum, c) => sum + (c.job_applications_count || 0), 0);
      const avgApplicationsPerJob = jobs.length > 0 ? totalApplications / jobs.length : 0;

      // Mock matching data (would come from actual matching API)
      const totalMatches = Math.floor(candidates.length * jobs.length * 0.3); // Assume 30% have matches
      const excellentMatches = Math.floor(totalMatches * 0.15);
      const goodMatches = Math.floor(totalMatches * 0.35);
      const poorMatches = totalMatches - excellentMatches - goodMatches;

      const metrics: DashboardMetrics = {
        overview: {
          total_candidates: candidates.length,
          total_jobs: jobs.length,
          total_matches: totalMatches,
          active_applications: totalApplications,
        },
        candidate_metrics: {
          recent_candidates_count: recentCandidates.length,
          candidates_with_resumes: candidates.filter(c => (c as any).resume_files_count > 0).length,
          average_experience_years: Number(avgExperience.toFixed(1)),
          top_skills: topSkills.slice(0, 5),
        },
        job_metrics: {
          active_jobs: activeJobs,
          draft_jobs: draftJobs,
          closed_jobs: closedJobs,
          average_applications_per_job: Number(avgApplicationsPerJob.toFixed(1)),
        },
        matching_metrics: {
          total_matches: totalMatches,
          excellent_matches: excellentMatches,
          good_matches: goodMatches,
          poor_matches: poorMatches,
          average_match_score: 67.5, // Mock average
          matches_needing_recalculation: Math.floor(totalMatches * 0.1),
        },
        recent_activity: {
          candidates_added_last_7_days: candidatesLast7Days.length,
          jobs_created_last_7_days: 0, // Would need to check job creation dates
          matches_calculated_last_7_days: Math.floor(totalMatches * 0.2),
        },
        quality_distribution: {
          excellent: excellentMatches,
          good: goodMatches,
          poor: poorMatches,
          unscored: Math.floor(candidates.length * 0.1),
        },
      };

      return {
        metrics,
        trends: [], // Mock trends data
        skill_insights: topSkills.map(skill => ({
          skill: skill.skill,
          candidate_count: skill.count,
          job_demand_count: Math.floor(Math.random() * 5) + 1,
          average_match_score: Math.floor(Math.random() * 30) + 60,
          growth_trend: Math.floor(Math.random() * 40) - 20,
        })).slice(0, 5),
        last_updated: new Date().toISOString(),
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};

// Get quick stats for overview cards
export const useQuickStats = () => {
  return useQuery({
    queryKey: ['dashboard', 'quick-stats'],
    queryFn: async (): Promise<QuickStats> => {
      const [candidatesRes, jobsRes] = await Promise.all([
        api.get('/candidates/?limit=1000'),
        api.get('/jobs/'),
      ]);

      const candidates: CandidateListItem[] = candidatesRes.data;
      const jobs: Job[] = jobsRes.data;

      const pendingApplications = candidates.reduce((sum, c) => {
        return sum + ((c.latest_application_status as string) === 'pending' ? 1 : 0);
      }, 0);

      // Mock match success rate (would come from real matching data)
      const mockMatchSuccessRate = 73.5;

      return {
        total_candidates: candidates.length,
        total_jobs: jobs.length,
        pending_applications: pendingApplications,
        match_success_rate: mockMatchSuccessRate,
      };
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

// Get matching statistics (uses existing API)
export const useMatchingStatistics = (organizationId: number) => {
  return useQuery({
    queryKey: ['matches', 'statistics', organizationId],
    queryFn: async (): Promise<MatchingStatistics> => {
      const response = await api.get(`/matches/statistics/${organizationId}`);
      return response.data;
    },
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000,
  });
};

// Refresh all analytics data
export const useRefreshAnalytics = () => {
  const queryClient = useQueryClient();
  
  return {
    refreshAll: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['matches', 'statistics'] });
      queryClient.invalidateQueries({ queryKey: ['candidates'] });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    },
    refreshDashboard: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  };
};

// Get recent candidates for activity feed
export const useRecentCandidates = (limit: number = 5) => {
  return useQuery({
    queryKey: ['dashboard', 'recent-candidates', limit],
    queryFn: async (): Promise<CandidateListItem[]> => {
      const response = await api.get(`/candidates/?limit=${limit * 2}`);
      const candidates: CandidateListItem[] = response.data;
      
      // Sort by creation date and take the most recent
      return candidates
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, limit);
    },
    staleTime: 2 * 60 * 1000,
  });
};