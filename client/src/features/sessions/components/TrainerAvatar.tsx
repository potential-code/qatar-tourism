import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { initials } from '../utils/session-labels'

export function TrainerAvatar({
  name,
  avatarPath,
  className,
}: {
  name: string
  avatarPath: string | null
  className?: string
}) {
  return (
    <Avatar className={cn('size-9', className)}>
      {avatarPath ? <AvatarImage src={avatarPath} alt="" /> : null}
      <AvatarFallback className="bg-maroon-mist text-xs font-medium text-maroon-deep">
        {initials(name)}
      </AvatarFallback>
    </Avatar>
  )
}
