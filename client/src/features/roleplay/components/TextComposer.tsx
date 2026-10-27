import { SendHorizontal } from 'lucide-react'
import { type FormEvent, type KeyboardEvent, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface TextComposerProps {
  onSend: (text: string) => Promise<unknown>
  disabled?: boolean
  /** A reply that failed to send, put back in the box so it is not lost. */
  restore?: string | null
  label?: string
}

const MAX = 1000

/** Typed reply box. Enter sends, Shift+Enter adds a line. */
export function TextComposer({
  onSend,
  disabled,
  restore,
  label = 'Your reply',
}: TextComposerProps) {
  const [text, setText] = useState('')

  useEffect(() => {
    if (restore) setText(restore)
  }, [restore])

  const submit = async (event?: FormEvent) => {
    event?.preventDefault()
    const reply = text.trim()
    if (!reply || disabled) return
    setText('')
    await onSend(reply)
  }

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      void submit()
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-2">
      <Label htmlFor="practice-reply" className="sr-only">
        {label}
      </Label>
      <div className="flex items-end gap-2 rounded-2xl border border-border bg-white p-2 shadow-xs focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/40">
        <Textarea
          id="practice-reply"
          value={text}
          maxLength={MAX}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Write what you would say to the visitor"
          rows={2}
          className="max-h-40 min-h-12 resize-none border-0 bg-transparent shadow-none focus-visible:ring-0"
        />
        <Button
          type="submit"
          size="icon"
          disabled={disabled || !text.trim()}
          aria-label="Send reply"
        >
          <SendHorizontal className="rtl:-scale-x-100" />
        </Button>
      </div>
      <p className="px-2 text-xs text-muted-foreground">
        Press Enter to send. Shift and Enter adds a new line.
      </p>
    </form>
  )
}
