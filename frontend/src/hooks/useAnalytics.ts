import { useQuery } from '@tanstack/react-query';
import api from '@/utils/api';
import type { CandidateListItem } from '@/types/candidate';

export const useRecentCandidates = (limit: number = 5) => {
  return useQuery({
    queryKey: ['dashboard', 'recent-candidates', limit],
    queryFn: async (): Promise<CandidateListItem[]> => {
      const response = await api.get(`/candidates/?limit=${limit * 2}`);
      const candidates: CandidateListItem[] = response.data;

      return candidates
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, limit);
    },
    staleTime: 2 * 60 * 1000,
  });
};
