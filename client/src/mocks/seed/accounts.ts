import type { ActivityResult } from './activity'
import { stableUuid, userIds } from './ids'
import type { LearnerSeed } from './learners'
import type { OrganisationSeed } from './organisations'
import { personaPortrait, trainerPortrait } from './portraits'
import type { Calendar } from './reference-date'
import type { Rng } from './rng'
import type { SeedRow } from './rows'
import { TRAINER_ORGANISATION, TRAINERS } from './trainers'

type UserInsert = SeedRow<'users'>
type ProfileInsert = SeedRow<'profiles'>
type OrganisationInsert = SeedRow<'organisations'>
type TrainerProfileInsert = SeedRow<'trainerProfiles'>
type TrainerProgrammeInsert = SeedRow<'trainerProgrammes'>

export const ADMIN_EMAIL = 'admin@example.com'
export const ADMIN_NAME = 'Academy Admin'

export function buildUsers(
  learners: readonly LearnerSeed[],
  dates: ActivityResult['learnerDates'],
  cal: Calendar,
): UserInsert[] {
  const staffCreated = cal.ago(120)
  const users: UserInsert[] = [
    {
      id: userIds.admin,
      name: ADMIN_NAME,
      email: ADMIN_EMAIL,
      emailVerified: true,
      role: 'admin',
      createdAt: staffCreated,
      updatedAt: staffCreated,
    },
    ...TRAINERS.map((t) => ({
      id: t.userId,
      name: t.fullName,
      email: t.email,
      emailVerified: true,
      role: 'trainer' as const,
      image: trainerPortrait(t.code),
      createdAt: staffCreated,
      updatedAt: staffCreated,
    })),
    ...learners.map((l) => {
      const registeredAt = (dates.get(l.userId) as { registeredAt: Date }).registeredAt
      return {
        id: l.userId,
        name: l.fullName,
        email: l.email,
        emailVerified: true,
        role: 'learner' as const,
        image: personaPortrait(l.code),
        createdAt: registeredAt,
        updatedAt: registeredAt,
      }
    }),
  ]
  return users
}

export function buildOrganisationRows(
  organisations: readonly OrganisationSeed[],
  cal: Calendar,
): OrganisationInsert[] {
  const created = cal.ago(120)
  return organisations.map((o) => ({
    id: o.id,
    code: o.code,
    name: o.name,
    type: o.type,
    city: o.city,
    isPseudo: o.isPseudo,
    createdAt: created,
    updatedAt: created,
  }))
}

export function buildProfiles(
  rootRng: Rng,
  learners: readonly LearnerSeed[],
  dates: ActivityResult['learnerDates'],
): ProfileInsert[] {
  const rng = rootRng.fork('profiles')
  return learners.map((l) => {
    const d = dates.get(l.userId) as { registeredAt: Date; lastActivityAt: Date | null }
    const complete = l.profileComplete
    // A draft profile stopped in the wizard (step 1 or 2): later fields are still empty.
    const step = complete ? 3 : rng.int(1, 2)
    return {
      id: stableUuid('profile', l.code),
      userId: l.userId,
      learnerCode: l.code,
      fullName: l.fullName,
      organisationId: l.organisation.id,
      organisationOther: null,
      jobTitle: l.jobTitle,
      jobFunction: l.jobFunction,
      seniority: l.seniority,
      experience: l.experience,
      country: step >= 2 ? l.country : null,
      city: step >= 2 ? l.city : null,
      preferredLanguage: step >= 2 ? l.language : null,
      captionsPreference: step >= 2 ? l.captions : null,
      accessibilityRequest: step >= 2 ? l.accessibilityRequest : null,
      goals: complete ? l.goals : [],
      weeklyMinutes: complete ? l.weeklyMinutes : null,
      mobile: null,
      wizardStep: step,
      status: complete ? 'complete' : 'draft',
      consentAcceptedAt: complete ? d.registeredAt : null,
      marketingOptIn: complete ? l.marketingOptIn : false,
      suspended: false,
      registeredAt: d.registeredAt,
      lastActivityAt: d.lastActivityAt,
      completeness: complete ? 100 : step === 1 ? 45 : 70,
      createdAt: d.registeredAt,
      updatedAt: d.lastActivityAt ?? d.registeredAt,
    }
  })
}

export function buildTrainerRows(
  programmeIds: Record<'A' | 'B' | 'C', string>,
  cal: Calendar,
): { profiles: TrainerProfileInsert[]; approvals: TrainerProgrammeInsert[] } {
  const created = cal.ago(120)
  const profiles: TrainerProfileInsert[] = TRAINERS.map((t) => ({
    id: t.id,
    userId: t.userId,
    code: t.code,
    fullName: t.fullName,
    headline: t.headline,
    bio: t.bio,
    expertise: t.expertise,
    languages: t.languages,
    organisation: TRAINER_ORGANISATION,
    avatarPath: trainerPortrait(t.code),
    createdAt: created,
    updatedAt: created,
  }))
  const approvals: TrainerProgrammeInsert[] = TRAINERS.flatMap((t) =>
    t.approvedProgrammes.map((programme) => ({
      id: stableUuid('trainer-programme', `${t.code}:${programme}`),
      trainerId: t.id,
      programmeId: programmeIds[programme],
      createdAt: created,
      updatedAt: created,
    })),
  )
  return { profiles, approvals }
}
