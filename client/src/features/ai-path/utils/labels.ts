import { humanise } from '@/lib/analytics/format'

const ORG: Record<string, string> = {
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

const EXPERIENCE: Record<string, string> = {
  lt_1: 'Less than 1 year',
  '1_3': '1 to 3 years',
  '4_7': '4 to 7 years',
  '8_plus': '8 or more years',
}

export const orgTypeLabel = (v: string | null) => (v ? (ORG[v] ?? humanise(v)) : 'Not given')
export const experienceLabel = (v: string | null) => (v ? (EXPERIENCE[v] ?? v) : 'Not given')
export const valueLabel = (v: string | null) => (v ? humanise(v) : 'Not given')
