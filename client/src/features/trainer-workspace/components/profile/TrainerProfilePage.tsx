import { useQuery } from '@tanstack/react-query'
import { Award, Building2, Languages } from 'lucide-react'
import { ArchFrame } from '@/components/brand/ArchFrame'
import { PageHeader } from '@/components/layout/PageHeader'
import { Reveal } from '@/components/motion/Reveal'
import { Badge } from '@/components/ui/badge'
import { QueryErrorPanel } from '@/features/sessions/components/QueryErrorPanel'
import { initials } from '@/features/sessions/utils/session-labels'
import { profileQuery } from '../../queries/trainer.queries'
import { WorkspaceSkeleton } from '../shared/WorkspaceSkeleton'

/** Trainer profile (brief §16), with the visible fictional-data note. */
export function TrainerProfilePage() {
  const profile = useQuery(profileQuery())
  if (profile.isPending) return <WorkspaceSkeleton rows={2} />
  if (profile.isError)
    return <QueryErrorPanel error={profile.error} onRetry={() => profile.refetch()} />
  const p = profile.data
  return (
    <>
      <PageHeader title="Profile" description="How learners see you in the session catalogue." />
      <div className="grid gap-8 lg:grid-cols-[18rem_1fr]">
        <Reveal className="mx-auto w-full max-w-72">
          <ArchFrame className="aspect-[4/5] overflow-hidden bg-teal">
            {p.avatarPath ? (
              <img
                src={p.avatarPath}
                alt={`Portrait of ${p.fullName}`}
                className="size-full object-cover"
              />
            ) : (
              <div className="flex size-full items-center justify-center bg-gradient-to-b from-teal to-teal-deep">
                <span className="font-display text-7xl font-light text-white">
                  {initials(p.fullName)}
                </span>
              </div>
            )}
          </ArchFrame>
        </Reveal>
        <Reveal className="flex flex-col gap-5">
          <div>
            <p className="text-sm text-muted-foreground">Trainer {p.code}</p>
            <h2 className="font-display text-4xl font-light text-ink">{p.fullName}</h2>
            <p className="text-lg text-ink-soft">{p.headline}</p>
          </div>
          <p className="max-w-[65ch] text-ink-soft">{p.bio}</p>
          <dl className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
            <div className="rounded-xl border bg-card p-4">
              <dt className="flex items-center gap-2 text-xs text-muted-foreground">
                <Languages aria-hidden className="size-4 text-teal" /> Languages
              </dt>
              <dd className="mt-1 text-sm">{p.languages.join(' and ')}</dd>
            </div>
            <div className="rounded-xl border bg-card p-4">
              <dt className="flex items-center gap-2 text-xs text-muted-foreground">
                <Building2 aria-hidden className="size-4 text-teal" /> Provider
              </dt>
              <dd className="mt-1 text-sm">{p.organisation}</dd>
            </div>
            <div className="rounded-xl border bg-card p-4">
              <dt className="flex items-center gap-2 text-xs text-muted-foreground">
                <Award aria-hidden className="size-4 text-teal" /> Sessions delivered
              </dt>
              <dd className="mt-1 font-display text-2xl tabular-nums">{p.sessionsDelivered}</dd>
            </div>
          </dl>
          <div className="flex flex-wrap gap-2">
            {p.expertise.map((e) => (
              <Badge key={e} variant="outline" className="border-teal/30 text-teal-deep">
                {e}
              </Badge>
            ))}
          </div>
          <p className="text-sm text-ink-soft">
            Approved programmes:{' '}
            {p.programmes.map((pr) => `Program ${pr.code} (${pr.title})`).join(', ')}. Programme
            changes are made by an Academy administrator.
          </p>
          <p className="rounded-lg border border-maroon/15 bg-maroon-mist px-3 py-2 text-sm text-maroon-deep">
            Fictional trainer profile for this demonstration. Names, bios and providers are not real
            people or organisations.
          </p>
        </Reveal>
      </div>
    </>
  )
}
