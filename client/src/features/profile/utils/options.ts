import type {
  ExperienceBand,
  JobFunction,
  LearningGoal,
  OrganisationType,
  Seniority,
} from '@shared/constants'

/** Display labels for the brief §4 option lists, in the brief's order. */

export const ORGANISATION_TYPE_LABEL: Record<OrganisationType, string> = {
  hotel_accommodation: 'Hotel or accommodation',
  tour_operator: 'Tour operator',
  transport: 'Transport',
  travel_trade: 'Travel trade',
  attraction_venue: 'Attraction or venue',
  public_sector: 'Public sector',
  education: 'Education',
  independent: 'Independent',
  other: 'Other',
}

export const JOB_FUNCTION_LABEL: Record<JobFunction, string> = {
  guest_services: 'Guest services',
  front_office: 'Front office',
  guiding: 'Guiding',
  transport: 'Transport',
  sales: 'Sales',
  operations: 'Operations',
  training: 'Training',
  management: 'Management',
  other: 'Other',
}

export const SENIORITY_LABEL: Record<Seniority, string> = {
  student_trainee: 'Student or trainee',
  entry_level: 'Entry level',
  experienced_professional: 'Experienced professional',
  supervisor: 'Supervisor',
  manager: 'Manager',
  senior_leader: 'Senior leader',
  independent_professional: 'Independent professional',
}

export const EXPERIENCE_LABEL: Record<ExperienceBand, string> = {
  lt_1: 'Less than 1 year',
  '1_3': '1–3 years',
  '4_7': '4–7 years',
  '8_plus': '8 or more years',
}

export const GOAL_LABEL: Record<LearningGoal, string> = {
  visitor_welcome: 'Visitor welcome',
  communication: 'Communication',
  complaint_handling: 'Complaint handling',
  guiding: 'Guiding',
  storytelling: 'Storytelling',
  leadership: 'Leadership',
}

/** Suggestions for the searchable job title; any title can be typed. */
export const JOB_TITLE_SUGGESTIONS = [
  'Guest Relations Officer',
  'Front Office Agent',
  'Concierge',
  'Reservations Agent',
  'Tour Guide',
  'Desert Safari Guide',
  'Driver',
  'Customer Service Agent',
  'Visitor Experience Supervisor',
  'Sales Executive',
  'Operations Coordinator',
  'Training Coordinator',
  'Duty Manager',
  'Hospitality Student',
]

export const LANGUAGES = [
  'English',
  'Arabic',
  'French',
  'Hindi',
  'Portuguese',
  'Tagalog',
  'Urdu',
] as const

export const COUNTRIES = [
  'Qatar',
  'Bahrain',
  'Egypt',
  'India',
  'Jordan',
  'Kuwait',
  'Lebanon',
  'Nepal',
  'Oman',
  'Pakistan',
  'Philippines',
  'Saudi Arabia',
  'Sri Lanka',
  'United Arab Emirates',
  'United Kingdom',
  'Other',
] as const
