export interface PublicOrganization {
  name: string
  slug: string
}

export interface PublicJobListItem {
  title: string
  slug: string
  location?: string
  employment_type: string
  work_arrangement: string
  category?: string
  created_at: string
}

export interface PublicJobDetail {
  title: string
  slug: string
  description: string
  location?: string
  employment_type: string
  work_arrangement: string
  category?: string
  responsibilities?: string[]
  requirements?: string[]
  nice_to_have?: string[]
  benefits?: string[]
  created_at: string
  organization: PublicOrganization
}

export interface CareerPageResponse {
  organization: PublicOrganization
  jobs: PublicJobListItem[]
  total_count: number
  categories: string[]
}

export interface JobApplicationFormData {
  first_name: string
  last_name: string
  email: string
  phone?: string
  location?: string
  linkedin_url?: string
  portfolio_url?: string
  cover_letter?: string
  resume: File
}

export interface JobApplicationResponse {
  message: string
  application_id: number
}

export interface CareerPageFilters {
  category?: string
  work_arrangement?: string
  employment_type?: string
  search?: string
}
