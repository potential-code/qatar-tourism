import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { CalendarCheck, NotebookPen, TrendingUp } from 'lucide-react'
import type { ComponentType, ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'
import { Skeleton } from '@/components/ui/skeleton'
import { noteStatsQuery } from '@/queries/note.queries'

export const Route = createFileRoute('/_app/dashboard')({
  loader: ({ context }) => context.queryClient.ensureQueryData(noteStatsQuery()),
  component: DashboardPage,
})

// Dates arrive as 'YYYY-MM-DD' (UTC days); format them in UTC so no day shifts by timezone.
function useDayFormatter() {
  const { i18n } = useTranslation()
  const format = new Intl.DateTimeFormat(i18n.language, {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })
  return (date: string) => format.format(new Date(`${date}T00:00:00Z`))
}

function DashboardPage() {
  const { t, i18n } = useTranslation()
  const rtl = i18n.dir() === 'rtl'
  const stats = useQuery(noteStatsQuery())
  const formatDay = useDayFormatter()

  const perDay = stats.data?.perDay ?? []
  const total = perDay.reduce((sum, day) => sum + day.count, 0)
  const activeDays = perDay.filter((day) => day.count > 0).length
  const busiest = perDay.reduce<(typeof perDay)[number] | null>(
    (best, day) => (day.count > 0 && (!best || day.count > best.count) ? day : best),
    null,
  )

  const chartConfig = {
    count: { label: t('dashboard.chartSeries'), color: 'var(--chart-1)' },
  } satisfies ChartConfig

  return (
    <>
      <PageHeader title={t('dashboard.title')} description={t('dashboard.subtitle')} />

      {stats.isError ? (
        <Card role="alert">
          <CardContent className="flex flex-wrap items-center justify-between gap-4">
            <p className="text-muted-foreground">{t('errors.generic')}</p>
            <Button variant="outline" onClick={() => void stats.refetch()}>
              {t('common.retry')}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <StatCard
              icon={NotebookPen}
              label={t('dashboard.totalNotes')}
              value={stats.isPending ? null : total}
            />
            <StatCard
              icon={CalendarCheck}
              label={t('dashboard.activeDays')}
              value={stats.isPending ? null : activeDays}
            />
            <StatCard
              icon={TrendingUp}
              label={t('dashboard.busiestDay')}
              value={
                stats.isPending ? null : busiest ? formatDay(busiest.date) : t('dashboard.none')
              }
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{t('dashboard.chartTitle')}</CardTitle>
              <CardDescription>{t('dashboard.chartDescription')}</CardDescription>
            </CardHeader>
            <CardContent>
              {stats.isPending ? (
                <Skeleton className="aspect-video max-h-80 w-full" />
              ) : total === 0 ? (
                <p className="py-16 text-center text-muted-foreground">
                  {t('dashboard.chartEmpty')}
                </p>
              ) : (
                <ChartContainer config={chartConfig} className="aspect-auto h-72 w-full">
                  <BarChart accessibilityLayer data={perDay} margin={{ left: 0, right: 0 }}>
                    <CartesianGrid vertical={false} />
                    <XAxis
                      dataKey="date"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      minTickGap={24}
                      tickFormatter={formatDay}
                      reversed={rtl}
                    />
                    <YAxis
                      allowDecimals={false}
                      tickLine={false}
                      axisLine={false}
                      width={32}
                      orientation={rtl ? 'right' : 'left'}
                    />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent labelFormatter={(value) => formatDay(String(value))} />
                      }
                    />
                    <Bar dataKey="count" fill="var(--color-count)" radius={4} />
                  </BarChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>
  label: string
  value: ReactNode | null
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4">
        <div className="rounded-full bg-primary/10 p-3">
          <Icon className="size-5 text-primary" aria-hidden />
        </div>
        <div className="grid gap-1">
          {value === null ? (
            <Skeleton className="h-7 w-16" />
          ) : (
            <p className="font-bold text-2xl">{value}</p>
          )}
          <p className="text-muted-foreground text-sm">{label}</p>
        </div>
      </CardContent>
    </Card>
  )
}
