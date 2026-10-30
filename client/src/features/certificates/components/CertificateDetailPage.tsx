import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Download, ExternalLink } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'
import { Reveal } from '@/components/motion/Reveal'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { LoadError } from '@/features/learning/components/LoadError'
import { certificateQuery, useDownloadCertificate } from '../queries/certificates.queries'
import { CertificateCanvas } from './CertificateCanvas'

export function CertificateDetailPage({ code }: { code: string }) {
  const { t } = useTranslation('record')
  const cert = useQuery(certificateQuery(code))
  const download = useDownloadCertificate()
  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs
        items={[
          { label: t('certificate.detail.crumb'), to: '/learner/certificates' },
          { label: code },
        ]}
      />
      {cert.isLoading ? (
        <Skeleton
          className="aspect-[1.41] w-full rounded-xl"
          aria-label={t('certificate.detail.loading')}
        />
      ) : cert.error || !cert.data ? (
        <LoadError
          error={cert.error}
          onRetry={() => void cert.refetch()}
          title={t('certificate.detail.loadError')}
        />
      ) : (
        <>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="font-display text-3xl font-light text-ink md:text-4xl">
                {t('certificate.detail.title')}
              </h1>
              <p className="text-muted-foreground">{t('certificate.detail.subtitle')}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={() =>
                  download.mutate(code, {
                    onError: () => toast.error(t('certificate.detail.downloadFailed')),
                  })
                }
                disabled={download.isPending}
              >
                <Download aria-hidden />{' '}
                {download.isPending
                  ? t('certificate.detail.preparing')
                  : t('certificate.detail.download')}
              </Button>
              <Button asChild variant="outline">
                <Link to="/certificates/verify/$id" params={{ id: code }} target="_blank">
                  <ExternalLink aria-hidden /> {t('certificate.detail.verification')}
                </Link>
              </Button>
              <Button asChild variant="ghost">
                <Link to="/learner/record">{t('certificate.detail.openRecord')}</Link>
              </Button>
            </div>
          </div>
          <Reveal>
            <CertificateCanvas
              learnerName={cert.data.learnerName}
              programmeTitle={cert.data.programmeTitle}
              code={cert.data.code}
              completedAt={cert.data.completedAt}
              expiresAt={cert.data.expiresAt}
              lifecycle={cert.data.lifecycle}
            />
          </Reveal>
          <p className="text-sm text-muted-foreground">{t('certificate.detail.renewalNote')}</p>
        </>
      )}
    </div>
  )
}
