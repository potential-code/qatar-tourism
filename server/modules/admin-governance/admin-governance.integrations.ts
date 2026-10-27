import type { IntegrationState } from '@shared/schemas/admin-governance'
import type { integrationEvidence } from './admin-governance.service'

type Evidence = Awaited<ReturnType<typeof integrationEvidence>>

export type Integration = {
  key: 'crm' | 'sso' | 'email' | 'classroom'
  name: string
  purpose: string
  state: IntegrationState
  evidence: string[]
  intended: string
}

/**
 * Integration states for the demo (brief §1, §14). A state is "Connected" only when a provider
 * has confirmed traffic; nothing in this trial is connected, and the evidence says why.
 */
export function integrations(e: Evidence): Integration[] {
  return [
    {
      key: 'crm',
      name: 'CRM registration and synchronisation',
      purpose: 'Link Academy registrations to the customer CRM.',
      state: 'Not connected',
      evidence: [
        'No CRM endpoint or credentials are configured in this environment.',
        'Registrations are stored only in the demo database; nothing is synchronised.',
      ],
      intended:
        'On approval, new registrations would create or match a CRM contact and sync programme status.',
    },
    {
      key: 'sso',
      name: 'Single sign-on for internal tools',
      purpose: 'Let staff sign in with their organisation identity.',
      state: 'Demo',
      evidence: [
        'The sign-in screen offers a simulated SSO option, labelled as simulated.',
        'No identity provider is configured, so no identity is authenticated by Qatar Tourism.',
      ],
      intended:
        'On approval, sign-in would redirect to the approved identity provider and map roles.',
    },
    {
      key: 'email',
      name: 'Outbound email',
      purpose: 'Confirmations, reschedules, cancellations and invitations.',
      state: e.emailSent > 0 ? 'Connected' : 'Demo',
      evidence: [
        `${e.emailSimulated.toLocaleString('en-GB')} demo emails are in the notification log as simulated.`,
        `${e.emailSent} confirmed sent by a provider, ${e.emailQueued} queued, ${e.emailFailed} failed.`,
        'No external email is sent from this demonstration.',
      ],
      intended:
        'On approval, a test-email service would report queued, sent or failed per message.',
    },
    {
      key: 'classroom',
      name: 'Online classroom (Teams or Zoom)',
      purpose: 'Meeting rooms and join links for live online sessions.',
      state: 'Demo',
      evidence: [
        `${e.onlineSessions} live online sessions use demo meeting-room references.`,
        `${e.inPersonSessions} in-person sessions use fictional venues.`,
        'No meeting is created on an external platform.',
      ],
      intended:
        'On IT approval, scheduling a session would create the meeting and share the join link.',
    },
  ]
}
