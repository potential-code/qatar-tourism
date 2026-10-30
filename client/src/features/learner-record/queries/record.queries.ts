import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { downloadBlob } from '@/lib/download'
import * as certificates from '@/services/certificates.service'
import * as record from '@/services/credentials/learner-record.service'
import * as renewal from '@/services/credentials/renewal.service'
import * as external from '@/services/external-certificates.service'
import * as licence from '@/services/licence.service'

export const recordKeys = {
  all: ['record'] as const,
  mine: () => [...recordKeys.all, 'mine'] as const,
  licence: () => [...recordKeys.all, 'licence'] as const,
  learner: (userId: string) => [...recordKeys.all, 'learner', userId] as const,
  renewal: (code: string) => [...recordKeys.all, 'renewal', code] as const,
}

export const myRecordQuery = () =>
  queryOptions({ queryKey: recordKeys.mine(), queryFn: () => record.getMyRecord() })

/** The learner's own licence field (CRM-sourced, illustrative) for the profile page. */
export const myLicenceQuery = () =>
  queryOptions({ queryKey: recordKeys.licence(), queryFn: () => licence.getMyLicence() })

/** Admin read of one learner's record (learner detail page). */
export const learnerRecordQuery = (userId: string) =>
  queryOptions({
    queryKey: recordKeys.learner(userId),
    queryFn: () => record.getLearnerRecord(userId),
  })

export const renewalQuery = (code: string) =>
  queryOptions({ queryKey: recordKeys.renewal(code), queryFn: () => renewal.getRenewal(code) })

/** Every record write refreshes the record, certificates, notifications and the admin views. */
function useRefresh() {
  const client = useQueryClient()
  return async () => {
    await Promise.all(
      [['record'], ['certificates'], ['notifications'], ['admin']].map((queryKey) =>
        client.invalidateQueries({ queryKey }),
      ),
    )
  }
}

export function useRenewalActions(code: string) {
  const refresh = useRefresh()
  const options = { onSuccess: refresh }
  return {
    start: useMutation({ mutationFn: () => renewal.startRenewal(code), ...options }),
    retraining: useMutation({ mutationFn: () => renewal.completeRetraining(code), ...options }),
    refresher: useMutation({ mutationFn: () => renewal.completeRefresher(code), ...options }),
    check: useMutation({
      mutationFn: (answers: Record<string, string>) => renewal.submitRenewalCheck(code, answers),
      ...options,
    }),
    complete: useMutation({ mutationFn: () => renewal.completeRenewal(code), ...options }),
  }
}

export function useSubmitExternal() {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: (input: external.ExternalSubmission) => external.submit(input),
    onSuccess: refresh,
  })
}

export function useRespondToInfoRequest() {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: ({ id, note }: { id: string; note: string }) =>
      external.respondToInfoRequest(id, note),
    onSuccess: refresh,
  })
}

/** Opens the stored evidence PDF (the learner's own upload, or the generated sample). */
export function useDownloadEvidence() {
  return useMutation({
    mutationFn: async (id: string) => {
      const { blob, filename } = await external.evidenceFile(id)
      downloadBlob(blob, filename)
    },
  })
}

export function useDownloadCredentialPdf() {
  return useMutation({
    mutationFn: async (code: string) => {
      const { blob, filename } = await certificates.certificatePdf(code)
      downloadBlob(blob, filename)
    },
  })
}
