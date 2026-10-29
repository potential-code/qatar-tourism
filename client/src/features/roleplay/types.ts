import type { PracticeAttemptView, PracticeOverview } from '@/services/roleplay.service'

export type { PracticeOverview }

export type ScenarioSummary = PracticeOverview['scenarios'][number]
export type PracticeEnrolment = PracticeOverview['enrolments'][number]
export type AttemptSummary = PracticeOverview['summary']
export type AttemptView = PracticeAttemptView
export type CriterionView = AttemptView['criteria'][number]
export type TranscriptTurn = AttemptView['transcript'][number]
export type PracticeMode = AttemptView['mode']
