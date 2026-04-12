import publicApi from "@/utils/publicApi";
import type {
  CareerPageResponse,
  CareerPageFilters,
  CareerJobDetailApiResponse,
  JobApplicationResponse,
} from "@/types/career";

export const getCareerPage = async (
  orgSlug: string,
  filters?: CareerPageFilters
): Promise<CareerPageResponse> => {
  const params: Record<string, string> = {};
  if (filters?.category) params.category = filters.category;
  if (filters?.work_arrangement) params.work_arrangement = filters.work_arrangement;
  if (filters?.employment_type) params.employment_type = filters.employment_type;
  if (filters?.search) params.search = filters.search;

  const { data } = await publicApi.get(`/careers/${orgSlug}`, { params });
  return data;
};

export const getJobDetail = async (
  orgSlug: string,
  jobSlug: string
): Promise<CareerJobDetailApiResponse> => {
  const { data } = await publicApi.get(`/careers/${orgSlug}/${jobSlug}`);
  return data as CareerJobDetailApiResponse;
};

export const applyToJob = async (
  orgSlug: string,
  jobSlug: string,
  formData: FormData
): Promise<JobApplicationResponse> => {
  const { data } = await publicApi.post(
    `/careers/${orgSlug}/${jobSlug}/apply`,
    formData,
    { headers: { "Content-Type": "multipart/form-data" } }
  );
  return data;
};
