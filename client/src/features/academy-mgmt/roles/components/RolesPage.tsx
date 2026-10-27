import type { Access } from '@shared/permissions'
import { useQuery } from '@tanstack/react-query'
import { Ban, CircleCheckBig, Lock, ShieldAlert, UserRound, Users } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { Reveal } from '@/components/motion/Reveal'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { ManagePage } from '../../hub/components/ManagePage'
import { Panel } from '../../hub/components/Panel'
import { ErrorPanel, TableSkeleton } from '../../hub/components/QueryStates'
import { TableFrame } from '../../hub/components/TableFrame'
import { permissionsQuery } from '../../hub/queries/governance.queries'
import { humanise } from '../../hub/utils/format'

const ROLES = ['learner', 'trainer', 'admin'] as const
const ROLE_TITLE = { learner: 'Learner', trainer: 'Trainer', admin: 'Admin' }

const ACCESS: Record<Access, { label: string; Icon: typeof Ban; cls: string }> = {
  none: { label: 'No', Icon: Ban, cls: 'text-muted-foreground' },
  own: { label: 'Own', Icon: UserRound, cls: 'text-teal-deep' },
  assigned: { label: 'Assigned', Icon: Users, cls: 'text-teal-deep' },
  authorised: { label: 'Authorised', Icon: CircleCheckBig, cls: 'text-success' },
}

const FIELD_LABEL: Record<string, string> = {
  learnerCode: 'Learner ID',
  displayName: 'Display name',
  organisationName: 'Organisation',
  organisationType: 'Organisation type',
  jobTitle: 'Job title',
  jobFunction: 'Job function',
  seniority: 'Seniority',
  experience: 'Experience',
  country: 'Country',
  city: 'City',
  preferredLanguage: 'Preferred language',
  goals: 'Goals',
  weeklyMinutes: 'Weekly time',
  email: 'Email',
  mobile: 'Mobile',
  accessibilityRequest: 'Accessibility request',
  captionsPreference: 'Captions preference',
}

/** The brief §11 permission matrix, as the server enforces it. Authorised admin only. */
export function RolesPage() {
  const query = useQuery(permissionsQuery())
  const reduce = useReducedMotion()

  return (
    <ManagePage
      title="Roles and permissions"
      description="What each role may do, as the API enforces it. Hiding a button is never the check: every rule below is applied in the data layer."
    >
      <Reveal>
        <Panel
          bodyClassName="p-0"
          title="Permission matrix"
          description="The nine brief rows first, then the operational rights the journeys need."
        >
          {query.isPending ? (
            <TableSkeleton rows={10} cols={4} />
          ) : query.isError ? (
            <div className="p-6">
              <ErrorPanel error={query.error} onRetry={() => query.refetch()} />
            </div>
          ) : (
            <TableFrame label="Permission matrix">
              <Table>
                <TableHeader>
                  <TableRow className="bg-sand/60 hover:bg-sand/60">
                    <TableHead className="w-[28%] ps-6">Action</TableHead>
                    {ROLES.map((r) => (
                      <TableHead key={r} className="w-[24%]">
                        {ROLE_TITLE[r]}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {query.data.rows.map((row, i) => {
                    const firstOperational = !row.fromBrief && query.data.rows[i - 1]?.fromBrief
                    return (
                      <motion.tr
                        key={row.action}
                        initial={reduce ? false : { opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.025 }}
                        className={cn(
                          'border-b align-top',
                          firstOperational && 'border-t-4 border-t-sand-deep',
                        )}
                      >
                        <TableCell className="ps-6 whitespace-normal">
                          <p className="font-medium text-ink">{row.label}</p>
                          <p className="text-xs text-muted-foreground">
                            {row.fromBrief ? 'Brief permission matrix' : 'Operational right'}
                          </p>
                        </TableCell>
                        {ROLES.map((role) => {
                          const access = ACCESS[row[role] as Access]
                          return (
                            <TableCell key={role} className="whitespace-normal">
                              <p
                                className={cn(
                                  'flex items-center gap-1.5 text-sm font-medium',
                                  access.cls,
                                )}
                              >
                                <access.Icon className="size-4 shrink-0" aria-hidden />{' '}
                                {access.label}
                              </p>
                              {row.note[role] !== 'No' ? (
                                <p className="mt-0.5 text-xs text-muted-foreground">
                                  {row.note[role]}
                                </p>
                              ) : null}
                            </TableCell>
                          )
                        })}
                      </motion.tr>
                    )
                  })}
                </TableBody>
              </Table>
            </TableFrame>
          )}
        </Panel>
      </Reveal>

      {query.data ? (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <Reveal>
            <Panel
              title="Learner field visibility"
              description="Fields a role may see about a learner. Anything not listed is stripped by the API, including in exports."
            >
              <div className="grid gap-4 md:grid-cols-3">
                {query.data.fields.map((f) => (
                  <div key={f.role} className="grid content-start gap-2 rounded-xl border p-4">
                    <p className="font-display text-lg text-ink">{ROLE_TITLE[f.role]}</p>
                    <p className="text-xs text-muted-foreground">
                      {f.role === 'learner'
                        ? 'Own record'
                        : f.role === 'trainer'
                          ? 'Assigned learners'
                          : 'Authorised reports'}
                    </p>
                    <ul className="flex flex-wrap gap-1.5">
                      {f.fields.map((field) => (
                        <li
                          key={field}
                          className="rounded-full bg-teal-mist px-2 py-0.5 text-xs text-teal-deep"
                        >
                          {FIELD_LABEL[field] ?? humanise(field)}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-xs text-muted-foreground">
                Admin contact fields (email) are controlled: visible in user management detail,
                never in report exports. No real identity data or QID exists in this demo.
              </p>
            </Panel>
          </Reveal>
          <Reveal delay={0.05}>
            <div className="grid h-full gap-6">
              <Panel title="Blocked export">
                <p className="flex items-start gap-3 rounded-xl bg-maroon-mist p-4 text-sm text-maroon-deep">
                  <ShieldAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
                  {query.data.blockedExportMessage}
                </p>
                <p className="mt-3 text-xs text-muted-foreground">
                  Shown, and enforced by the API, when a role without export rights requests learner
                  data. Every denied attempt is audited.
                </p>
              </Panel>
              <Panel>
                <p className="flex items-start gap-3 text-sm text-muted-foreground">
                  <Lock className="mt-0.5 size-4 shrink-0 text-teal" aria-hidden />
                  The matrix is fixed for this trial. Role changes and trainer programme approvals
                  are made in User and Trainer management, by an authorised administrator, and
                  recorded in the audit trail.
                </p>
              </Panel>
            </div>
          </Reveal>
        </div>
      ) : null}
    </ManagePage>
  )
}
