import { Link } from '@tanstack/react-router'
import { FlaskConical } from 'lucide-react'
import { Logo } from '@/components/brand'

const COLUMNS = [
  {
    title: 'Programmes',
    links: [
      { label: 'Program A: Tourism Service Professional', to: '/programmes/$code', code: 'a' },
      { label: 'Program B: Visitor Service Essentials', to: '/programmes/$code', code: 'b' },
      { label: 'Program C: Destination Storytelling (sample)', to: '/programmes/$code', code: 'c' },
    ],
  },
  {
    title: 'Academy',
    links: [
      { label: 'Upcoming sessions', to: '/sessions' },
      { label: 'Our trainers', to: '/trainers' },
      { label: 'All programmes', to: '/programmes' },
    ],
  },
  {
    title: 'Account',
    links: [
      { label: 'Sign in', to: '/login' },
      { label: 'Create account', to: '/register' },
      { label: 'Sign in as trainer', to: '/login', mode: 'trainer' },
    ],
  },
] as const

/** Footer with the required demonstration notice (brief §2, docs/ARCHITECTURE.md). */
export function PublicFooter() {
  return (
    <footer className="bg-teal-deep text-white">
      <div className="mx-auto grid max-w-[1400px] gap-12 px-4 py-16 md:px-8 lg:grid-cols-[1.2fr_2fr]">
        <div className="grid content-start gap-5">
          <Logo variant="white" withAcademy className="h-10" />
          <p className="max-w-sm text-sm text-white/75 leading-relaxed">
            The Service Excellence Academy brings learning, practice and trainer-led sessions
            together in one place for everyone who welcomes visitors to Qatar.
          </p>
        </div>
        <div className="grid gap-10 sm:grid-cols-3">
          {COLUMNS.map((column) => (
            <nav key={column.title} aria-label={column.title} className="grid content-start gap-3">
              <p className="font-display text-lg">{column.title}</p>
              {column.links.map((link) => (
                <Link
                  key={link.label}
                  to={link.to as never}
                  params={'code' in link ? ({ code: link.code } as never) : undefined}
                  search={'mode' in link ? ({ mode: link.mode } as never) : undefined}
                  className="w-fit text-sm text-white/75 transition-colors hover:text-white"
                >
                  {link.label}
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
            Demonstration environment. All learner and training data is fictional.
          </p>
          <p>Qatar Tourism Academy demonstration</p>
        </div>
      </div>
    </footer>
  )
}
