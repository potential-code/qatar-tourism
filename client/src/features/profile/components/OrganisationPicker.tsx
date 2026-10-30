import type { OrganisationType } from '@shared/constants'
import { useQuery } from '@tanstack/react-query'
import { Building2, Check, PenLine, Search, X } from 'lucide-react'
import { useDeferredValue, useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { tr } from '@/i18n/localised'
import { cn } from '@/lib/utils'
import { type OrganisationOption, organisationsQuery } from '../queries/profile.queries'
import { useOptionLabels } from '../utils/options'

export type OrganisationChoice =
  | { kind: 'existing'; id: string; name: string; type: OrganisationType; isPseudo: boolean }
  | { kind: 'other' }

/**
 * Organisation search (brief §4): fictional organisations, "Independent professional",
 * "Not currently employed", or Other with a typed name.
 */
export function OrganisationPicker({
  id,
  selectedName,
  isOther,
  onChoose,
  error,
}: {
  id: string
  selectedName: string
  isOther: boolean
  onChoose: (choice: OrganisationChoice) => void
  error?: string
}) {
  const { t, i18n } = useTranslation('learner')
  const labels = useOptionLabels()
  const listId = useId()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(!selectedName && !isOther)
  const deferred = useDeferredValue(query.trim())
  const { data, isPending, isError, refetch } = useQuery({
    ...organisationsQuery(deferred),
    enabled: open,
  })

  if (!open && (selectedName || isOther)) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-lg border border-teal/30 bg-teal-mist px-4 py-3">
        <span className="inline-flex items-center gap-2 font-medium text-sm text-teal-deep">
          {isOther ? (
            <PenLine aria-hidden className="size-4" />
          ) : (
            <Building2 aria-hidden className="size-4" />
          )}
          {isOther ? t('profile.org.other') : tr(selectedName, i18n.language)}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label={t('profile.org.changeLabel')}
          onClick={() => setOpen(true)}
        >
          {t('profile.org.change')}
        </Button>
      </div>
    )
  }

  const named = data?.filter((o) => !o.isPseudo) ?? []
  const pseudo = data?.filter((o) => o.isPseudo) ?? []
  const pick = (org: OrganisationOption) => {
    onChoose({
      kind: 'existing',
      id: org.id,
      name: org.name,
      type: org.type,
      isPseudo: org.isPseudo,
    })
    setOpen(false)
    setQuery('')
  }

  return (
    <div
      className={cn(
        'grid gap-2 rounded-xl border bg-white p-2',
        error ? 'border-destructive' : 'border-ink/10',
      )}
    >
      <div className="relative">
        <Search
          aria-hidden
          className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          id={id}
          aria-controls={listId}
          aria-describedby={error ? `${id}-error` : undefined}
          placeholder={t('profile.org.placeholder')}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="h-11 border-0 bg-sand ps-9 shadow-none"
        />
        {selectedName || isOther ? (
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label={t('profile.org.keepLabel')}
            className="absolute end-2 top-1/2 inline-flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:text-ink"
          >
            <X aria-hidden className="size-4" />
          </button>
        ) : null}
      </div>
      <ul
        id={listId}
        aria-label={t('profile.org.listLabel')}
        aria-live="polite"
        className="grid max-h-64 gap-0.5 overflow-y-auto"
      >
        {isPending ? (
          <li className="px-3 py-2 text-muted-foreground text-sm">{t('profile.org.searching')}</li>
        ) : isError ? (
          <li className="flex items-center justify-between px-3 py-2 text-sm">
            {t('profile.org.loadFailed')}
            <Button type="button" variant="link" size="sm" onClick={() => refetch()}>
              {t('profile.common.tryAgain')}
            </Button>
          </li>
        ) : (
          <>
            {named.length === 0 ? (
              <li className="px-3 py-2 text-muted-foreground text-sm">
                {t('profile.org.noMatch', { query: deferred })}
              </li>
            ) : null}
            {named.map((org) => (
              <li key={org.id}>
                <button
                  type="button"
                  onClick={() => pick(org)}
                  aria-pressed={org.name === selectedName}
                  className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-start text-sm hover:bg-teal-mist focus-visible:bg-teal-mist focus-visible:outline-none"
                >
                  <span>
                    <span className="block font-medium">{tr(org.name, i18n.language)}</span>
                    <span className="text-muted-foreground text-xs">
                      {labels.organisationType[org.type]}
                      {org.city ? `, ${org.city}` : ''}
                    </span>
                  </span>
                  {org.name === selectedName ? (
                    <Check aria-hidden className="size-4 text-teal" />
                  ) : null}
                </button>
              </li>
            ))}
            <li aria-hidden className="mx-3 my-1 h-px bg-ink/10" />
            {pseudo.map((org) => (
              <li key={org.id}>
                <button
                  type="button"
                  onClick={() => pick(org)}
                  className="w-full rounded-lg px-3 py-2.5 text-start font-medium text-sm hover:bg-teal-mist focus-visible:bg-teal-mist focus-visible:outline-none"
                >
                  {tr(org.name, i18n.language)}
                </button>
              </li>
            ))}
            <li>
              <button
                type="button"
                onClick={() => {
                  onChoose({ kind: 'other' })
                  setOpen(false)
                }}
                className="inline-flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-start font-medium text-sm hover:bg-teal-mist focus-visible:bg-teal-mist focus-visible:outline-none"
              >
                <PenLine aria-hidden className="size-4 text-teal" />
                {t('profile.org.enterOwn')}
              </button>
            </li>
          </>
        )}
      </ul>
    </div>
  )
}
