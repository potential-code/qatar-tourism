import type { InferResponseType } from 'hono/client'
import type { api } from '@/lib/api'

export type PracticeOverview = InferResponseType<typeof api.roleplay.overview.$get, 200>
export type ScenarioSummary = PracticeOverview['scenarios'][number]
export type PracticeEnrolment = PracticeOverview['enrolments'][number]
export type AttemptSummary = PracticeOverview['summary']
export type AttemptView = InferResponseType<(typeof api.roleplay.attempts)[':id']['$get'], 200>
export type CriterionView = AttemptView['criteria'][number]
export type TranscriptTurn = AttemptView['transcript'][number]
export type PracticeMode = AttemptView['mode']
