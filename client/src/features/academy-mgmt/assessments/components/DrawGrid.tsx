import type { DrawRule } from '@shared/types/db'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { TableFrame } from '../../hub/components/TableFrame'
import { COMPETENCY_LABELS, DIFFICULTY_LABELS } from '../utils/labels'

const COLUMNS = ['easy', 'medium', 'hard', 'any'] as const
type Column = (typeof COLUMNS)[number]

export type Availability = {
  competency: keyof typeof COMPETENCY_LABELS
  byDifficulty: Record<'easy' | 'medium' | 'hard', number>
}[]

const countOf = (draws: readonly DrawRule[], competency: string, difficulty: Column) =>
  draws
    .filter((d) => d.competency === competency && d.difficulty === difficulty)
    .reduce((sum, d) => sum + d.count, 0)

/**
 * Draw count by competency and difficulty. Each cell is how many questions are drawn from that
 * pool; the small number beneath is how many published questions the pool holds.
 */
export function DrawGrid({
  draws,
  available,
  onChange,
}: {
  draws: DrawRule[]
  available: Availability
  onChange: (draws: DrawRule[]) => void
}) {
  const set = (competency: DrawRule['competency'], difficulty: Column, count: number) => {
    const others = draws.filter(
      (d) => !(d.competency === competency && d.difficulty === difficulty),
    )
    onChange(count > 0 ? [...others, { competency, difficulty, count }] : others)
  }
  const total = draws.reduce((sum, d) => sum + d.count, 0)
  return (
    <div className="grid gap-2">
      <TableFrame label="Draw count by competency and difficulty">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Competency</TableHead>
              {COLUMNS.map((c) => (
                <TableHead key={c} className="text-center">
                  {c === 'any' ? 'Any difficulty' : DIFFICULTY_LABELS[c]}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {available.map((row) => (
              <TableRow key={row.competency}>
                <TableCell className="font-medium whitespace-nowrap">
                  {COMPETENCY_LABELS[row.competency]}
                </TableCell>
                {COLUMNS.map((col) => {
                  const pool =
                    col === 'any'
                      ? row.byDifficulty.easy + row.byDifficulty.medium + row.byDifficulty.hard
                      : row.byDifficulty[col]
                  const value = countOf(draws, row.competency, col)
                  return (
                    <TableCell key={col} className="text-center">
                      <Input
                        type="number"
                        min={0}
                        max={10}
                        value={value}
                        onChange={(e) =>
                          set(
                            row.competency,
                            col,
                            Math.max(0, Math.min(10, Number(e.target.value) || 0)),
                          )
                        }
                        aria-label={`${COMPETENCY_LABELS[row.competency]}, ${col === 'any' ? 'any difficulty' : DIFFICULTY_LABELS[col]}, questions to draw`}
                        aria-invalid={value > pool}
                        className="mx-auto h-9 w-16 text-center tabular-nums"
                      />
                      <span
                        className={`mt-1 block text-xs ${value > pool ? 'font-medium text-destructive' : 'text-muted-foreground'}`}
                      >
                        {pool} available
                      </span>
                    </TableCell>
                  )
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableFrame>
      <p className="text-sm text-muted-foreground">Total drawn per attempt: {total} questions.</p>
    </div>
  )
}
