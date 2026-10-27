import { queryOptions, useMutation } from '@tanstack/react-query'
import { env } from '@/config/env'
import { ApiError, api, unwrap } from '@/lib/api'

export const myCertificatesQuery = () =>
  queryOptions({
    queryKey: ['certificates', 'mine'],
    queryFn: () => unwrap(api.certificates.mine.$get()),
  })

export const certificateQuery = (code: string) =>
  queryOptions({
    queryKey: ['certificates', 'detail', code],
    queryFn: () => unwrap(api.certificates[':code'].$get({ param: { code } })),
  })

export const verifyQuery = (code: string) =>
  queryOptions({
    queryKey: ['certificates', 'verify', code],
    queryFn: () => unwrap(api.certificates.verify[':code'].$get({ param: { code } })),
    retry: false,
  })

/** Downloads the watermarked PDF with the session cookie and saves it. */
export function useDownloadCertificate() {
  return useMutation({
    mutationFn: async (code: string) => {
      const res = await fetch(
        `${env.VITE_API_URL}/api/certificates/${encodeURIComponent(code)}/pdf`,
        {
          credentials: 'include',
        },
      )
      if (!res.ok)
        throw new ApiError(res.status, 'DOWNLOAD_FAILED', 'The certificate could not be downloaded')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${code}.pdf`
      document.body.append(link)
      link.click()
      link.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 2_000)
    },
  })
}
