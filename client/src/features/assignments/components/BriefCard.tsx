import { ScrollText } from 'lucide-react'
import type { LearnerAssignment } from '../types'

/** The assignment brief, verbatim from the brief (§6 / §7), with its rules. */
export function BriefCard({ item }: { item: LearnerAssignment }) {
  const { assignment } = item
  return (
    <section
      aria-labelledby="brief-heading"
      className="grid gap-4 rounded-xl bg-teal-deep p-6 text-white shadow-sm"
    >
      <h2 id="brief-heading" className="flex items-center gap-2 text-sm font-medium text-white/80">
        <ScrollText aria-hidden className="size-4" /> Assignment brief
      </h2>
      <p className="font-display text-xl leading-snug font-light md:text-2xl">{assignment.brief}</p>
      <dl className="grid grid-cols-2 gap-3 border-t border-white/15 pt-4 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-white/65">Length</dt>
          <dd>
            {assignment.wordMin} to {assignment.wordMax} words
            {assignment.allowsUpload ? ', or a file' : ''}
          </dd>
        </div>
        <div>
          <dt className="text-white/65">Pass mark</dt>
          <dd>{assignment.passPercent}/100</dd>
        </div>
        <div>
          <dt className="text-white/65">Revisions</dt>
          <dd>Permitted</dd>
        </div>
      </dl>
    </section>
  )
}
