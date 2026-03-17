import api from "@/utils/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export const useUploadResume = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ candidateId, file }: { candidateId: number; file: File }) => {
      const formData = new FormData();
      formData.append("file", file);

      const response = await api.post(`/files/upload-resume/${candidateId}`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      return response.data;
    },
    onSuccess: (_, { candidateId }) => {
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
      queryClient.invalidateQueries({ queryKey: ["candidates", candidateId] });
    },
  });
};

export const useUploadResumeCreateCandidate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ file }: { file: File }) => {
      const formData = new FormData();
      formData.append("file", file);

      const response = await api.post("/files/upload-resume-create-candidate", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
    },
  });
};

export const useBulkUploadResumes = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      files,
      autoCreateCandidates = true,
    }: {
      files: File[];
      autoCreateCandidates?: boolean;
    }) => {
      const formData = new FormData();

      files.forEach((file) => {
        formData.append("files", file);
      });
      formData.append("auto_create_candidates", autoCreateCandidates.toString());

      const response = await api.post("/files/bulk-upload-resumes", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
    },
  });
};
