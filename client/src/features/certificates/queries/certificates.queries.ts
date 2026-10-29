import { queryOptions, useMutation } from '@tanstack/react-query'
import { downloadBlob } from '@/lib/download'
import * as certificates from '@/services/certificates.service'

export const myCertificatesQuery = () =>
  queryOptions({
    queryKey: ['certificates', 'mine'],
    queryFn: () => certificates.listMine(),
  })

export const certificateQuery = (code: string) =>
  queryOptions({
    queryKey: ['certificates', 'detail', code],
    queryFn: () => certificates.getCertificate(code),
  })

export const verifyQuery = (code: string) =>
  queryOptions({
    queryKey: ['certificates', 'verify', code],
    queryFn: () => certificates.verify(code),
    retry: false,
  })

/** Draws the watermarked PDF in the browser and saves it. */
export function useDownloadCertificate() {
  return useMutation({
    mutationFn: async (code: string) => {
      const { blob, filename } = await certificates.certificatePdf(code)
      downloadBlob(blob, filename)
    },
  })
}
