import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";

interface Job {
  id: number;
  title: string;
  description: string;
}

interface JobState {
  jobs: Job[];
}

const initialState: JobState = { jobs: [] };

export const jobSlice = createSlice({
  name: "jobs",
  initialState,
  reducers: {
    setJobs: (state, action: PayloadAction<Job[]>) => {
      state.jobs = action.payload;
    },
  },
});

export const { setJobs } = jobSlice.actions;