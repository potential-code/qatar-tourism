import { Link } from '@tanstack/react-router'
import { Download, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { useDownloadCertificate } from '@/features/certificates/queries/certificates.queries'

/** Certification report row: the watermarked PDF and the public verification page. */
export function CertificateActions({ code }: { code: string }) {
  const download = useDownloadCertificate()
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant="outline"
        disabled={download.isPending}
        onClick={() =>
          download.mutate(code, {
            onError: () => toast.error('The certificate PDF could not be downloaded. Try again.'),
          })
        }
      >
        <Download aria-hidden />
        Download certificate PDF
      </Button>
      <Button asChild variant="ghost">
        <Link to="/certificates/verify/$id" params={{ id: code }}>
          <ShieldCheck aria-hidden />
          Verification page
        </Link>
      </Button>
    </div>
  )
}
