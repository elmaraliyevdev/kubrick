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

/** Standard toggles for the public apply form (org default or per-job override). */
export interface ApplicationFormStandardConfig {
  show_phone: boolean
  show_location: boolean
  show_linkedin: boolean
  show_portfolio: boolean
  show_cover_letter: boolean
  require_phone: boolean
  require_location: boolean
  require_linkedin: boolean
  require_portfolio: boolean
  require_cover_letter: boolean
}

export interface ApplicationFormCustomField {
  id: number
  field_key: string
  label: string
  field_type: string
  is_required: boolean
  options?: string[] | null
  placeholder?: string | null
  sort_order: number
}

export interface CareerJobDetailApplicationForm {
  config: ApplicationFormStandardConfig
  custom_fields: ApplicationFormCustomField[]
  use_organization_defaults?: boolean
}

export interface CareerJobDetailApiResponse {
  job: PublicJobDetail
  application_form: CareerJobDetailApplicationForm
}

export interface CareerPageResponse {
  organization: PublicOrganization
  jobs: PublicJobListItem[]
  total_count: number
  categories: string[]
  application_form: CareerJobDetailApplicationForm
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
