import type { ContentLanguage } from '@shared/constants'
import { useQuery } from '@tanstack/react-query'
import { Eye, FlaskConical } from 'lucide-react'
import { useState } from 'react'
import { IllustrativeNote } from '@/components/layout'
import { SimulatedTag } from '@/components/layout/SimulatedTag'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { LibraryItem } from '@/services/content-library.service'
import { ManagePage } from '../../hub/components/ManagePage'
import { Panel } from '../../hub/components/Panel'
import { CardsSkeleton, ErrorPanel } from '../../hub/components/QueryStates'
import { qDate } from '../../hub/utils/format'
import { contentLibraryQuery } from '../queries/content.queries'
import { ArticulateRow } from './ArticulateRow'
import { PackagePreviewDialog, type PreviewTab } from './PackagePreviewDialog'

type Variant = LibraryItem['variants'][number]
type Open = { item: LibraryItem; language: ContentLanguage; tab: PreviewTab }

const FORMAT: Record<string, string> = { scorm_2004: 'SCORM 2004', xapi: 'xAPI' }

function VariantRow({
  item,
  variant,
  onOpen,
}: {
  item: LibraryItem
  variant: Variant
  onOpen: (open: Open) => void
}) {
  return (
    <TableRow>
      <TableCell className="font-medium text-ink">
        {variant.languageName}
        <span lang={variant.language} className="ms-2 text-muted-foreground">
          {variant.language === 'ar' ? 'العربية' : 'English'}
        </span>
      </TableCell>
      <TableCell className="font-mono text-xs">{variant.packageId}</TableCell>
      <TableCell>{FORMAT[item.type] ?? item.type}</TableCell>
      <TableCell>{variant.version}</TableCell>
      <TableCell>{variant.accessGroup ?? 'Not set'}</TableCell>
      <TableCell className="whitespace-nowrap">{qDate(variant.publishedAt)}</TableCell>
      <TableCell>
        <div className="flex flex-wrap justify-end gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onOpen({ item, language: variant.language, tab: 'details' })}
            aria-label={`Preview ${item.title}, ${variant.languageName}`}
          >
            <Eye aria-hidden /> Preview
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onOpen({ item, language: variant.language, tab: 'tracking' })}
            aria-label={`Tracking test for ${item.title}, ${variant.languageName}`}
          >
            <FlaskConical aria-hidden /> Tracking test
          </Button>
        </div>
      </TableCell>
    </TableRow>
  )
}

function ItemPanel({ item, onOpen }: { item: LibraryItem; onOpen: (open: Open) => void }) {
  return (
    <Panel
      title={
        <span className="inline-flex flex-wrap items-center gap-2">
          {item.title}
          <Badge variant="secondary">{FORMAT[item.type] ?? item.type}</Badge>
          {item.type === 'xapi' ? <SimulatedTag label="Simulated learning record store" /> : null}
        </span>
      }
      description={`Unit ${item.courseCode} in the Program A and B learning paths. Shared course identity: ${item.courseKey}. Each language is its own package with its own package ID and version.`}
      bodyClassName="p-0"
    >
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Language</TableHead>
              <TableHead>Package ID</TableHead>
              <TableHead>Format</TableHead>
              <TableHead>Version</TableHead>
              <TableHead>Access group</TableHead>
              <TableHead>Published</TableHead>
              <TableHead className="text-end">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {item.variants.map((variant) => (
              <VariantRow key={variant.packageId} item={item} variant={variant} onOpen={onOpen} />
            ))}
          </TableBody>
        </Table>
      </div>
    </Panel>
  )
}

/** The library itself: items with their language variants, plus the Articulate row. */
export function ContentLibraryBody() {
  const query = useQuery(contentLibraryQuery())
  const [open, setOpen] = useState<Open | null>(null)

  return (
    <>
      <IllustrativeNote>
        <p>
          The packages are original demonstration content authored for this trial. The learning
          record store for xAPI is simulated inside the demo. Package access groups are
          illustrative.
        </p>
      </IllustrativeNote>

      {query.isPending ? (
        <CardsSkeleton count={2} className="grid gap-6" />
      ) : query.isError ? (
        <ErrorPanel error={query.error} onRetry={() => query.refetch()} />
      ) : (
        <div className="grid gap-6">
          {query.data.items.map((item) => (
            <ItemPanel key={item.courseKey} item={item} onOpen={setOpen} />
          ))}
          <ArticulateRow />
        </div>
      )}

      {open ? (
        <PackagePreviewDialog
          item={open.item}
          initialLanguage={open.language}
          initialTab={open.tab}
          onClose={() => setOpen(null)}
        />
      ) : null}
    </>
  )
}

/** Content Library (SPEC §3): bilingual SCORM and xAPI packages with previews and tracking tests. */
export function ContentLibraryPage() {
  return (
    <ManagePage
      title="Content Library"
      description="Bilingual SCORM and xAPI packages with previews and tracking tests. Every item has English and Arabic variants that share one course identity."
    >
      <ContentLibraryBody />
    </ManagePage>
  )
}
