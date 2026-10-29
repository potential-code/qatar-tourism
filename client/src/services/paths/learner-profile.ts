import type {
  ExperienceBand,
  JobFunction,
  LearningGoal,
  OrganisationType,
  Seniority,
} from '@shared/constants'
import { db } from '../api'

/**
 * The learner facts path resolution and the journey read (formerly part of
 * server/modules/paths/paths.service.ts). Shared by progress, paths and ai-path services.
 */

export type LearnerProfile = {
  userId: string
  fullName: string
  learnerCode: string | null
  organisationName: string | null
  organisationType: OrganisationType | null
  jobTitle: string | null
  jobFunction: JobFunction | null
  seniority: Seniority | null
  experience: ExperienceBand | null
  goals: LearningGoal[]
  weeklyMinutes: number | null
  preferredLanguage: string | null
  complete: boolean
  completeness: number
}

export function loadLearnerProfile(userId: string): LearnerProfile {
  const account = db.users.find((u) => u.id === userId)
  const profile = db.profiles.find((p) => p.userId === userId)
  const organisation = profile?.organisationId
    ? db.organisations.find((o) => o.id === profile.organisationId)
    : undefined
  return {
    userId,
    fullName: profile?.fullName ?? account?.name ?? 'Learner',
    learnerCode: profile?.learnerCode ?? null,
    organisationName: organisation?.name ?? profile?.organisationOther ?? null,
    organisationType: organisation?.type ?? null,
    jobTitle: profile?.jobTitle ?? null,
    jobFunction: profile?.jobFunction ?? null,
    seniority: profile?.seniority ?? null,
    experience: profile?.experience ?? null,
    goals: (profile?.goals ?? []) as LearningGoal[],
    weeklyMinutes: profile?.weeklyMinutes ?? null,
    preferredLanguage: profile?.preferredLanguage ?? null,
    complete: profile?.status === 'complete',
    completeness: profile?.completeness ?? 0,
  }
}

/** Code, name and description of a learning path, or null. */
export function pathSummary(pathId: string | null) {
  if (!pathId) return null
  const path = db.learningPaths.find((p) => p.id === pathId)
  return path
    ? { id: path.id, code: path.code, name: path.name, description: path.description }
    : null
}
