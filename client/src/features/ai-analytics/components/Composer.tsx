import { ArrowUp, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

/** Question box: Enter sends, Shift+Enter adds a line. */
export function Composer({
  onSend,
  pending,
}: {
  onSend: (text: string) => void
  pending: boolean
}) {
  const [text, setText] = useState('')
  const submit = () => {
    if (!text.trim() || pending) return
    onSend(text)
    setText('')
  }
  return (
    <form
      className="relative"
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
    >
      <label htmlFor="ai-question" className="sr-only">
        Ask a question about the Academy data
      </label>
      <Textarea
        id="ai-question"
        value={text}
        maxLength={300}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            submit()
          }
        }}
        rows={2}
        placeholder="Ask about enrolments, completion, improvement, marking, attendance or certification"
        className="min-h-20 resize-none rounded-xl bg-white pe-14 text-sm"
      />
      <Button
        type="submit"
        size="icon"
        aria-label="Send question"
        disabled={pending || !text.trim()}
        className="absolute end-3 bottom-3 size-9"
      >
        {pending ? <Loader2 className="animate-spin" aria-hidden /> : <ArrowUp aria-hidden />}
      </Button>
    </form>
  )
}
