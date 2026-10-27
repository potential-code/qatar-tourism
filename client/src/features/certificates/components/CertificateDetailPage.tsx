import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Download, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'
import { Reveal } from '@/components/motion/Reveal'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { LoadError } from '@/features/learning/components/LoadError'
import { certificateQuery, useDownloadCertificate } from '../queries/certificates.queries'
import { CertificateCanvas } from './CertificateCanvas'

export function CertificateDetailPage({ code }: { code: string }) {
  const cert = useQuery(certificateQuery(code))
  const download = useDownloadCertificate()
  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs
        items={[{ label: 'Certificates', to: '/learner/certificates' }, { label: code }]}
      />
      {cert.isLoading ? (
        <Skeleton className="aspect-[1.41] w-full rounded-xl" aria-label="Loading certificate" />
      ) : cert.error || !cert.data ? (
        <LoadError
          error={cert.error}
          onRetry={() => void cert.refetch()}
          title="This certificate could not be opened"
        />
      ) : (
        <>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="font-display text-3xl font-light text-ink md:text-4xl">
                Demonstration certificate
              </h1>
              <p className="text-muted-foreground">
                A verifiable demo record. Not a guide licence.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={() =>
                  download.mutate(code, {
                    onError: () => toast.error('The PDF could not be downloaded. Try again.'),
                  })
                }
                disabled={download.isPending}
              >
                <Download aria-hidden /> {download.isPending ? 'Preparing PDF' : 'Download PDF'}
              </Button>
              <Button asChild variant="outline">
                <Link to="/certificates/verify/$id" params={{ id: code }} target="_blank">
                  <ExternalLink aria-hidden /> Verification page
                </Link>
              </Button>
            </div>
          </div>
          <Reveal>
            <CertificateCanvas
              learnerName={cert.data.learnerName}
              programmeTitle={cert.data.programmeTitle}
              code={cert.data.code}
              completedAt={cert.data.completedAt}
              status={cert.data.status}
            />
          </Reveal>
        </>
      )}
    </div>
  )
}
