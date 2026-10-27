import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

/** "Amal Al Nouri" to "AA". */
export function initialsOf(name: string | null | undefined) {
  return (name ?? '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

const TONES = {
  teal: 'bg-teal text-white',
  'teal-mist': 'bg-teal-mist text-teal-deep',
  maroon: 'bg-maroon-mist text-maroon-deep',
  glass: 'bg-white/15 text-white',
} as const

/**
 * A person's portrait (generated trainer and persona portraits, docs/ASSET-INVENTORY.md), or
 * their initials when there is none or it fails to load. Decorative: the name is always shown
 * next to it, so the image has empty alt text.
 */
export function PersonAvatar({
  name,
  src,
  tone = 'teal-mist',
  className,
  fallbackClassName,
}: {
  name: string | null | undefined
  src?: string | null
  tone?: keyof typeof TONES
  className?: string
  fallbackClassName?: string
}) {
  return (
    <Avatar className={cn('size-9 text-xs', className)}>
      {src ? <AvatarImage src={src} alt="" className="object-cover" /> : null}
      <AvatarFallback className={cn('font-medium', TONES[tone], fallbackClassName)}>
        {initialsOf(name)}
      </AvatarFallback>
    </Avatar>
  )
}
