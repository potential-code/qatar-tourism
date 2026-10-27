import * as React from 'react'
import { Switch as SwitchPrimitives } from 'radix-ui'

import { cn } from '@/lib/utils'

type SwitchProps = React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root> & {
  size?: 'sm' | 'default' | 'lg'
}

const Switch = React.forwardRef<React.ComponentRef<typeof SwitchPrimitives.Root>, SwitchProps>(
  ({ className, size = 'default', ...props }, ref) => (
    <SwitchPrimitives.Root
      ref={ref}
      data-slot="switch"
      data-size={size}
      className={cn(
        'peer group/switch inline-flex shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent shadow-xs transition-all outline-none',
        'data-[size=sm]:h-4 data-[size=sm]:w-7 data-[size=default]:h-6 data-[size=default]:w-11 data-[size=lg]:h-7 data-[size=lg]:w-13',
        'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'data-[state=checked]:bg-primary data-[state=unchecked]:bg-input',
        'aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40',
        className,
      )}
      {...props}
    >
      <SwitchPrimitives.Thumb
        data-slot="switch-thumb"
        className={cn(
          'pointer-events-none block rounded-full bg-background shadow-lg ring-0 transition-transform',
          'group-data-[size=sm]/switch:size-3 group-data-[size=default]/switch:size-5 group-data-[size=lg]/switch:size-6',
          'data-[state=unchecked]:translate-x-0 rtl:data-[state=unchecked]:-translate-x-0',
          'data-[state=checked]:translate-x-[calc(100%-2px)] rtl:data-[state=checked]:-translate-x-[calc(100%-2px)]',
        )}
      />
    </SwitchPrimitives.Root>
  ),
)
Switch.displayName = 'Switch'

export { Switch }
