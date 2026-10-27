import * as React from 'react'
import { ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon, ChevronUpIcon } from 'lucide-react'
import { DayPicker, getDefaultClassNames } from 'react-day-picker'
import type { VariantProps } from 'class-variance-authority'

import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export type CalendarProps = React.ComponentProps<typeof DayPicker> & {
  /** Visual weight of the previous/next month buttons. */
  buttonVariant?: VariantProps<typeof buttonVariants>['variant']
}

/**
 * Date field built on react-day-picker v9.
 *
 * Direction-aware: navigation chevrons flip under `dir="rtl"` via CSS, so no
 * locale branching is needed here.
 */
function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = 'label',
  buttonVariant = 'ghost',
  components,
  ...props
}: CalendarProps) {
  const defaultClassNames = getDefaultClassNames()

  return (
    <DayPicker
      data-slot="calendar"
      showOutsideDays={showOutsideDays}
      captionLayout={captionLayout}
      className={cn('bg-background p-3 group/calendar', className)}
      classNames={{
        root: cn('w-fit', defaultClassNames.root),
        months: cn('flex flex-col gap-4 sm:flex-row relative', defaultClassNames.months),
        month: cn('flex flex-col gap-4 w-full', defaultClassNames.month),
        nav: cn(
          'flex items-center gap-1 w-full absolute top-0 inset-x-0 justify-between',
          defaultClassNames.nav,
        ),
        button_previous: cn(
          buttonVariants({ variant: buttonVariant }),
          'size-7 bg-transparent p-0 opacity-50 hover:opacity-100 aria-disabled:opacity-30 aria-disabled:pointer-events-none select-none',
          defaultClassNames.button_previous,
        ),
        button_next: cn(
          buttonVariants({ variant: buttonVariant }),
          'size-7 bg-transparent p-0 opacity-50 hover:opacity-100 aria-disabled:opacity-30 aria-disabled:pointer-events-none select-none',
          defaultClassNames.button_next,
        ),
        month_caption: cn(
          'flex items-center justify-center h-7 w-full px-7',
          defaultClassNames.month_caption,
        ),
        caption_label: cn('select-none text-sm font-medium', defaultClassNames.caption_label),
        dropdowns: cn(
          'w-full flex items-center text-sm font-medium justify-center h-7 gap-1.5',
          defaultClassNames.dropdowns,
        ),
        dropdown_root: cn(
          'relative rounded-md border border-input shadow-xs has-focus:border-ring has-focus:ring-ring/50 has-focus:ring-[3px]',
          defaultClassNames.dropdown_root,
        ),
        dropdown: cn('absolute inset-0 opacity-0 bg-popover', defaultClassNames.dropdown),
        month_grid: cn('w-full border-collapse', defaultClassNames.month_grid),
        weekdays: cn('flex', defaultClassNames.weekdays),
        weekday: cn(
          'text-muted-foreground rounded-md flex-1 font-normal text-[0.8rem] select-none',
          defaultClassNames.weekday,
        ),
        week: cn('flex w-full mt-2', defaultClassNames.week),
        week_number_header: cn('select-none w-9', defaultClassNames.week_number_header),
        week_number: cn(
          'text-[0.8rem] select-none text-muted-foreground',
          defaultClassNames.week_number,
        ),
        day: cn(
          'relative w-full h-full p-0 text-center group/day aspect-square select-none',
          '[&:first-child[data-selected=true]_button]:rounded-s-md',
          '[&:last-child[data-selected=true]_button]:rounded-e-md',
          defaultClassNames.day,
        ),
        day_button: cn(
          buttonVariants({ variant: 'ghost' }),
          'size-9 p-0 font-normal aria-selected:opacity-100',
          'group-data-[selected=true]/day:bg-primary group-data-[selected=true]/day:text-primary-foreground',
          defaultClassNames.day_button,
        ),
        range_start: cn(
          'rounded-s-md bg-accent [&>button]:bg-primary [&>button]:text-primary-foreground',
          defaultClassNames.range_start,
        ),
        range_middle: cn(
          'rounded-none bg-accent [&>button]:bg-transparent [&>button]:text-accent-foreground',
          defaultClassNames.range_middle,
        ),
        range_end: cn(
          'rounded-e-md bg-accent [&>button]:bg-primary [&>button]:text-primary-foreground',
          defaultClassNames.range_end,
        ),
        selected: cn(
          '[&>button]:bg-primary [&>button]:text-primary-foreground [&>button]:hover:bg-primary [&>button]:hover:text-primary-foreground',
          defaultClassNames.selected,
        ),
        today: cn(
          'bg-accent text-accent-foreground rounded-md data-[selected=true]:rounded-none',
          defaultClassNames.today,
        ),
        outside: cn(
          'text-muted-foreground aria-selected:text-muted-foreground',
          defaultClassNames.outside,
        ),
        disabled: cn('text-muted-foreground opacity-50', defaultClassNames.disabled),
        hidden: cn('invisible', defaultClassNames.hidden),
        ...classNames,
      }}
      components={{
        Chevron: ({
          className: chevronClassName,
          orientation,
          size: _size,
          disabled: _disabled,
          ...chevronProps
        }) => {
          if (orientation === 'up') {
            return <ChevronUpIcon className={cn('size-4', chevronClassName)} {...chevronProps} />
          }
          if (orientation === 'down') {
            return <ChevronDownIcon className={cn('size-4', chevronClassName)} {...chevronProps} />
          }
          const Icon = orientation === 'right' ? ChevronRightIcon : ChevronLeftIcon
          // `rtl:-scale-x-100` mirrors the arrow when an ancestor sets dir="rtl".
          return (
            <Icon className={cn('size-4 rtl:-scale-x-100', chevronClassName)} {...chevronProps} />
          )
        },
        ...components,
      }}
      {...props}
    />
  )
}
Calendar.displayName = 'Calendar'

export { Calendar }
