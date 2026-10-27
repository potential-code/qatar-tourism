import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { DemoBadge } from '@/components/layout/DemoBadge'
import { PageHeader } from '@/components/layout/PageHeader'
import { Stagger, StaggerItem } from '@/components/motion'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { programmesListQuery } from '../queries/programmes.queries'
import { ProgrammeCard } from './ProgrammeCard'
import { ProgrammeEditorSheet } from './ProgrammeEditorSheet'

/** Programme management (brief §14): A, B and C with status, structure and certification. */
export function ProgrammesOverview() {
  const query = useQuery(programmesListQuery())
  const [openId, setOpenId] = useState<string | null>(null)
  const open = query.data?.find((p) => p.id === openId) ?? null
  const totals = query.data?.reduce(
    (acc, p) => ({
      enrolments: acc.enrolments + p.enrolments,
      certificates: acc.certificates + p.certificates,
    }),
    { enrolments: 0, certificates: 0 },
  )

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Programme management"
        description="Draft, publish or archive programmes, edit their public card with a live preview, and review structure, assessments and completion rules. Only Program A certifies."
        breadcrumbs={[
          { label: 'Academy Management', to: '/admin/manage' },
          { label: 'Programme management' },
        ]}
        actions={<DemoBadge compact />}
      />

      {totals ? (
        <p className="-mt-4 text-sm text-muted-foreground">
          {totals.enrolments.toLocaleString('en-GB')} enrolments across {query.data?.length}{' '}
          programmes, {totals.certificates.toLocaleString('en-GB')} Program A certificates issued.
        </p>
      ) : null}

      {query.isLoading ? (
        <div className="grid gap-6 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-[440px] rounded-xl" />
          ))}
        </div>
      ) : query.isError ? (
        <EmptyState
          variant="destructive"
          title="Programmes could not be loaded"
          description={query.error.message}
          action={<Button onClick={() => query.refetch()}>Try again</Button>}
        />
      ) : query.data?.length ? (
        <Stagger className="grid gap-6 lg:grid-cols-3">
          {query.data.map((programme) => (
            <StaggerItem key={programme.id} className="h-full">
              <ProgrammeCard programme={programme} onOpen={() => setOpenId(programme.id)} />
            </StaggerItem>
          ))}
        </Stagger>
      ) : (
        <EmptyState
          title="No programmes"
          description="Reset the demo data to restore A, B and C."
        />
      )}

      <ProgrammeEditorSheet programme={open} onOpenChange={(v) => !v && setOpenId(null)} />
    </div>
  )
}
