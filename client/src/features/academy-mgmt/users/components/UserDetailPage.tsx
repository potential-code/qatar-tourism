import type { Role } from '@shared/roles'
import {
  ENROLMENT_STATUS_LABELS,
  EXPERIENCE_LABELS,
  JOB_FUNCTION_LABELS,
  labelOf,
  ORGANISATION_TYPE_LABELS,
  SENIORITY_LABELS,
} from '@shared/schemas/admin-labels'
import { useQuery } from '@tanstack/react-query'
import { BookPlus, Mail, PencilLine, ShieldCheck, UserRoundCheck, UserRoundX } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { SimulatedTag } from '@/components/layout/SimulatedTag'
import { Reveal } from '@/components/motion/Reveal'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ApiError } from '@/lib/api'
import { Field } from '../../hub/components/Field'
import { ManagePage } from '../../hub/components/ManagePage'
import { OptionSelect, optionsOf } from '../../hub/components/OptionSelect'
import { Panel } from '../../hub/components/Panel'
import { ErrorPanel } from '../../hub/components/QueryStates'
import { ReasonDialog } from '../../hub/components/ReasonDialog'
import { StatusPill } from '../../hub/components/StatusPill'
import { initials, qDate } from '../../hub/utils/format'
import {
  useChangeRole,
  useInvite,
  userDetailQuery,
  useSetSuspended,
} from '../queries/users.queries'
import { ACCOUNT_STATUS, ENROLMENT_TONE, ROLE_LABEL } from '../utils/status'
import { EnrolDialog } from './EnrolDialog'
import { LearnerFormDialog } from './LearnerFormDialog'
import { AssessmentHistory, BookingHistory, SubmissionHistory } from './UserHistoryTables'
import { UserTimeline } from './UserTimeline'

const fail = (error: unknown, fallback: string) =>
  toast.error(error instanceof ApiError ? error.message : fallback)

export function UserDetailPage({ userId }: { userId: string }) {
  const query = useQuery(userDetailQuery(userId))
  const invite = useInvite(userId)
  const suspension = useSetSuspended(userId)
  const roleChange = useChangeRole(userId)
  const [dialog, setDialog] = useState<null | 'edit' | 'enrol' | 'suspend' | 'role'>(null)
  const [nextRole, setNextRole] = useState<Role>('learner')

  if (query.isPending)
    return (
      <div className="grid gap-6">
        <Skeleton className="h-24 rounded-xl" />
        <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
          <Skeleton className="h-[480px] rounded-xl" />
          <Skeleton className="h-[480px] rounded-xl" />
        </div>
      </div>
    )
  if (query.isError) return <ErrorPanel error={query.error} onRetry={() => query.refetch()} />

  const { account, profile, enrolments } = query.data
  const status = ACCOUNT_STATUS[account.status] ?? {
    label: account.status,
    tone: 'neutral' as const,
  }
  const suspended = account.status === 'suspended'
  const isLearner = account.role === 'learner'

  return (
    <ManagePage
      title={account.name}
      crumbs={[{ label: 'User management', to: '/admin/manage/users' }, { label: account.name }]}
      description={
        <span className="flex flex-wrap items-center gap-2">
          <span className="tabular-nums">{profile?.learnerCode ?? 'Staff account'}</span>
          <span aria-hidden>|</span>
          {ROLE_LABEL[account.role] ?? account.role}
          <StatusPill tone={status.tone}>{status.label}</StatusPill>
        </span>
      }
      actions={
        <>
          {isLearner ? (
            <>
              <Button variant="outline" onClick={() => setDialog('edit')}>
                <PencilLine /> Edit
              </Button>
              <Button
                variant="outline"
                disabled={invite.isPending}
                onClick={async () => {
                  try {
                    const r = await invite.mutateAsync()
                    toast.success(
                      r.created
                        ? 'Invitation added to the demo log'
                        : 'Invitation already in the demo log',
                      {
                        description: r.created
                          ? 'Demo email generated in the notification log; no external email was sent.'
                          : 'No duplicate message was created.',
                      },
                    )
                  } catch (e) {
                    fail(e, 'The invitation could not be created')
                  }
                }}
              >
                <Mail /> Invite
              </Button>
              <Button variant="outline" onClick={() => setDialog('enrol')}>
                <BookPlus /> Enrol
              </Button>
            </>
          ) : null}
          <Button variant="outline" onClick={() => setDialog('role')}>
            <ShieldCheck /> Role
          </Button>
          {isLearner ? (
            <Button
              variant={suspended ? 'default' : 'secondary'}
              onClick={() => setDialog('suspend')}
            >
              {suspended ? <UserRoundCheck /> : <UserRoundX />}
              {suspended ? 'Reactivate' : 'Suspend'}
            </Button>
          ) : null}
        </>
      }
    >
      <div className="grid items-start gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
        <div className="grid gap-6">
          <Reveal>
            <Panel bodyClassName="p-0">
              <div className="flex items-center gap-4 bg-gradient-to-br from-teal-deep to-teal px-6 py-6 text-white">
                <Avatar className="size-14 border-2 border-white/30">
                  <AvatarFallback className="bg-white/15 font-display text-lg text-white">
                    {initials(account.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="grid min-w-0">
                  <p className="truncate font-display text-xl">{account.name}</p>
                  <p className="text-sm text-white/75">
                    {profile?.jobTitle ?? ROLE_LABEL[account.role]}
                  </p>
                </div>
              </div>
              <dl className="grid gap-4 p-6 text-sm">
                <Row label="Email (controlled field)" value={account.email} />
                <Row label="Organisation" value={profile?.organisationName ?? 'Not specified'} />
                <Row
                  label="Organisation type"
                  value={
                    labelOf(ORGANISATION_TYPE_LABELS, profile?.organisationType) ?? 'Not specified'
                  }
                />
                <Row
                  label="Job function"
                  value={labelOf(JOB_FUNCTION_LABELS, profile?.jobFunction) ?? 'Not specified'}
                />
                <Row
                  label="Seniority"
                  value={labelOf(SENIORITY_LABELS, profile?.seniority) ?? 'Not specified'}
                />
                <Row
                  label="Experience"
                  value={labelOf(EXPERIENCE_LABELS, profile?.experience) ?? 'Not specified'}
                />
                <Row label="Registered" value={qDate(profile?.registeredAt ?? account.createdAt)} />
                <Row
                  label="Profile"
                  value={
                    profile
                      ? `${profile.status === 'complete' ? 'Complete' : 'Draft'}, ${profile.completeness}%`
                      : 'No learner profile'
                  }
                />
              </dl>
              <p className="border-t px-6 py-3 text-xs text-muted-foreground">
                Fictional record. No phone number or identity document is stored in this demo.
              </p>
            </Panel>
          </Reveal>
          <Reveal delay={0.05}>
            <Panel title="Enrolments" description="Each programme keeps its own progress.">
              {enrolments.length === 0 ? (
                <p className="text-sm text-muted-foreground">Not enrolled in any programme yet.</p>
              ) : (
                <ul className="grid gap-4">
                  {enrolments.map((e) => (
                    <li key={e.id} className="grid gap-2 rounded-xl border p-4">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium text-ink">Program {e.programme}</p>
                        <StatusPill tone={ENROLMENT_TONE[e.status] ?? 'neutral'}>
                          {ENROLMENT_STATUS_LABELS[e.status]}
                        </StatusPill>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {e.path ?? 'No path assigned'}
                      </p>
                      <div className="flex items-center gap-3">
                        <Progress
                          value={e.progress}
                          className="h-1.5"
                          aria-label={`Program ${e.programme} progress`}
                        />
                        <span className="text-xs tabular-nums text-muted-foreground">
                          {e.progress}%
                        </span>
                      </div>
                      {e.assignmentReason ? (
                        <p className="text-xs text-muted-foreground">{e.assignmentReason}</p>
                      ) : null}
                      {e.overrideReason ? (
                        <p className="text-xs text-maroon">Override: {e.overrideReason}</p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </Reveal>
        </div>

        <Reveal delay={0.08}>
          <Panel bodyClassName="p-0">
            <Tabs defaultValue="timeline">
              <div className="flex items-center justify-between gap-4 border-b px-6 py-3">
                <TabsList>
                  <TabsTrigger value="timeline">Timeline</TabsTrigger>
                  <TabsTrigger value="assessments">Assessments</TabsTrigger>
                  <TabsTrigger value="bookings">Bookings</TabsTrigger>
                  <TabsTrigger value="submissions">Assignments</TabsTrigger>
                </TabsList>
                <SimulatedTag label="Demo emails simulated" className="whitespace-nowrap" />
              </div>
              <TabsContent value="timeline" className="max-h-[720px] overflow-y-auto p-4">
                <UserTimeline entries={query.data.timeline} />
              </TabsContent>
              <TabsContent value="assessments" className="p-2">
                <AssessmentHistory rows={query.data.assessments} />
              </TabsContent>
              <TabsContent value="bookings" className="p-2">
                <BookingHistory rows={query.data.bookings} />
              </TabsContent>
              <TabsContent value="submissions" className="p-6">
                <SubmissionHistory rows={query.data.submissions} />
              </TabsContent>
            </Tabs>
          </Panel>
        </Reveal>
      </div>

      {isLearner ? (
        <>
          <LearnerFormDialog
            open={dialog === 'edit'}
            onOpenChange={(o) => setDialog(o ? 'edit' : null)}
            userId={userId}
            initial={{
              name: account.name,
              email: account.email,
              organisationId: profile?.organisationId ?? null,
              jobTitle: profile?.jobTitle ?? '',
              jobFunction: profile?.jobFunction ?? null,
              seniority: profile?.seniority ?? null,
              experience: profile?.experience ?? null,
            }}
          />
          <EnrolDialog
            userId={userId}
            enrolled={enrolments.map((e) => e.programme)}
            open={dialog === 'enrol'}
            onOpenChange={(o) => setDialog(o ? 'enrol' : null)}
          />
          <ReasonDialog
            open={dialog === 'suspend'}
            onOpenChange={(o) => setDialog(o ? 'suspend' : null)}
            title={suspended ? 'Reactivate access' : 'Suspend access'}
            description={
              suspended
                ? 'The learner can sign in again. Their learning records were kept while suspended.'
                : 'The learner is signed out at once and cannot sign in. Learning records, bookings and results are kept.'
            }
            confirmLabel={suspended ? 'Reactivate' : 'Suspend access'}
            destructive={!suspended}
            pending={suspension.isPending}
            onConfirm={async (reason) => {
              try {
                const r = await suspension.mutateAsync({ suspend: !suspended, reason })
                toast.success(r.suspended ? 'Access suspended' : 'Access reactivated', {
                  description: r.suspended
                    ? `${r.sessionsRevoked} active session(s) signed out.`
                    : 'Recorded in the audit trail.',
                })
                setDialog(null)
              } catch (e) {
                fail(e, 'The change could not be saved')
              }
            }}
          />
        </>
      ) : null}
      <ReasonDialog
        open={dialog === 'role'}
        onOpenChange={(o) => {
          setDialog(o ? 'role' : null)
          if (o) setNextRole(account.role as Role)
        }}
        title="Change role"
        description="Role changes are restricted to authorised administrators, sign the user out and are recorded as a permission change. Trainer access needs a trainer profile from Trainer management."
        confirmLabel="Change role"
        pending={roleChange.isPending}
        onConfirm={async (reason) => {
          try {
            await roleChange.mutateAsync({ role: nextRole, reason })
            toast.success(`Role changed to ${ROLE_LABEL[nextRole]}`)
            setDialog(null)
          } catch (e) {
            fail(e, 'The role could not be changed')
          }
        }}
      >
        <Field id="role-select" label="Role">
          <OptionSelect
            id="role-select"
            value={nextRole}
            onChange={(v) => v && setNextRole(v as Role)}
            options={optionsOf(ROLE_LABEL)}
          />
        </Field>
      </ReasonDialog>
    </ManagePage>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[140px_1fr] gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words text-ink">{value}</dd>
    </div>
  )
}
