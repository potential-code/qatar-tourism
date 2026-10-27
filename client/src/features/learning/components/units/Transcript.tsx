import { FileText } from 'lucide-react'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'

/** Transcript and scene notes, always available without playing the video. */
export function Transcript({ text, scenes }: { text: string; scenes?: readonly string[] }) {
  return (
    <Accordion
      type="single"
      collapsible
      defaultValue="transcript"
      className="rounded-xl border bg-white px-5"
    >
      <AccordionItem value="transcript" className="border-b-0">
        <AccordionTrigger className="text-base">
          <span className="inline-flex items-center gap-2">
            <FileText aria-hidden className="size-4 text-teal" /> Transcript
          </span>
        </AccordionTrigger>
        <AccordionContent className="flex flex-col gap-4">
          <p className="max-w-[70ch] leading-relaxed text-ink/90">{text}</p>
          {scenes && scenes.length > 0 ? (
            <ol className="grid gap-2 sm:grid-cols-2">
              {scenes.map((scene, i) => (
                <li
                  key={scene}
                  className="flex gap-3 rounded-lg bg-sand p-3 text-sm text-muted-foreground"
                >
                  <span className="font-display text-lg text-teal">{i + 1}</span>
                  {scene}
                </li>
              ))}
            </ol>
          ) : null}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  )
}
