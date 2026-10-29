import { cn } from '@/lib/utils'

const CORNER = {
  'top-end':
    'top-0 end-0 [mask-image:radial-gradient(farthest-side_at_100%_0,black_15%,transparent_100%)] rtl:[mask-image:radial-gradient(farthest-side_at_0_0,black_15%,transparent_100%)]',
  'top-start':
    'top-0 start-0 [mask-image:radial-gradient(farthest-side_at_0_0,black_15%,transparent_100%)] rtl:[mask-image:radial-gradient(farthest-side_at_100%_0,black_15%,transparent_100%)]',
  'bottom-end':
    'bottom-0 end-0 [mask-image:radial-gradient(farthest-side_at_100%_100%,black_15%,transparent_100%)] rtl:[mask-image:radial-gradient(farthest-side_at_0_100%,black_15%,transparent_100%)]',
  'bottom-start':
    'bottom-0 start-0 [mask-image:radial-gradient(farthest-side_at_0_100%,black_15%,transparent_100%)] rtl:[mask-image:radial-gradient(farthest-side_at_100%_100%,black_15%,transparent_100%)]',
} as const

/**
 * The Islamic star tile peeking in from two opposite corners of a section, fading out towards the
 * centre (the dct-learn treatment). Alternate `side` from one section to the next: `a` is top-end
 * plus bottom-start, `b` is top-start plus bottom-end. Parent must be `relative isolate`.
 */
export function CornerPattern({
  side = 'a',
  tone = 'light',
  className,
}: {
  side?: 'a' | 'b'
  tone?: 'light' | 'dark'
  className?: string
}) {
  const corners =
    side === 'a' ? (['top-end', 'bottom-start'] as const) : (['top-start', 'bottom-end'] as const)
  return (
    <>
      {corners.map((corner) => (
        <div
          key={corner}
          aria-hidden
          className={cn(
            'pointer-events-none absolute -z-10 h-[300px] w-[90%] md:w-[58%]',
            tone === 'dark' ? 'qt-star-tile-dark' : 'qt-star-tile',
            CORNER[corner],
            className,
          )}
        />
      ))}
    </>
  )
}
