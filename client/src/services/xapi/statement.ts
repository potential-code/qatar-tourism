import type { XapiStatementRow } from '@shared/types/db'
import { learnerDisplayId } from '@shared/utils/identity'
import { z } from 'zod'

/**
 * xAPI statement shapes for the simulated learning record store. The package sends complete
 * statements (actor, verb, object, result); the store keeps the fields of an `xapiStatements`
 * row and rebuilds the full statement from them for display. Nothing here talks to a network.
 */

export const LRS_LABEL = 'Simulated learning record store'
export const LRS_ENDPOINT = 'https://lrs.demo.invalid/xapi/'
export const ACTOR_HOME_PAGE = 'https://academy.demo.invalid'
export const ACTIVITY_BASE = 'https://lrs.demo.invalid/activities/'
const VERB_BASE = 'http://adlnet.gov/expapi/verbs/'

/** The verbs the sample activities send. IRIs follow the ADL registry. */
export const VERBS = ['initialized', 'experienced', 'answered', 'progressed', 'completed'] as const
export type Verb = (typeof VERBS)[number]

export const verbIri = (verb: string): string => `${VERB_BASE}${verb}`
const verbFromIri = (iri: string): string => iri.slice(iri.lastIndexOf('/') + 1)

export const statementInput = z.object({
  id: z.string().uuid().optional(),
  actor: z.object({
    objectType: z.literal('Agent').optional(),
    name: z.string().max(120).optional(),
    account: z.object({ homePage: z.string().url(), name: z.string().min(1).max(80) }),
  }),
  verb: z.object({
    id: z.string().url(),
    display: z.record(z.string(), z.string()).optional(),
  }),
  object: z.object({
    objectType: z.literal('Activity').optional(),
    id: z.string().url(),
    definition: z.object({ name: z.record(z.string(), z.string()).optional() }).optional(),
  }),
  result: z
    .object({
      completion: z.boolean().optional(),
      success: z.boolean().optional(),
      response: z.string().max(500).optional(),
      score: z
        .object({
          scaled: z.number().min(-1).max(1).optional(),
          raw: z.number().optional(),
          max: z.number().optional(),
        })
        .optional(),
      duration: z.string().max(40).optional(),
    })
    .optional(),
  timestamp: z.string().optional(),
})
export type StatementInput = z.infer<typeof statementInput>

/** The actor's account name for a learner: `LRN-0042`. */
export const actorAccountName = (learnerCode: string): string => learnerDisplayId(learnerCode)

export type Statement = {
  id: string
  actor: {
    objectType: 'Agent'
    name: string
    account: { homePage: string; name: string }
  }
  verb: { id: string; display: Record<string, string> }
  object: { objectType: 'Activity'; id: string; definition?: { name: Record<string, string> } }
  result?: Record<string, unknown>
  timestamp: string
  context: { extensions: Record<string, string> }
  stored: string
}

/** The full statement for a stored row. `actorName` and `account` come from the learner's profile. */
export function rowToStatement(
  row: XapiStatementRow,
  actor: { name: string; account: string },
): Statement {
  return {
    id: row.statementId,
    actor: {
      objectType: 'Agent',
      name: actor.name,
      account: { homePage: ACTOR_HOME_PAGE, name: actor.account },
    },
    verb: { id: verbIri(row.verb), display: { 'en-US': row.verb } },
    object: { objectType: 'Activity', id: row.activityId },
    ...(row.result ? { result: row.result } : {}),
    timestamp: row.timestamp,
    context: {
      extensions: {
        'https://lrs.demo.invalid/ext/package-id': row.packageId,
        'https://lrs.demo.invalid/ext/simulated': 'true',
      },
    },
    stored: row.timestamp,
  }
}

export const shortVerb = verbFromIri
