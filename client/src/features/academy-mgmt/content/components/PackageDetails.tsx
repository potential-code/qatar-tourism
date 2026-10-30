import { DemoSettingsNote } from '@/components/layout'
import { type CourseKey, ITEM_SPECS } from '@/services/content-library/registry'
import type { LibraryItem } from '@/services/content-library.service'
import { qDate } from '../../hub/utils/format'

type Variant = LibraryItem['variants'][number]

/** Package metadata for one language variant: ids, version, format and bookmark layout. */
export function PackageDetails({ item, variant }: { item: LibraryItem; variant: Variant }) {
  const spec = ITEM_SPECS[item.courseKey as CourseKey]
  const rows: [string, string][] = [
    ['Package ID', variant.packageId],
    ['Shared course identity', item.courseKey],
    [
      'Language',
      `${variant.languageName} (${variant.language}, ${variant.language === 'ar' ? 'right-to-left' : 'left-to-right'})`,
    ],
    ['Format', item.formatLabel],
    ['Version', variant.version],
    ['Access group', variant.accessGroup ?? 'Not set'],
    ['Published', qDate(variant.publishedAt)],
    ['Launch URL', variant.launchUrl ?? 'None'],
    ['Bookmark layout', spec ? `${spec.bookmarkSchema} · ${spec.positions} positions` : 'Unknown'],
  ]
  return (
    <div className="flex flex-col gap-3">
      <dl className="grid gap-2 rounded-lg border bg-white p-4 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="grid gap-0.5 sm:grid-cols-[10rem_1fr] sm:gap-3">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="font-medium break-all text-ink">{value}</dd>
          </div>
        ))}
        {spec?.passMark ? (
          <div className="grid gap-0.5 sm:grid-cols-[10rem_1fr] sm:gap-3">
            <dt className="text-muted-foreground">Pass mark</dt>
            <dd className="grid gap-1 font-medium text-ink">
              {spec.passMark}% (2 of 3 questions)
              <DemoSettingsNote className="w-fit" />
            </dd>
          </div>
        ) : null}
      </dl>
    </div>
  )
}
