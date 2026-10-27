import type {
  EnrolmentStatus,
  ExperienceBand,
  JobFunction,
  LearningGoal,
  OrganisationType,
  ProgrammeCode,
  Seniority,
} from '../constants/enums'

/**
 * Display labels for admin screens, shared so a report row, a CSV cell, a filter chip and an AI
 * answer all say the same words. Lives under schemas/ because Phase 2 agents may only add
 * `shared/schemas/admin-*` files.
 */

export const PROGRAMME_LABELS: Record<ProgrammeCode, string> = {
  A: 'Program A',
  B: 'Program B',
  C: 'Program C',
}

export const PROGRAMME_TITLES: Record<ProgrammeCode, string> = {
  A: 'Tourism Service Professional',
  B: 'Visitor Service Essentials',
  C: 'Destination Storytelling',
}

export const ENROLMENT_STATUS_LABELS: Record<EnrolmentStatus, string> = {
  not_started: 'Not started',
  in_progress: 'In progress',
  awaiting_review: 'Awaiting review',
  completed: 'Completed',
}

export const ORGANISATION_TYPE_LABELS: Record<OrganisationType, string> = {
  hotel_accommodation: 'Hotel and accommodation',
  tour_operator: 'Tour operator',
  transport: 'Transport',
  travel_trade: 'Travel trade',
  attraction_venue: 'Attraction or venue',
  public_sector: 'Public sector',
  education: 'Education',
  independent: 'Independent',
  other: 'Other',
}

export const SENIORITY_LABELS: Record<Seniority, string> = {
  student_trainee: 'Student or trainee',
  entry_level: 'Entry level',
  experienced_professional: 'Experienced professional',
  supervisor: 'Supervisor',
  manager: 'Manager',
  senior_leader: 'Senior leader',
  independent_professional: 'Independent professional',
}

export const JOB_FUNCTION_LABELS: Record<JobFunction, string> = {
  guest_services: 'Guest services',
  front_office: 'Front office',
  guiding: 'Guiding',
  transport: 'Driver or transport',
  sales: 'Sales',
  operations: 'Operations',
  training: 'Training',
  management: 'Management',
  other: 'Other',
}

export const EXPERIENCE_LABELS: Record<ExperienceBand, string> = {
  lt_1: 'Less than 1 year',
  '1_3': '1 to 3 years',
  '4_7': '4 to 7 years',
  '8_plus': '8 years or more',
}

export const GOAL_LABELS: Record<LearningGoal, string> = {
  visitor_welcome: 'Visitor welcome',
  communication: 'Communication',
  complaint_handling: 'Complaint handling',
  guiding: 'Guiding',
  storytelling: 'Storytelling',
  leadership: 'Leadership',
}

export const DATE_FIELD_LABELS = {
  registration: 'Registration date',
  activity: 'Last activity date',
  completion: 'Completion date',
} as const

/** "Hotel and accommodation" for a known key, the raw value otherwise. */
export function labelOf<K extends string>(map: Record<K, string>, value: K | null | undefined) {
  return value ? (map[value] ?? value) : null
}
