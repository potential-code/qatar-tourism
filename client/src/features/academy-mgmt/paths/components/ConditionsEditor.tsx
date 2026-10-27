import type { RuleCondition, RuleField, RuleGroup, RuleOperator } from '@shared/content/paths'
import { Plus, Trash2 } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { easeOut } from '@/components/motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import {
  asList,
  blankCondition,
  fieldMeta,
  isGroup,
  OPERATOR_LABELS,
  RULE_FIELDS,
} from '../utils/rules'

type Node = RuleCondition | RuleGroup

/**
 * AND/OR condition builder (brief §14 "Show AND/OR conditions"). A group may hold conditions
 * and, at the top level, one more level of groups.
 */
export function ConditionsEditor({
  group,
  onChange,
  depth = 0,
  idPrefix = 'cond',
}: {
  group: RuleGroup
  onChange: (next: RuleGroup) => void
  depth?: number
  idPrefix?: string
}) {
  const reduce = useReducedMotion()
  const set = (index: number, node: Node) =>
    onChange({ ...group, conditions: group.conditions.map((n, i) => (i === index ? node : n)) })
  const remove = (index: number) =>
    onChange({ ...group, conditions: group.conditions.filter((_, i) => i !== index) })

  return (
    <div
      className={cn(
        'grid gap-3 rounded-xl border p-3',
        depth === 0 ? 'bg-sand/60' : 'border-dashed bg-card',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <fieldset className="flex items-center gap-2">
          <legend className="sr-only">Combine conditions with</legend>
          <span className="text-xs text-muted-foreground">Match</span>
          <div className="inline-flex rounded-full border bg-card p-0.5">
            {(['AND', 'OR'] as const).map((op) => (
              <button
                key={op}
                type="button"
                aria-pressed={group.op === op}
                onClick={() => onChange({ ...group, op })}
                className={cn(
                  'rounded-full px-3 py-1 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                  group.op === op ? 'bg-teal text-white' : 'text-ink/70 hover:text-teal',
                )}
              >
                {op === 'AND' ? 'All (AND)' : 'Any (OR)'}
              </button>
            ))}
          </div>
        </fieldset>
      </div>

      <ul className="grid gap-2">
        <AnimatePresence initial={false}>
          {group.conditions.map((node, index) => (
            <motion.li
              // biome-ignore lint/suspicious/noArrayIndexKey: conditions have no identity beyond position
              key={index}
              layout={!reduce}
              initial={reduce ? false : { opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? undefined : { opacity: 0, height: 0 }}
              transition={{ duration: 0.2, ease: easeOut }}
              className="grid gap-1"
            >
              {index > 0 ? (
                <span className="ps-1 text-[11px] font-semibold tracking-wide text-teal-deep">
                  {group.op}
                </span>
              ) : null}
              {isGroup(node) ? (
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
                  <ConditionsEditor
                    group={node}
                    onChange={(next) => set(index, next)}
                    depth={depth + 1}
                    idPrefix={`${idPrefix}-${index}`}
                  />
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    onClick={() => remove(index)}
                    aria-label="Remove group"
                  >
                    <Trash2 aria-hidden />
                  </Button>
                </div>
              ) : (
                <ConditionRow
                  id={`${idPrefix}-${index}`}
                  condition={node}
                  onChange={(next) => set(index, next)}
                  onRemove={() => remove(index)}
                />
              )}
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() =>
            onChange({ ...group, conditions: [...group.conditions, blankCondition()] })
          }
        >
          <Plus aria-hidden /> Condition
        </Button>
        {depth === 0 ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() =>
              onChange({
                ...group,
                conditions: [
                  ...group.conditions,
                  { op: group.op === 'AND' ? 'OR' : 'AND', conditions: [blankCondition()] },
                ],
              })
            }
          >
            <Plus aria-hidden /> Nested group
          </Button>
        ) : null}
      </div>
    </div>
  )
}

function ConditionRow({
  id,
  condition,
  onChange,
  onRemove,
}: {
  id: string
  condition: RuleCondition
  onChange: (next: RuleCondition) => void
  onRemove: () => void
}) {
  const meta = fieldMeta(condition.field)
  const values = asList(condition.value)
  const multiValue = condition.operator === 'in' || condition.operator === 'includes_any'

  const changeField = (field: RuleField) => {
    const next = fieldMeta(field)
    const operator = next.operators[0] as RuleOperator
    const first = next.options?.[0]?.value ?? ''
    onChange({
      field,
      operator,
      value: operator === 'in' || operator === 'includes_any' ? [first] : first,
    })
  }
  const changeOperator = (operator: RuleOperator) => {
    const many = operator === 'in' || operator === 'includes_any'
    onChange({ ...condition, operator, value: many ? values : (values[0] ?? '') })
  }
  const toggle = (value: string) => {
    const next = values.includes(value) ? values.filter((v) => v !== value) : [...values, value]
    onChange({ ...condition, value: next })
  }

  return (
    <div className="grid gap-2 rounded-lg border bg-card p-2.5">
      <div className="grid grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_auto] items-center gap-2">
        <Select value={condition.field} onValueChange={(v) => changeField(v as RuleField)}>
          <SelectTrigger aria-label="Profile field" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {RULE_FIELDS.map((f) => (
              <SelectItem key={f.field} value={f.field}>
                {f.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={condition.operator} onValueChange={(v) => changeOperator(v as RuleOperator)}>
          <SelectTrigger aria-label="Operator" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {meta.operators.map((op) => (
              <SelectItem key={op} value={op}>
                {OPERATOR_LABELS[op]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          onClick={onRemove}
          aria-label="Remove condition"
        >
          <Trash2 aria-hidden />
        </Button>
      </div>
      <div>
        {meta.options && !multiValue ? (
          <Select
            value={values[0] ?? ''}
            onValueChange={(v) => onChange({ ...condition, value: v })}
          >
            <SelectTrigger aria-label="Value" className="w-full">
              <SelectValue placeholder="Choose" />
            </SelectTrigger>
            <SelectContent>
              {meta.options.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : !meta.options ? (
          <Input
            id={`${id}-value`}
            aria-label="Value"
            value={values.join(', ')}
            placeholder={
              condition.field === 'jobTitle' ? 'e.g. driver' : 'e.g. Demo Pearl Hospitality'
            }
            onChange={(e) => {
              const parts = e.target.value.split(',').map((s) => s.trimStart())
              onChange({ ...condition, value: multiValue ? parts : (parts[0] ?? '') })
            }}
          />
        ) : (
          <span className="text-xs text-muted-foreground">
            {values.length ? `${values.length} selected` : 'Pick at least one below'}
          </span>
        )}
      </div>
      {meta.options && multiValue ? (
        <fieldset className="flex flex-wrap gap-1.5">
          <legend className="sr-only">{meta.label} values</legend>
          {meta.options.map((o) => {
            const on = values.includes(o.value)
            return (
              <button
                key={o.value}
                type="button"
                aria-pressed={on}
                onClick={() => toggle(o.value)}
                className={cn(
                  'rounded-full border px-2.5 py-1 text-xs transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                  on
                    ? 'border-teal bg-teal-mist text-teal-deep'
                    : 'bg-card text-ink/70 hover:border-teal/40',
                )}
              >
                {o.label}
              </button>
            )
          })}
        </fieldset>
      ) : null}
    </div>
  )
}
