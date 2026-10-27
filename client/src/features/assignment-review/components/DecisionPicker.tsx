import { useId } from 'react'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { cn } from '@/lib/utils'
import type { Decision } from '../types'

interface DecisionPickerProps {
  value: Decision | null
  onChange: (value: Decision) => void
  total: number
  passPercent: number
}

/** Return for revision, or approve (only at or above the pass mark). */
export function DecisionPicker({ value, onChange, total, passPercent }: DecisionPickerProps) {
  const id = useId()
  const canApprove = total >= passPercent
  const options: { value: Decision; title: string; body: string; disabled?: boolean }[] = [
    {
      value: 'returned',
      title: 'Return for revision',
      body: 'The learner revises and submits a new version.',
    },
    {
      value: 'approved',
      title: 'Approve',
      body: canApprove
        ? 'The requirement is complete.'
        : `Needs at least ${passPercent}. This mark is ${total}.`,
      disabled: !canApprove,
    },
  ]
  return (
    <fieldset className="grid gap-2">
      <legend className="mb-1 text-sm font-medium text-ink">Decision</legend>
      <RadioGroup
        value={value ?? ''}
        onValueChange={(v) => onChange(v as Decision)}
        className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2"
      >
        {options.map((option) => (
          <label
            key={option.value}
            htmlFor={`${id}-${option.value}`}
            className={cn(
              'flex cursor-pointer items-start gap-3 rounded-lg border bg-white p-3 transition-colors',
              value === option.value ? 'border-teal bg-teal-mist/50' : 'hover:border-teal/40',
              option.disabled && 'cursor-not-allowed opacity-60',
            )}
          >
            <RadioGroupItem
              id={`${id}-${option.value}`}
              value={option.value}
              disabled={option.disabled}
              className="mt-0.5"
            />
            <span className="grid gap-0.5">
              <span className="text-sm font-medium text-ink">{option.title}</span>
              <span className="text-xs text-muted-foreground">{option.body}</span>
            </span>
          </label>
        ))}
      </RadioGroup>
    </fieldset>
  )
}
