import { Route as RouteIcon } from 'lucide-react'
import { useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { tr } from '@/i18n/localised'
import { type PathRevision, useAcceptRevision } from '../queries/profile.queries'

/**
 * Offers the revised recommended path after a role or organisation change (brief §4). Nothing
 * moves until the learner accepts, and completed work is never deleted.
 */
export function RevisionNotice({ revisions }: { revisions: PathRevision[] }) {
  const { t, i18n } = useTranslation('learner')
  const accept = useAcceptRevision()
  const [kept, setKept] = useState<string[]>([])
  const visible = revisions.filter((r) => !kept.includes(r.enrolmentId))
  if (visible.length === 0) return null
  return (
    <div className="grid gap-3" aria-live="polite">
      {visible.map((revision) => (
        <section
          key={revision.enrolmentId}
          aria-label={t('profile.revision.ariaLabel', { programme: revision.programme })}
          className="grid gap-4 rounded-xl border border-teal/25 bg-teal-mist p-5 md:grid-cols-[auto_1fr_auto] md:items-center"
        >
          <RouteIcon aria-hidden className="size-6 text-teal" />
          <div className="grid gap-1 text-sm">
            <p className="font-medium text-teal-deep">
              {t('profile.revision.title', { programme: revision.programme })}
            </p>
            <p>
              <Trans
                t={t}
                i18nKey="profile.revision.matches"
                values={{ path: tr(revision.suggestedPath, i18n.language) }}
                components={{ strong: <strong /> }}
              />
              {revision.currentPath
                ? t('profile.revision.insteadOf', { path: tr(revision.currentPath, i18n.language) })
                : ''}
              {t('profile.revision.completedStay')}
            </p>
            <p className="text-muted-foreground text-xs">{revision.reason}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              disabled={accept.isPending}
              onClick={async () => {
                try {
                  await accept.mutateAsync(revision.programme)
                  toast.success(
                    t('profile.revision.switched', {
                      programme: revision.programme,
                      path: tr(revision.suggestedPath, i18n.language),
                    }),
                  )
                } catch {
                  toast.error(t('profile.revision.switchFailed'))
                }
              }}
            >
              {t('profile.revision.switch')}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setKept((k) => [...k, revision.enrolmentId])}
            >
              {t('profile.revision.keep')}
            </Button>
          </div>
        </section>
      ))}
    </div>
  )
}
