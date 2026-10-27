import * as React from 'react'

import { cn } from '@/lib/utils'

type EmptyStateSize = 'sm' | 'default' | 'lg'
type EmptyStateVariant = 'default' | 'destructive' | 'success' | 'warning' | 'info'

/** A lucide icon component, or any pre-rendered node. */
type EmptyStateIcon = React.ComponentType<{ className?: string }> | React.ReactNode

export interface EmptyStateProps extends Omit<React.ComponentPropsWithoutRef<'div'>, 'title'> {
  icon?: EmptyStateIcon
  title?: React.ReactNode
  description?: React.ReactNode
  /** Primary call to action (usually a `Button`). */
  action?: React.ReactNode
  /** Secondary call to action rendered beside `action`. */
  secondaryAction?: React.ReactNode
  size?: EmptyStateSize
  /** Tints the icon bubble; content colours stay neutral. */
  variant?: EmptyStateVariant
}

const sizeClasses: Record<EmptyStateSize, string> = {
  sm: 'gap-2 px-4 py-6',
  default: 'gap-3 px-6 py-10',
  lg: 'gap-4 px-8 py-16',
}

const iconWrapClasses: Record<EmptyStateSize, string> = {
  sm: 'size-9 [&_svg]:size-4',
  default: 'size-12 [&_svg]:size-5',
  lg: 'size-16 [&_svg]:size-7',
}

const variantClasses: Record<EmptyStateVariant, string> = {
  default: 'bg-muted text-muted-foreground',
  destructive: 'bg-destructive/10 text-destructive',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  info: 'bg-info/10 text-info',
}

const titleClasses: Record<EmptyStateSize, string> = {
  sm: 'text-sm',
  default: 'text-base',
  lg: 'text-lg',
}

function renderIcon(icon: EmptyStateIcon | undefined): React.ReactNode {
  if (!icon) return null
  if (React.isValidElement(icon)) return icon
  // Component types: plain functions, and objects such as `forwardRef`/`memo` results.
  if (typeof icon === 'function' || (typeof icon === 'object' && '$$typeof' in icon)) {
    const Icon = icon as React.ComponentType<{ className?: string }>
    return <Icon className="shrink-0" />
  }
  return icon as React.ReactNode
}

const EmptyState = React.forwardRef<HTMLDivElement, EmptyStateProps>(
  (
    {
      className,
      icon,
      title,
      description,
      action,
      secondaryAction,
      size = 'default',
      variant = 'default',
      children,
      ...props
    },
    ref,
  ) => (
    <div
      ref={ref}
      data-slot="empty-state"
      data-size={size}
      data-variant={variant}
      className={cn(
        'flex w-full flex-col items-center justify-center text-center',
        sizeClasses[size],
        className,
      )}
      {...props}
    >
      {icon ? (
        <div
          data-slot="empty-state-icon"
          aria-hidden="true"
          className={cn(
            'flex items-center justify-center rounded-full',
            variantClasses[variant],
            iconWrapClasses[size],
          )}
        >
          {renderIcon(icon)}
        </div>
      ) : null}

      {title ? (
        <div
          data-slot="empty-state-title"
          className={cn('font-heading font-medium text-foreground', titleClasses[size])}
        >
          {title}
        </div>
      ) : null}

      {description ? (
        <div
          data-slot="empty-state-description"
          className="max-w-sm text-sm text-balance text-muted-foreground"
        >
          {description}
        </div>
      ) : null}

      {children}

      {action || secondaryAction ? (
        <div
          data-slot="empty-state-actions"
          className="mt-1 flex flex-wrap items-center justify-center gap-2"
        >
          {action}
          {secondaryAction}
        </div>
      ) : null}
    </div>
  ),
)
EmptyState.displayName = 'EmptyState'

export { EmptyState }
export type { EmptyStateSize, EmptyStateIcon, EmptyStateVariant }
