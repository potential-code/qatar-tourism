import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from 'recharts'

/**
 * New registrations per week, drawn in white on the teal hero. A plain recharts area because the
 * kit's charts take series colours, which would vanish on the hero's teal surface.
 */
export function HeroTrend({ data }: { data: readonly { key: string; value: number }[] }) {
  const points = data.map((d) => ({
    ...d,
    label: new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
      month: 'short',
      timeZone: 'UTC',
    }).format(new Date(`${d.key}T12:00:00Z`)),
  }))
  return (
    <div className="h-24 w-full" aria-hidden>
      <ResponsiveContainer width="100%" height="100%">
        {/* Decorative sparkline (the weekly figures are in the hero's text): not focusable. */}
        <AreaChart
          data={points}
          margin={{ top: 6, right: 0, left: 0, bottom: 0 }}
          accessibilityLayer={false}
          tabIndex={-1}
        >
          <defs>
            <linearGradient id="hero-trend" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="white" stopOpacity={0.35} />
              <stop offset="100%" stopColor="white" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="label" hide />
          <Tooltip
            cursor={{ stroke: 'rgb(255 255 255 / 0.4)' }}
            contentStyle={{ borderRadius: 12, border: 'none', fontSize: 12 }}
            formatter={(value) => [`${value} new learners`, 'Week of']}
            labelFormatter={(label) => `Week of ${label}`}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke="white"
            strokeWidth={2}
            fill="url(#hero-trend)"
            isAnimationActive
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
