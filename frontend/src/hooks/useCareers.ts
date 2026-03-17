import { useQuery, useMutation } from "@tanstack/react-query";
import { getCareerPage, getJobDetail, applyToJob } from "@/services/careers";
import type { CareerPageFilters } from "@/types/career";

export const useCareerPage = (orgSlug: string, filters?: CareerPageFilters) => {
  return useQuery({
    queryKey: ["career-page", orgSlug, filters],
    queryFn: () => getCareerPage(orgSlug, filters),
    enabled: !!orgSlug,
  });
};

export const useCareerJobDetail = (orgSlug: string, jobSlug: string) => {
  return useQuery({
    queryKey: ["career-job", orgSlug, jobSlug],
    queryFn: () => getJobDetail(orgSlug, jobSlug),
    enabled: !!orgSlug && !!jobSlug,
  });
};

export const useApplyToJob = () => {
  return useMutation({
    mutationFn: ({
      orgSlug,
      jobSlug,
      formData,
    }: {
      orgSlug: string;
      jobSlug: string;
      formData: FormData;
    }) => applyToJob(orgSlug, jobSlug, formData),
  });
};
