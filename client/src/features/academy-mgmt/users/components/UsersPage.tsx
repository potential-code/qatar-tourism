import { PROGRAMME_LABELS } from '@shared/schemas/admin-labels'
import type { AdminUserListQuery } from '@shared/schemas/admin-users'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { ChevronRight, Search, UserPlus, UsersRound } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { useEffect, useState } from 'react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ManagePage } from '../../hub/components/ManagePage'
import { OptionSelect, optionsOf } from '../../hub/components/OptionSelect'
import { Pager } from '../../hub/components/Pager'
import { ErrorPanel, TableSkeleton } from '../../hub/components/QueryStates'
import { StatusPill } from '../../hub/components/StatusPill'
import { TableFrame } from '../../hub/components/TableFrame'
import { initials, qDate } from '../../hub/utils/format'
import { usersListQuery } from '../queries/users.queries'
import { ACCOUNT_STATUS, ROLE_LABEL } from '../utils/status'
import { LearnerFormDialog } from './LearnerFormDialog'

export type UsersSearch = Partial<AdminUserListQuery>

export function UsersPage({
  search,
  onSearch,
}: {
  search: UsersSearch
  onSearch: (next: UsersSearch) => void
}) {
  const query = useQuery(usersListQuery(search))
  const navigate = useNavigate()
  const reduce = useReducedMotion()
  const [text, setText] = useState(search.search ?? '')
  const [adding, setAdding] = useState(false)

  // Debounced free-text search, kept in the URL so a filtered view can be shared.
  useEffect(() => {
    const id = setTimeout(() => {
      if ((search.search ?? '') !== text)
        onSearch({ ...search, search: text || undefined, page: 1 })
    }, 300)
    return () => clearTimeout(id)
  }, [text, search, onSearch])

  const open = (userId: string) =>
    navigate({ to: '/admin/manage/users/$userId', params: { userId } })
  const filtered = Boolean(search.search || search.role || search.status || search.programme)

  return (
    <ManagePage
      title="User management"
      description="Every account in the Academy. Add a fictional learner, invite them through the demo log and follow their journey."
      actions={
        <Button onClick={() => setAdding(true)}>
          <UserPlus /> Add learner
        </Button>
      }
    >
      <section className="overflow-hidden rounded-xl border bg-card shadow-xs">
        <div className="flex flex-wrap items-end gap-3 border-b border-border/70 px-6 py-4">
          <div className="relative min-w-72 flex-1">
            <Search
              aria-hidden
              className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Search by name, email or learner ID"
              aria-label="Search users"
              className="h-10 rounded-lg ps-9"
            />
          </div>
          <OptionSelect
            ariaLabel="Role"
            className="h-10 w-40 rounded-lg bg-white"
            value={search.role}
            onChange={(v) =>
              onSearch({ ...search, role: (v ?? undefined) as UsersSearch['role'], page: 1 })
            }
            options={optionsOf(ROLE_LABEL)}
            allowNone
            noneLabel="All roles"
          />
          <OptionSelect
            ariaLabel="Account status"
            className="h-10 w-40 rounded-lg bg-white"
            value={search.status}
            onChange={(v) =>
              onSearch({ ...search, status: (v ?? undefined) as UsersSearch['status'], page: 1 })
            }
            options={Object.entries(ACCOUNT_STATUS).map(([value, s]) => ({
              value,
              label: s.label,
            }))}
            allowNone
            noneLabel="All statuses"
          />
          <OptionSelect
            ariaLabel="Programme"
            className="h-10 w-44 rounded-lg bg-white"
            value={search.programme}
            onChange={(v) =>
              onSearch({
                ...search,
                programme: (v ?? undefined) as UsersSearch['programme'],
                page: 1,
              })
            }
            options={optionsOf(PROGRAMME_LABELS)}
            allowNone
            noneLabel="All programmes"
          />
          {filtered ? (
            <Button
              variant="ghost"
              onClick={() => {
                setText('')
                onSearch({ pageSize: search.pageSize })
              }}
            >
              Reset filters
            </Button>
          ) : null}
        </div>

        {query.isPending ? (
          <TableSkeleton cols={6} />
        ) : query.isError ? (
          <div className="p-6">
            <ErrorPanel error={query.error} onRetry={() => query.refetch()} />
          </div>
        ) : query.data.items.length === 0 ? (
          <EmptyState
            icon={UsersRound}
            title="No accounts match these filters"
            description="Try a different name or learner ID, or reset the filters."
            action={
              <Button variant="outline" onClick={() => onSearch({ pageSize: search.pageSize })}>
                Reset filters
              </Button>
            }
          />
        ) : (
          <TableFrame label="Accounts">
            <Table>
              <TableHeader>
                <TableRow className="bg-sand/60 hover:bg-sand/60">
                  <TableHead className="ps-6">Person</TableHead>
                  <TableHead>Organisation</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Programmes</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last activity</TableHead>
                  <TableHead className="w-10 pe-6">
                    <span className="sr-only">Open</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {query.data.items.map((row, index) => {
                  const status = ACCOUNT_STATUS[row.status] ?? {
                    label: row.status,
                    tone: 'neutral' as const,
                  }
                  return (
                    <motion.tr
                      key={row.id}
                      initial={reduce ? false : { opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(index, 12) * 0.02, duration: 0.3 }}
                      className="group cursor-pointer border-b transition-colors hover:bg-teal-mist/40"
                      onClick={() => open(row.id)}
                    >
                      <TableCell className="ps-6">
                        <div className="flex items-center gap-3">
                          <Avatar className="size-9">
                            <AvatarFallback className="bg-teal-mist text-xs font-medium text-teal-deep">
                              {initials(row.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="grid">
                            <button
                              type="button"
                              className="text-start font-medium text-ink hover:text-teal focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                              onClick={(e) => {
                                e.stopPropagation()
                                open(row.id)
                              }}
                            >
                              {row.name}
                            </button>
                            <span className="text-xs text-muted-foreground tabular-nums">
                              {row.learnerCode ?? 'Staff account'}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-56 truncate text-sm">
                        {row.organisation ?? 'Not specified'}
                      </TableCell>
                      <TableCell className="text-sm">{ROLE_LABEL[row.role] ?? row.role}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {row.programmes.length ? (
                            row.programmes.map((p) => (
                              <Badge
                                key={p}
                                variant="outline"
                                className="border-teal/30 text-teal-deep"
                              >
                                {p}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-xs text-muted-foreground">None</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <StatusPill tone={status.tone}>{status.label}</StatusPill>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground tabular-nums">
                        {row.lastActivityAt ? qDate(row.lastActivityAt) : 'No activity yet'}
                      </TableCell>
                      <TableCell className="pe-6">
                        <ChevronRight
                          aria-hidden
                          className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-teal"
                        />
                      </TableCell>
                    </motion.tr>
                  )
                })}
              </TableBody>
            </Table>
          </TableFrame>
        )}
        {query.data && query.data.total > 0 ? (
          <Pager
            page={search.page ?? 1}
            pageSize={search.pageSize ?? 25}
            total={query.data.total}
            noun="accounts"
            onPage={(page) => onSearch({ ...search, page })}
            onPageSize={(pageSize) => onSearch({ ...search, pageSize, page: 1 })}
          />
        ) : null}
      </section>
      <LearnerFormDialog open={adding} onOpenChange={setAdding} onCreated={open} />
    </ManagePage>
  )
}
