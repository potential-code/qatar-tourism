import { Link } from '@tanstack/react-router'
import { ArrowUpRight, Clock, Layers, Users } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { programmeSlug } from '../content'
import type { PublicProgramme } from '../queries/programmes.queries'
import { PROGRAMME_TONE } from '../tone'
import { programmeLetter, programmeName, programmeText } from '../utils/copy'
import { CertificationStatus } from './CertificationStatus'
import { IllustrativeTag } from './IllustrativeTag'

const EASE = 'ease-[cubic-bezier(0.22,1,0.36,1)]'

/**
 * Homepage programme card (brief §2): image, title, audience, format, duration, certification,
 * action. The programme letter sits large over the photograph; the whole card is the link.
 *
 * Hover is smooth because nothing under the pointer moves out from under it: the outer element
 * holds still and owns `group`, the inner surface lifts (transform only, GPU-composited), and the
 * coloured glow is a pre-rendered shadow layer that fades in rather than an animated box-shadow.
 */
export function ProgrammeShowcaseCard({
  programme,
  className,
}: {
  programme: PublicProgramme
  className?: string
}) {
  const { t } = useTranslation('public')
  const tone = PROGRAMME_TONE[programme.code]
  const text = (field: string) => programmeText(t, programme.code, field)
  return (
    <article className={cn('group relative h-full', className)}>
      <div
        aria-hidden
        className={cn(
          'absolute inset-x-4 top-6 bottom-0 rounded-[1.75rem] opacity-0 transition-opacity duration-500 group-hover:opacity-100 motion-reduce:transition-none',
          tone.glow,
        )}
      />
      <div
        className={cn(
          'qt-card-elevated relative flex h-full transform-gpu flex-col overflow-hidden rounded-[1.75rem] transition-transform duration-500 backface-hidden group-hover:-translate-y-2.5 motion-reduce:transition-none motion-reduce:group-hover:translate-y-0',
          EASE,
        )}
      >
        <span
          aria-hidden
          className={cn(
            'absolute inset-x-0 top-0 z-10 h-1.5 origin-top transition-transform duration-500 group-hover:scale-y-[1.7]',
            EASE,
            tone.bar,
          )}
        />
        <div className="relative aspect-[4/3] overflow-hidden">
          <img
            src={programme.cardImagePath ?? '/images/official/city-view.jpg'}
            alt=""
            loading="lazy"
            className={cn(
              'size-full transform-gpu object-cover transition-transform duration-[1100ms] group-hover:scale-[1.06]',
              EASE,
            )}
          />
          <div
            aria-hidden
            className={cn('absolute inset-0 bg-gradient-to-t to-transparent', tone.wash)}
          />
          <span
            aria-hidden
            className={cn(
              'absolute start-6 -bottom-4 font-display font-light text-[7.5rem] text-white leading-none drop-shadow-lg transition-transform duration-700 group-hover:-translate-y-2 rtl:leading-[1.2]',
              EASE,
            )}
          >
            {programmeLetter(t, programme.code)}
          </span>
          <span className="absolute end-4 top-5 inline-flex items-center rounded-full bg-white/90 px-3.5 py-1.5 font-medium text-ink text-xs shadow-md">
            {programmeName(t, programme.code)}
          </span>
        </div>

        <div className="flex flex-1 flex-col gap-5 p-6 md:p-7">
          {programme.isIllustrative ? <IllustrativeTag className="w-fit" /> : null}
          <h3 className="font-display font-normal text-[1.7rem] text-ink leading-tight">
            {text('title')}
          </h3>
          <p className="text-muted-foreground text-sm leading-relaxed">{text('summary')}</p>
          {/* dt/dd groups sit directly in the dl (one wrapping div each), as the spec requires. */}
          <dl className="flex flex-wrap gap-2 text-ink/80 text-sm">
            <div className="flex w-full items-start gap-2 pb-0.5">
              <dt className="sr-only">{t('programme.audience')}</dt>
              <Users aria-hidden className={cn('mt-0.5 size-4 shrink-0', tone.icon)} />
              <dd>{text('audience')}</dd>
            </div>
            <div
              className={cn('inline-flex items-center gap-1.5 rounded-full px-3 py-1', tone.chip)}
            >
              <dt className="sr-only">{t('programme.format')}</dt>
              <Layers aria-hidden className="size-3.5 shrink-0" />
              <dd>{text('formatLabel')}</dd>
            </div>
            <div
              className={cn('inline-flex items-center gap-1.5 rounded-full px-3 py-1', tone.chip)}
            >
              <dt className="sr-only">{t('programme.duration')}</dt>
              <Clock aria-hidden className="size-3.5 shrink-0" />
              <dd>{text('durationLabel')}</dd>
            </div>
            <div className="mt-0.5 flex w-full items-start gap-2 border-ink/5 border-t pt-3 text-ink">
              <dt className="sr-only">{t('programme.certification')}</dt>
              <dd className={tone.icon}>
                <CertificationStatus
                  certified={programme.certificationEnabled}
                  illustrative={programme.isIllustrative}
                  className="text-ink"
                />
              </dd>
            </div>
          </dl>
          <Link
            to="/programmes/$code"
            params={{ code: programmeSlug(programme.code) }}
            className={cn(
              'mt-auto inline-flex h-12 w-full items-center justify-between rounded-full ps-6 pe-1.5 font-medium text-sm transition-colors duration-300 after:absolute after:inset-0 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
              tone.cta,
            )}
          >
            {t('programme.viewProgramme')}
            <span
              className={cn(
                'inline-flex size-9 items-center justify-center rounded-full bg-white/20 transition-transform duration-500 group-hover:rotate-45 rtl:group-hover:-rotate-45',
                EASE,
              )}
            >
              <ArrowUpRight aria-hidden className="size-4 rtl:-scale-x-100" />
            </span>
          </Link>
        </div>
      </div>
    </article>
  )
}
