/**
 * The frame every chart in this template sits in.
 *
 * It owns the three states a panel actually has — loading, empty, and
 * populated — so no individual chart has to, and so the empty state is
 * impossible to forget. A chart that renders an axis and no marks looks
 * broken; a chart that says "no signups in this window" is an answer.
 */

import { ChartNoAxesColumn } from 'lucide-react'
import type * as React from 'react'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

export interface ChartCardProps {
  title: React.ReactNode
  /** One line under the title. Says what is plotted, not how to read it. */
  description?: React.ReactNode
  /** Controls aligned to the end of the header — a range picker, an export. */
  action?: React.ReactNode
  /**
   * A note under the chart. The gallery uses it for "when to use this"; a
   * real dashboard usually leaves it off.
   */
  note?: React.ReactNode
  isLoading?: boolean
  /** True when there is nothing to plot. Renders `EmptyState` in place of the chart. */
  isEmpty?: boolean
  emptyTitle?: React.ReactNode
  emptyDescription?: React.ReactNode
  /** Height of the plot area. Charts are given a fixed height, not an aspect ratio. */
  height?: number
  className?: string
  children: React.ReactNode
}

export function ChartCard({
  title,
  description,
  action,
  note,
  isLoading = false,
  isEmpty = false,
  emptyTitle = 'Nothing to show yet',
  emptyDescription = 'There is no data in the selected window.',
  height = 260,
  className,
  children,
}: ChartCardProps) {
  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
        {action ? <CardAction>{action}</CardAction> : null}
      </CardHeader>
      <CardContent>
        <div style={{ minHeight: height }} className="flex flex-col justify-center">
          {isLoading ? (
            <Skeleton className="w-full" style={{ height }} />
          ) : isEmpty ? (
            <EmptyState
              icon={ChartNoAxesColumn}
              title={emptyTitle}
              description={emptyDescription}
              size="sm"
            />
          ) : (
            children
          )}
        </div>
        {note ? (
          <p className="mt-3 border-t border-border/60 pt-3 text-xs text-muted-foreground">
            {note}
          </p>
        ) : null}
      </CardContent>
    </Card>
  )
}
