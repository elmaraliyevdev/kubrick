export interface Job {
  id: number
  title: string
  slug: string
  description: string
  location?: string
  employment_type: 'full_time' | 'part_time' | 'contract' | 'internship'
  responsibilities?: string[]
  requirements?: string[]
  nice_to_have?: string[]
  benefits?: string[]
  skills_required?: string
  work_arrangement: 'remote_only' | 'remote_possible' | 'hybrid' | 'onsite' | 'relocation_required'
  status: 'open' | 'closed' | 'draft'
  category?: string
  experience_level?: 'junior' | 'mid' | 'senior' | 'lead' | null
  user_id: number
  organization_id: number
  organization?: {
    id: number
    name: string
    slug: string
  }
  created_at: string
  updated_at: string
  candidate_count: number
}

export interface JobCreate {
  title: string
  description: string
  location?: string
  employment_type?: string
  responsibilities?: string[]
  requirements?: string[]
  nice_to_have?: string[]
  benefits?: string[]
  skills_required?: string
  work_arrangement?: string
  status?: string
  category?: string
  experience_level?: string | null
}

/** Mirrors backend ApplicationFormStandardConfig / PublicFormConfigResponse */
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

export interface OrgCustomFormFieldDTO {
  id: number
  field_key: string
  label: string
  field_type: string
  is_required: boolean
  options?: string[] | null
  placeholder?: string | null
  sort_order: number
}

/** Payload for PUT /jobs/:id/application-form */
export interface JobApplicationFormPut {
  use_organization_defaults: boolean
  standard_config?: ApplicationFormStandardConfig
  custom_field_ids?: number[]
}

export interface JobApplicationFormSettingsDTO {
  use_organization_defaults: boolean
  resolved: {
    config: ApplicationFormStandardConfig
    custom_fields: OrgCustomFormFieldDTO[]
  }
  organization_custom_fields: OrgCustomFormFieldDTO[]
  standard_config?: ApplicationFormStandardConfig | null
  custom_field_ids?: number[] | null
}

export interface JobUpdate {
  title?: string
  description?: string
  location?: string
  employment_type?: string
  responsibilities?: string[]
  requirements?: string[]
  nice_to_have?: string[]
  benefits?: string[]
  skills_required?: string
  work_arrangement?: string
  status?: string
  category?: string
  experience_level?: string | null
}
