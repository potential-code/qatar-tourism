import type { ProgrammeCode } from '@shared/constants'
import { useNavigate } from '@tanstack/react-router'
import { type FormEvent, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useCreatePath } from '../queries/paths.queries'
import type { PathSummary } from '../types'

const BLANK = '__blank__'

/** A new path variant for a programme, copied from an existing path or started empty. */
export function CreatePathDialog({
  open,
  onOpenChange,
  programme,
  paths,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  programme: ProgrammeCode
  paths: PathSummary[]
}) {
  const navigate = useNavigate()
  const create = useCreatePath()
  const source = paths.find((p) => p.isDefault) ?? paths[0]
  const [copyFrom, setCopyFrom] = useState(source?.id ?? BLANK)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset the form only when the dialog opens
  useEffect(() => {
    if (open) {
      setCopyFrom(source?.id ?? BLANK)
      setName('')
      setDescription('')
    }
  }, [open, programme])

  const submit = (event: FormEvent) => {
    event.preventDefault()
    create.mutate(
      {
        programme,
        name,
        description,
        ...(copyFrom !== BLANK ? { copyFromPathId: copyFrom } : {}),
      },
      {
        onSuccess: (created) => {
          toast.success(`${created.code} created as draft v1`)
          onOpenChange(false)
          navigate({ to: '/admin/manage/paths/$pathId', params: { pathId: created.id } })
        },
        onError: (error) => toast.error(error.message),
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={submit} className="grid gap-5">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl font-normal">
              New Program {programme} path variant
            </DialogTitle>
            <DialogDescription>
              Starts as draft v1. Learners are unaffected until you publish it and a rule assigns
              it.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-1.5">
            <Label htmlFor="path-name">Path name</Label>
            <Input
              id="path-name"
              required
              minLength={3}
              value={name}
              placeholder="e.g. B Front office evening shift"
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="path-description">Description</Label>
            <Textarea
              id="path-description"
              required
              minLength={5}
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="path-copy">Start from</Label>
            <Select value={copyFrom} onValueChange={setCopyFrom}>
              <SelectTrigger id="path-copy" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {paths.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    Copy of {p.name}
                  </SelectItem>
                ))}
                <SelectItem value={BLANK}>An empty path</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? 'Creating' : 'Create draft'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
