import type { ProgrammeCode } from '@shared/constants'
import { PROGRAMME_LABELS } from '@shared/schemas/admin-labels'
import { ArrowRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

/**
 * The public programme card as visitors will see it (brief §14: "Content editing must preview
 * the result before publication"). Mirrors the homepage card anatomy.
 */
export function PublicCardPreview({
  code,
  title,
  summary,
  meta,
  image,
  certifies,
}: {
  code: ProgrammeCode
  title: string
  summary: string
  meta: string
  image: string | null
  certifies: boolean
}) {
  return (
    <article className="flex flex-col overflow-hidden rounded-xl bg-white shadow-md">
      <div className="aspect-[16/9] overflow-hidden bg-teal-mist">
        {image ? <img src={image} alt="" className="size-full object-cover" /> : null}
      </div>
      <div className="flex flex-col gap-3 p-5">
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="border-teal/30 text-teal-deep">
            {PROGRAMME_LABELS[code]}
          </Badge>
          {certifies ? (
            <Badge variant="outline" className="border-maroon/30 text-maroon-deep">
              Certificate on completion
            </Badge>
          ) : null}
        </div>
        <h3 className="font-display text-2xl leading-tight text-ink">
          {title || 'Untitled programme'}
        </h3>
        <p className="line-clamp-3 text-sm text-muted-foreground">{summary}</p>
        <p className="text-xs text-muted-foreground">{meta}</p>
        <span className="inline-flex items-center gap-1 text-sm font-medium text-teal">
          View programme <ArrowRight aria-hidden className="size-4 rtl:-scale-x-100" />
        </span>
      </div>
    </article>
  )
}
