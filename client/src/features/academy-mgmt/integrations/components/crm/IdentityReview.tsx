import { useMutation, useQuery } from '@tanstack/react-query'
import { UserSearch } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  type IdentityCandidate,
  type IdentityReviewItem,
  linkCrmIdentity,
  searchLearners,
} from '@/services/crm-mapping.service'
import { Panel } from '../../../hub/components/Panel'
import { StatusPill } from '../../../hub/components/StatusPill'
import { identityReviewQuery, useIntegrationMutation } from '../../queries/integrations.queries'

function Candidate({
  item,
  c,
  onLinked,
}: {
  item: IdentityReviewItem
  c: IdentityCandidate
  onLinked: () => void
}) {
  const link = useIntegrationMutation(
    () =>
      linkCrmIdentity(
        item.mappingId,
        c.userId,
        `Confirmed match with ${c.display} (${c.basis.toLowerCase()})`,
      ),
    `Linked ${item.externalLearnerId} to ${c.display}. No account was created.`,
  )
  return (
    <li className="grid gap-2 rounded-lg border bg-card p-3 text-sm sm:grid-cols-[1fr_auto] sm:items-center">
      <div className="grid gap-0.5">
        <p className="font-medium text-ink">
          {c.name} ({c.display})
        </p>
        <p className="text-xs text-muted-foreground">
          {c.email} · {c.basis}
        </p>
        {c.linkedTo ? (
          <p className="text-xs text-destructive">
            Already linked to {c.linkedTo}. Linking again would create a duplicate.
          </p>
        ) : null}
      </div>
      <Button
        size="sm"
        variant="outline"
        disabled={Boolean(c.linkedTo) || link.isPending}
        onClick={() => link.mutate(undefined, { onSuccess: onLinked })}
        aria-label={`Link ${item.externalLearnerId} to ${c.display}`}
      >
        Link to this learner
      </Button>
    </li>
  )
}

function ReviewItem({ item }: { item: IdentityReviewItem }) {
  const [term, setTerm] = useState('')
  const search = useMutation({ mutationFn: (q: string) => searchLearners(q) })
  return (
    <li className="grid gap-3 rounded-xl border p-4">
      <div className="flex flex-wrap items-center gap-3">
        <p className="font-medium text-ink">{item.externalLearnerId}</p>
        <StatusPill tone="warn">Needs review</StatusPill>
        {item.crmRecord ? (
          <span className="text-sm text-muted-foreground">
            CRM record: {item.crmRecord.name}, {item.crmRecord.email}
          </span>
        ) : null}
      </div>
      {item.waitingEvents.length > 0 ? (
        <p className="text-xs text-muted-foreground">
          Waiting events: {item.waitingEvents.join(', ')}
        </p>
      ) : null}
      <div>
        <p className="mb-1.5 text-sm font-medium text-ink">Proposed matches</p>
        {item.candidates.length > 0 ? (
          <ul className="grid gap-2">
            {item.candidates.map((c) => (
              <Candidate key={c.userId} item={item} c={c} onLinked={() => search.reset()} />
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            No proposed match. Search by name, email or learner ID.
          </p>
        )}
      </div>
      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          search.mutate(term)
        }}
      >
        <div className="grid min-w-52 grow gap-1.5">
          <label htmlFor={`search-${item.mappingId}`} className="text-sm font-medium text-ink">
            Search existing learners
          </label>
          <Input
            id={`search-${item.mappingId}`}
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Name, email or LRN-0042"
          />
        </div>
        <Button
          type="submit"
          variant="outline"
          disabled={search.isPending || term.trim().length < 2}
        >
          <UserSearch /> Search
        </Button>
      </form>
      {search.data ? (
        search.data.length > 0 ? (
          <ul className="grid gap-2">
            {search.data.map((c) => (
              <Candidate key={c.userId} item={item} c={c} onLinked={() => search.reset()} />
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            No learner found. A new account is never created from a CRM record.
          </p>
        )
      ) : null}
    </li>
  )
}

/** The identity review queue for missing or ambiguous matches. A duplicate is never created. */
export function IdentityReview() {
  const query = useQuery(identityReviewQuery())
  return (
    <Panel
      title="Identity review queue"
      description="CRM records with a missing or ambiguous match wait here. Match them to an existing learner; no duplicate account is created."
    >
      {query.isPending ? (
        <p className="text-sm text-muted-foreground">Loading the queue</p>
      ) : query.isError ? (
        <p role="alert" className="text-sm text-destructive">
          The queue could not be loaded.
        </p>
      ) : query.data.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nothing to review. Every CRM record is matched.
        </p>
      ) : (
        <ul className="grid gap-4">
          {query.data.map((item) => (
            <ReviewItem key={item.mappingId} item={item} />
          ))}
        </ul>
      )}
    </Panel>
  )
}
