import type {
  CandidateJobMatchesResponse,
  CandidateMatchesRecalculationResult,
  DetailedMatchAnalysis,
  JobRequirements,
  JobRequirementsParseResult,
  MatchCalculationResult,
  MatchFilters,
  MatchingStatistics,
  MatchSortOptions,
  RankedCandidatesResponse,
  SingleMatchRecalculationResult,
  SkillsGapAnalysis,
} from "@/types/match";
import { withRetry } from "@/utils/apiErrorHandler";
import api from "@/utils/api";

// Use the shared api instance which already handles:
// - withCredentials: true (sends httpOnly cookies)
// - 401 redirect to /login
const apiClient = api;

export const matchesApi = {
  // Calculate matches for a job (with retry for long-running operations)
  calculateJobMatches: async (
    jobId: number,
    candidateIds?: number[],
    forceRecalculate: boolean = false
  ): Promise<MatchCalculationResult> => {
    return withRetry(
      async () => {
        // Try sending force_recalculate as a query parameter
        const payload = candidateIds || [];
        const queryParams = forceRecalculate ? '?force_recalculate=true' : '';
        console.log("Sending payload to calculate matches:", payload, "with query params:", queryParams);
        
        const response = await apiClient.post(`/jobs/${jobId}/calculate-matches${queryParams}`, payload);
        return response.data;
      },
      2,
      2000
    ); // 2 retries with 2s initial delay
  },

  // Get ranked candidates for a job
  getRankedCandidates: async (
    jobId: number,
    options?: {
      limit?: number;
      offset?: number;
      min_score?: number;
      filters?: MatchFilters;
      sort?: MatchSortOptions;
    }
  ): Promise<RankedCandidatesResponse> => {
    const params = new URLSearchParams();

    if (options?.limit) params.append("limit", options.limit.toString());
    if (options?.offset) params.append("offset", options.offset.toString());
    if (options?.min_score) params.append("min_score", options.min_score.toString());

    const response = await apiClient.get(`/jobs/${jobId}/ranked-candidates?${params}`);
    return response.data;
  },

  // Bulk recalculate all scores for a job
  bulkRecalculateJobScores: async (jobId: number): Promise<MatchCalculationResult> => {
    const response = await apiClient.post(`/jobs/${jobId}/bulk-score`);
    return response.data;
  },

  // Get job matches for a candidate
  getCandidateJobMatches: async (
    candidateId: number,
    limit?: number
  ): Promise<CandidateJobMatchesResponse> => {
    const params = limit ? `?limit=${limit}` : "";
    const response = await apiClient.get(`/candidates/${candidateId}/job-matches${params}`);
    return response.data;
  },

  // Recalculate matches for a candidate
  recalculateCandidateMatches: async (
    candidateId: number
  ): Promise<CandidateMatchesRecalculationResult> => {
    const response = await apiClient.post(`/candidates/${candidateId}/recalculate-matches`);
    return response.data;
  },

  // Get detailed match analysis
  getDetailedMatchAnalysis: async (
    candidateId: number,
    jobId: number
  ): Promise<DetailedMatchAnalysis> => {
    const response = await apiClient.get(`/matches/${candidateId}/${jobId}`);
    return response.data;
  },

  // Get skills gap analysis
  getSkillsGapAnalysis: async (candidateId: number, jobId: number): Promise<SkillsGapAnalysis> => {
    const response = await apiClient.get(`/matches/${candidateId}/${jobId}/skills-gap`);
    return response.data;
  },

  // Recalculate single match
  recalculateSingleMatch: async (
    candidateId: number,
    jobId: number
  ): Promise<SingleMatchRecalculationResult> => {
    const response = await apiClient.post(`/matches/${candidateId}/${jobId}/recalculate`);
    return response.data;
  },

  // Get matching statistics (admin)
  getMatchingStatistics: async (organizationId: number): Promise<MatchingStatistics> => {
    const response = await apiClient.get(`/matches/statistics/${organizationId}`);
    return response.data;
  },

  // Parse job requirements (needed for matching)
  parseJobRequirements: async (
    jobId: number,
    forceReparse: boolean = false
  ): Promise<JobRequirementsParseResult> => {
    const params = forceReparse ? '?force_reparse=true' : '';
    const response = await apiClient.post(`/jobs/${jobId}/parse-requirements${params}`);
    return response.data;
  },

  // Get job requirements
  getJobRequirements: async (jobId: number): Promise<JobRequirements> => {
    const response = await apiClient.get(`/jobs/${jobId}/requirements`);
    return response.data;
  },
};

export default matchesApi;
