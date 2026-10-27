import type { Viewer } from '@server/middleware/auth.middleware'
import type { ProgrammeCode } from '@shared/constants'
import type { Role } from '@shared/roles'
import type {
  AdminUserCreateInput,
  AdminUserListQuery,
  AdminUserUpdateInput,
} from '@shared/schemas/admin-users'
import * as usersService from './users.service'
import { buildTimeline } from './users.timeline'

const iso = (value: Date | null | undefined) => (value ? value.toISOString() : null)

export async function listUsers(query: AdminUserListQuery) {
  const { items, total } = await usersService.listUsers(query)
  return {
    items: items.map((row) => ({
      ...row,
      createdAt: row.createdAt.toISOString(),
      lastActivityAt: iso(row.lastActivityAt),
    })),
    total,
    page: query.page,
    pageSize: query.pageSize,
  }
}

export const listOptions = () => usersService.listOptions()

/** Learner detail for user management and the report drill-down (admin only). */
export async function getUser(userId: string) {
  const d = await usersService.getUserDetail(userId)
  const status = d.profile?.suspended ? 'suspended' : d.account.emailVerified ? 'active' : 'invited'
  return {
    account: { ...d.account, createdAt: d.account.createdAt.toISOString(), status },
    profile: d.profile
      ? {
          ...d.profile,
          registeredAt: d.profile.registeredAt.toISOString(),
          lastActivityAt: iso(d.profile.lastActivityAt),
        }
      : null,
    enrolments: d.enrolments.map((e) => ({
      ...e,
      enrolledAt: e.enrolledAt.toISOString(),
      startedAt: iso(e.startedAt),
      completedAt: iso(e.completedAt),
      lastActivityAt: iso(e.lastActivityAt),
    })),
    assessments: d.attempts.map((a) => ({
      ...a,
      submittedAt: iso(a.submittedAt),
      startedAt: a.startedAt.toISOString(),
    })),
    bookings: d.bookings.map((b) => ({
      ...b,
      startsAt: b.startsAt.toISOString(),
      bookedAt: b.bookedAt.toISOString(),
      markedAt: iso(b.markedAt),
    })),
    submissions: d.submissions.map((s) => ({
      ...s,
      submittedAt: s.submittedAt.toISOString(),
      reviewedAt: iso(s.reviewedAt),
    })),
    certificates: d.certificates.map((c) => ({
      ...c,
      issuedAt: c.issuedAt.toISOString(),
      revokedAt: iso(c.revokedAt),
    })),
    timeline: buildTimeline(d),
  }
}

export const createLearner = (viewer: Viewer, input: AdminUserCreateInput, requestId?: string) =>
  usersService.createLearner(viewer, input, requestId)

export const updateLearner = (
  viewer: Viewer,
  userId: string,
  input: AdminUserUpdateInput,
  requestId?: string,
) => usersService.updateLearner(viewer, userId, input, requestId)

export const resendInvite = (viewer: Viewer, userId: string, requestId?: string) =>
  usersService.resendInvite(viewer, userId, requestId)

export const enrol = (
  viewer: Viewer,
  userId: string,
  programme: ProgrammeCode,
  requestId?: string,
) => usersService.enrol(viewer, userId, programme, requestId)

export const suspend = (viewer: Viewer, userId: string, reason: string, requestId?: string) =>
  usersService.setSuspended(viewer, userId, true, reason, requestId)

export const reactivate = (viewer: Viewer, userId: string, reason: string, requestId?: string) =>
  usersService.setSuspended(viewer, userId, false, reason, requestId)

export const changeRole = (
  viewer: Viewer,
  userId: string,
  role: Role,
  reason: string,
  requestId?: string,
) => usersService.changeRole(viewer, userId, role, reason, requestId)
