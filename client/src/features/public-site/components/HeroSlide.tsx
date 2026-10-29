import { motion, useAnimate } from 'motion/react'
import { useEffect, useRef } from 'react'

/**
 * One hero photograph with a slow Ken Burns drift. The drift is a single long animation whose
 * controls pause and resume with the hero's pause button (brief §2: pause controls for
 * continuous motion). Static under reduced motion.
 */
export function HeroSlide({
  src,
  alt,
  active,
  paused,
  reduce,
  direction,
  priority,
}: {
  src: string
  alt: string
  active: boolean
  paused: boolean
  reduce: boolean
  direction: 1 | -1
  priority: boolean
}) {
  const [scope, animate] = useAnimate<HTMLImageElement>()
  const controls = useRef<ReturnType<typeof animate> | null>(null)

  useEffect(() => {
    if (reduce || !active) return
    controls.current = animate(
      scope.current,
      { scale: [1.04, 1.16], x: ['0%', `${direction * 2.5}%`] },
      { duration: 14, ease: [0.45, 0, 0.55, 1] },
    )
    return () => controls.current?.stop()
  }, [active, reduce, animate, scope, direction])

  useEffect(() => {
    if (paused) controls.current?.pause()
    else controls.current?.play()
  }, [paused])

  return (
    <motion.div
      aria-hidden={!active}
      initial={false}
      // Hidden slides go `visibility: hidden` once faded, so the browser stops compositing them.
      animate={
        active
          ? { opacity: 1, visibility: 'visible' }
          : { opacity: 0, transitionEnd: { visibility: 'hidden' } }
      }
      transition={{ duration: reduce ? 0 : 1.4, ease: [0.22, 1, 0.36, 1] }}
      className="absolute inset-0"
    >
      <img
        ref={scope}
        src={src}
        alt={active ? alt : ''}
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : 'auto'}
        className="size-full origin-center object-cover"
      />
    </motion.div>
  )
}
