import { Link } from '@tanstack/react-router'
import { FlaskConical } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { CornerPattern, Logo } from '@/components/brand'

type FooterLabel =
  | 'footer.programmeA'
  | 'footer.programmeB'
  | 'footer.programmeC'
  | 'footer.sessions'
  | 'footer.trainers'
  | 'footer.allProgrammes'
  | 'nav.signIn'
  | 'nav.createAccount'
  | 'footer.signInTrainer'

type FooterLink = {
  label: FooterLabel
  to: string
  code?: string
  mode?: string
}

const COLUMNS: readonly {
  id: 'programmes' | 'academy' | 'account'
  title: 'footer.programmes' | 'footer.academy' | 'footer.account'
  links: readonly FooterLink[]
}[] = [
  {
    id: 'programmes',
    title: 'footer.programmes',
    links: [
      { label: 'footer.programmeA', to: '/programmes/$code', code: 'a' },
      { label: 'footer.programmeB', to: '/programmes/$code', code: 'b' },
      { label: 'footer.programmeC', to: '/programmes/$code', code: 'c' },
    ],
  },
  {
    id: 'academy',
    title: 'footer.academy',
    links: [
      { label: 'footer.sessions', to: '/sessions' },
      { label: 'footer.trainers', to: '/trainers' },
      { label: 'footer.allProgrammes', to: '/programmes' },
    ],
  },
  {
    id: 'account',
    title: 'footer.account',
    links: [
      { label: 'nav.signIn', to: '/login' },
      { label: 'nav.createAccount', to: '/register' },
      { label: 'footer.signInTrainer', to: '/login', mode: 'trainer' },
    ],
  },
]

/** Footer with the required demonstration notice (brief §2, docs/ARCHITECTURE.md). */
export function PublicFooter() {
  const { t } = useTranslation('public')
  return (
    <footer className="qt-grain relative isolate overflow-hidden bg-grad-night text-white">
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold to-transparent"
      />
      <CornerPattern side="a" tone="dark" />
      <div className="mx-auto grid max-w-[1400px] gap-12 px-4 py-16 md:px-8 lg:grid-cols-[1.2fr_2fr]">
        <div className="grid content-start gap-5">
          <Logo variant="white" withAcademy className="h-10" />
          <p className="max-w-sm text-sm text-white/75 leading-relaxed">{t('footer.blurb')}</p>
        </div>
        <div className="grid gap-10 sm:grid-cols-3">
          {COLUMNS.map((column) => (
            <nav key={column.id} aria-label={t(column.title)} className="grid content-start gap-3">
              <p className="font-display text-gold-soft text-lg">{t(column.title)}</p>
              {column.links.map((link) => (
                <Link
                  key={link.label}
                  to={link.to as never}
                  params={link.code ? ({ code: link.code } as never) : undefined}
                  search={link.mode ? ({ mode: link.mode } as never) : undefined}
                  className="w-fit text-sm text-white/75 transition-all duration-300 hover:translate-x-1 hover:text-white rtl:hover:-translate-x-1"
                >
                  {t(link.label)}
                </Link>
              ))}
            </nav>
          ))}
        </div>
      </div>
      <div className="border-white/15 border-t">
        <div className="mx-auto flex max-w-[1400px] flex-col gap-3 px-4 py-6 text-sm text-white/80 md:flex-row md:items-center md:justify-between md:px-8">
          <p role="note" className="inline-flex items-center gap-2 font-medium text-white">
            <FlaskConical aria-hidden className="size-4" />
            {t('demoNotice')}
          </p>
          <p>{t('footer.caption')}</p>
        </div>
      </div>
    </footer>
  )
}
