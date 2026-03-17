import { QueryClient, type QueryKey } from '@tanstack/react-query';
import { ApiErrorHandler } from '@/utils/apiErrorHandler';

// Default stale times for different data types
const STALE_TIMES = {
  // Static data that rarely changes
  ORGANIZATIONS: 10 * 60 * 1000, // 10 minutes
  JOBS: 5 * 60 * 1000, // 5 minutes
  CANDIDATES: 3 * 60 * 1000, // 3 minutes
  
  // Dynamic data that changes more frequently
  MATCHES: 2 * 60 * 1000, // 2 minutes
  STATISTICS: 1 * 60 * 1000, // 1 minute
  
  // Real-time data
  NOTIFICATIONS: 30 * 1000, // 30 seconds
} as const;

// Cache times (how long to keep unused data in memory)
const CACHE_TIMES = {
  LONG: 30 * 60 * 1000, // 30 minutes
  MEDIUM: 15 * 60 * 1000, // 15 minutes  
  SHORT: 5 * 60 * 1000, // 5 minutes
} as const;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Global defaults
      staleTime: STALE_TIMES.CANDIDATES, // Default 3 minutes
      gcTime: CACHE_TIMES.MEDIUM, // Default 15 minutes
      retry: (failureCount, error: any) => {
        const apiError = ApiErrorHandler.handleError(error);
        
        // Don't retry on client errors (4xx)
        if (apiError.status && apiError.status >= 400 && apiError.status < 500) {
          return false;
        }
        
        // Retry up to 3 times for server errors and network issues
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      
      // Global error handler
      throwOnError: false, // Let components handle errors individually
    },
    mutations: {
      retry: (failureCount, error: any) => {
        const apiError = ApiErrorHandler.handleError(error);
        
        // Only retry network errors and 5xx errors for mutations
        if (!apiError.status || (apiError.status >= 500)) {
          return failureCount < 2; // Max 2 retries for mutations
        }
        
        return false;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    },
  },
});

// Query key factories for consistent caching
export const queryKeys = {
  // Organizations
  organizations: {
    all: ['organizations'] as const,
    list: (filters?: any) => [...queryKeys.organizations.all, 'list', filters] as const,
    detail: (id: number) => [...queryKeys.organizations.all, 'detail', id] as const,
  },
  
  // Jobs
  jobs: {
    all: ['jobs'] as const,
    list: (filters?: any) => [...queryKeys.jobs.all, 'list', filters] as const,
    detail: (id: number) => [...queryKeys.jobs.all, 'detail', id] as const,
    requirements: (id: number) => [...queryKeys.jobs.all, 'requirements', id] as const,
  },
  
  // Candidates  
  candidates: {
    all: ['candidates'] as const,
    list: (filters?: any) => [...queryKeys.candidates.all, 'list', filters] as const,
    detail: (id: number) => [...queryKeys.candidates.all, 'detail', id] as const,
  },
  
  // Matches
  matches: {
    all: ['matches'] as const,
    jobRankedCandidates: (jobId: number, options?: any) => [
      ...queryKeys.matches.all, 
      'job-ranked-candidates', 
      jobId, 
      options
    ] as const,
    candidateJobMatches: (candidateId: number, limit?: number) => [
      ...queryKeys.matches.all,
      'candidate-job-matches',
      candidateId,
      limit
    ] as const,
    detailedAnalysis: (candidateId: number, jobId: number) => [
      ...queryKeys.matches.all,
      'detailed-analysis',
      candidateId,
      jobId
    ] as const,
    skillsGap: (candidateId: number, jobId: number) => [
      ...queryKeys.matches.all,
      'skills-gap',
      candidateId,
      jobId
    ] as const,
    statistics: (organizationId: number) => [
      ...queryKeys.matches.all,
      'statistics',
      organizationId
    ] as const,
  },
};

// Cache invalidation helpers
export const invalidateQueries = {
  // Invalidate all job-related data
  invalidateJobData: (jobId: number) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.jobs.detail(jobId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.jobs.requirements(jobId) });
    queryClient.invalidateQueries({ 
      queryKey: queryKeys.matches.jobRankedCandidates(jobId),
      exact: false // Match all variations with different options
    });
  },
  
  // Invalidate all candidate-related data
  invalidateCandidateData: (candidateId: number) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.candidates.detail(candidateId) });
    queryClient.invalidateQueries({ 
      queryKey: queryKeys.matches.candidateJobMatches(candidateId),
      exact: false
    });
  },
  
  // Invalidate match data between specific candidate and job
  invalidateMatchData: (candidateId: number, jobId: number) => {
    queryClient.invalidateQueries({ 
      queryKey: queryKeys.matches.detailedAnalysis(candidateId, jobId) 
    });
    queryClient.invalidateQueries({ 
      queryKey: queryKeys.matches.skillsGap(candidateId, jobId) 
    });
    // Also invalidate the broader lists
    queryClient.invalidateQueries({ 
      queryKey: queryKeys.matches.jobRankedCandidates(jobId),
      exact: false
    });
    queryClient.invalidateQueries({ 
      queryKey: queryKeys.matches.candidateJobMatches(candidateId),
      exact: false
    });
  },
  
  // Invalidate all matches for an organization
  invalidateAllMatches: (organizationId?: number) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.matches.all });
    if (organizationId) {
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.matches.statistics(organizationId) 
      });
    }
  },
};

// Prefetching helpers for better UX
export const prefetchQueries = {
  // Prefetch job details when hovering over job cards
  prefetchJobDetail: (jobId: number) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.jobs.detail(jobId),
      staleTime: STALE_TIMES.JOBS,
    });
  },
  
  // Prefetch candidate details when hovering over candidate cards
  prefetchCandidateDetail: (candidateId: number) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.candidates.detail(candidateId),
      staleTime: STALE_TIMES.CANDIDATES,
    });
  },
  
  // Prefetch match data when navigating to detailed views
  prefetchMatchData: (candidateId: number, jobId: number) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.matches.detailedAnalysis(candidateId, jobId),
      staleTime: STALE_TIMES.MATCHES,
    });
    queryClient.prefetchQuery({
      queryKey: queryKeys.matches.skillsGap(candidateId, jobId),
      staleTime: STALE_TIMES.MATCHES,
    });
  },
};

// Performance monitoring
export const performanceHelpers = {
  // Log slow queries for optimization
  logSlowQuery: (queryKey: QueryKey, duration: number, threshold: number = 2000) => {
    if (duration > threshold) {
      console.warn(`Slow query detected:`, {
        queryKey,
        duration: `${duration}ms`,
        threshold: `${threshold}ms`,
      });
    }
  },
  
  // Get cache statistics
  getCacheStats: () => {
    const cache = queryClient.getQueryCache();
    const queries = cache.getAll();
    
    return {
      totalQueries: queries.length,
      staleQueries: queries.filter(q => q.isStale()).length,
      fetchingQueries: queries.filter(q => q.state.fetchStatus === 'fetching').length,
      cacheSize: JSON.stringify(cache).length, // Rough estimate
    };
  },
};

export default queryClient;