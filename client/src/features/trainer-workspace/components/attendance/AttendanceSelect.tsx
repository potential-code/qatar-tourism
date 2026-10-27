import { ATTENDANCE_VALUES, type AttendanceValue } from '@shared/constants'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ATTENDANCE_LABEL } from '@/features/sessions/utils/session-labels'

export function AttendanceSelect({
  value,
  onChange,
  disabled,
  label,
}: {
  value: AttendanceValue
  onChange: (value: AttendanceValue) => void
  disabled?: boolean
  label: string
}) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as AttendanceValue)} disabled={disabled}>
      <SelectTrigger className="h-9 w-36" aria-label={label}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {ATTENDANCE_VALUES.map((v) => (
          <SelectItem key={v} value={v}>
            {ATTENDANCE_LABEL[v]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
