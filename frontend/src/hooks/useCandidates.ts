import type {
  Candidate,
  CandidateCreate,
  CandidateListItem,
  CandidateUpdate,
} from "@/types/candidate";
import api from "@/utils/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

// Fetch all candidates
export const useCandidates = (params?: { search?: string; skip?: number; limit?: number }) => {
  return useQuery({
    queryKey: ["candidates", params],
    queryFn: async (): Promise<CandidateListItem[]> => {
      const searchParams = new URLSearchParams();
      if (params?.search) searchParams.append("search", params.search);
      if (params?.skip !== undefined) searchParams.append("skip", params.skip.toString());
      if (params?.limit) searchParams.append("limit", params.limit.toString());

      const response = await api.get(`/candidates/?${searchParams}`);
      return response.data;
    },
  });
};

// Fetch single candidate
export const useCandidate = (candidateId: number) => {
  return useQuery({
    queryKey: ["candidates", candidateId],
    queryFn: async (): Promise<Candidate> => {
      const response = await api.get(`/candidates/${candidateId}`);
      return response.data;
    },
    enabled: !!candidateId,
  });
};

// Create candidate
export const useCreateCandidate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (candidateData: CandidateCreate): Promise<Candidate> => {
      const response = await api.post("/candidates/", candidateData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
    },
  });
};

// Update candidate
export const useUpdateCandidate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: CandidateUpdate }): Promise<Candidate> => {
      const response = await api.put(`/candidates/${id}`, data);
      return response.data;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
      queryClient.invalidateQueries({ queryKey: ["candidates", id] });
    },
  });
};

// Delete candidate
export const useDeleteCandidate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (candidateId: number): Promise<void> => {
      await api.delete(`/candidates/${candidateId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
    },
  });
};
