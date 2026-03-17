import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/utils/api'
import type { Job, JobCreate, JobUpdate } from '@/types/job'

// Fetch all jobs
export const useJobs = () => {
  return useQuery({
    queryKey: ['jobs'],
    queryFn: async (): Promise<Job[]> => {
      const response = await api.get('/jobs/')
      return response.data
    },
  })
}

// Fetch single job
export const useJob = (jobId: number) => {
  return useQuery({
    queryKey: ['jobs', jobId],
    queryFn: async (): Promise<Job> => {
      const response = await api.get(`/jobs/${jobId}`)
      return response.data
    },
    enabled: !!jobId,
  })
}

// Create job
export const useCreateJob = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (jobData: JobCreate): Promise<Job> => {
      const response = await api.post('/jobs/', jobData)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] })
    },
  })
}

// Update job
export const useUpdateJob = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: JobUpdate }): Promise<Job> => {
      const response = await api.put(`/jobs/${id}`, data)
      return response.data
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] })
      queryClient.invalidateQueries({ queryKey: ['jobs', id] })
    },
  })
}

// Delete job
export const useDeleteJob = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (jobId: number): Promise<void> => {
      await api.delete(`/jobs/${jobId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] })
    },
  })
}