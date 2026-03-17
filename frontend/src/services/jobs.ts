import axios from "axios";
import type { Job } from "../types/job";

const API_URL = import.meta.env.VITE_API_URL;

export const fetchJobs = async () => {
  const { data } = await axios.get<Job[]>(`${API_URL}/jobs`);
  return data;
};
