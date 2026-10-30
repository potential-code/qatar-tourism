import { InProgress } from '@/components/layout/InProgress'
import { ManagePage } from '../../hub/components/ManagePage'

/** Content Library (SPEC §3). Foundation stub: the owning lane replaces the body, keeping the ManagePage frame. */
export function ContentLibraryPage() {
  return (
    <ManagePage
      title="Content Library"
      description="Bilingual SCORM and xAPI packages with previews and tracking tests."
    >
      <InProgress />
    </ManagePage>
  )
}
