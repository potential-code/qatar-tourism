import { useQuery } from '@tanstack/react-query'
import { Download } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { downloadBlob } from '@/lib/download'
import { templateSamplePdf } from '@/services/cpd.service'
import { Panel } from '../../hub/components/Panel'
import { ErrorPanel } from '../../hub/components/QueryStates'
import { templatesQuery } from '../queries/certificates-admin.queries'

const FIELDS = [
  'Learner name',
  'Programme title',
  'Credential ID',
  'Completion date',
  'Expiry date',
  'Status',
  'Dummy verification link',
]

/** Certificate templates. One Program A template; Program B has no programme certificate. */
export function TemplatesTab() {
  const query = useQuery(templatesQuery())
  if (query.isError) return <ErrorPanel error={query.error} onRetry={() => void query.refetch()} />
  return (
    <div className="grid gap-6">
      {(query.data?.items ?? []).map((template) => (
        <Panel
          key={template.id}
          title={template.name}
          description={`Rule version ${template.ruleVersion}. ${template.issued} credentials issued from this template.`}
          action={
            <Button
              variant="outline"
              onClick={async () => {
                try {
                  const { blob, filename } = await templateSamplePdf()
                  downloadBlob(blob, filename)
                } catch {
                  toast.error('The sample PDF could not be created')
                }
              }}
            >
              <Download aria-hidden /> Download sample PDF
            </Button>
          }
        >
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <h3 className="mb-2 text-sm font-medium">Fields on the certificate</h3>
              <ul className="grid gap-1.5 text-sm">
                {FIELDS.map((field) => (
                  <li key={field} className="rounded-md bg-muted px-3 py-1.5">
                    {field}
                  </li>
                ))}
              </ul>
            </div>
            <div className="grid content-start gap-3 text-sm">
              <div className="relative overflow-hidden rounded-xl border bg-sand p-5 text-center">
                <p
                  aria-hidden
                  className="pointer-events-none absolute inset-0 grid -rotate-[14deg] place-items-center text-3xl font-semibold text-maroon/10"
                >
                  {template.watermark}
                </p>
                <p className="text-xs tracking-widest text-teal-deep">QATAR TOURISM ACADEMY</p>
                <p className="font-display text-lg text-ink">Certificate of training completion</p>
                <p className="text-muted-foreground">Sample Learner</p>
              </div>
              <p className="text-muted-foreground">
                Every certificate and downloaded PDF carries the visible watermark{' '}
                <strong>{template.watermark}</strong> and a link to a dummy status page. Wording
                states that it is a training record, not a licence.
              </p>
            </div>
          </div>
        </Panel>
      ))}
    </div>
  )
}
