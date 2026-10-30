import { crmLearnerId, learnerDisplayId } from '@shared/utils/identity'
import { ApiError, db, delay, now, out, requireRole } from '../api'
import { externalViews } from '../external-certificates.service'
import { licenceFor } from '../licence.service'
import { cpdSummary } from './cpd'
import { trainingHistory } from './history'
import { credentialViews } from './lifecycle'
import { runReminderSweep } from './reminders'

/**
 * The unified learner record (SPEC §4): one learner identity across programmes. The learner
 * reads their own; an admin reads any learner's (the same data, read-only, for the learner
 * detail page). Loading it runs the reminder sweep, so a clock change shows up here at once.
 */

function recordFor(learnerId: string) {
  const profile = db.profiles.find((p) => p.userId === learnerId)
  const account = db.users.find((u) => u.id === learnerId)
  if (!profile || !account) throw ApiError.notFound('Learner not found')
  const programmes = db.enrolments
    .filter((e) => e.learnerId === learnerId)
    .flatMap((e) => {
      const programme = db.programmes.find((p) => p.id === e.programmeId)
      return programme
        ? [
            {
              code: programme.code,
              title: programme.title,
              certificationEnabled: programme.certificationEnabled,
              enrolmentStatus: e.status,
            },
          ]
        : []
    })
    .sort((a, b) => a.code.localeCompare(b.code))
  return {
    /** The demo clock's date (YYYY-MM-DD), for form limits. */
    today: now().toISOString().slice(0, 10),
    learner: {
      userId: learnerId,
      name: profile.fullName,
      displayId: learnerDisplayId(profile.learnerCode),
      crmId: crmLearnerId(profile.learnerCode),
    },
    programmes,
    history: trainingHistory(learnerId),
    credentials: credentialViews(
      db.certificates.filter((c) => c.learnerId === learnerId),
      { certifiedOnly: true },
    ),
    cpd: cpdSummary(learnerId),
    external: externalViews(learnerId),
    licence: licenceFor(learnerId),
  }
}

export type LearnerRecord = ReturnType<typeof recordFor>

export async function getMyRecord() {
  await delay()
  const learner = requireRole('learner')
  runReminderSweep()
  return out(recordFor(learner.id))
}

/** Admin read of a learner's record (learner detail page). */
export async function getLearnerRecord(userId: string) {
  await delay()
  requireRole('admin')
  runReminderSweep()
  return out(recordFor(userId))
}
