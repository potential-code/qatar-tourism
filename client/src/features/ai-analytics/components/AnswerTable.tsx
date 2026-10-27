import type { AnswerTable as Table } from '@shared/schemas/admin-ai'
import { cn } from '@/lib/utils'

/** The answer's data table: also the accessible text alternative to its chart. */
export function AnswerTable({ table, caption }: { table: Table; caption: string }) {
  return (
    <section aria-label={caption} className="w-0 min-w-full overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead className="bg-sand-deep/70">
          <tr>
            {table.columns.map((c) => (
              <th
                key={c.key}
                scope="col"
                className={cn(
                  'h-10 px-4 text-xs font-medium text-muted-foreground',
                  c.numeric ? 'text-end' : 'text-start',
                )}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, index) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: answer rows have no id and never reorder
            <tr key={index} className="border-t">
              {table.columns.map((c) => (
                <td
                  key={c.key}
                  className={cn('px-4 py-2.5', c.numeric ? 'text-end tabular-nums' : 'text-ink')}
                >
                  {row[c.key] ?? <span className="text-muted-foreground/60">None</span>}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}
