import type { LicenceStatus } from '@shared/constants'
import { ApiError, commit, db, delay, out, requireCapability, requireRole } from './api'
import { audit } from './audit.service'
import { patchCrmConfig } from './crm/common'
import {
  type AdvanceInput,
  type AdvanceResult,
  advanceScenario,
  SCENARIO_CRM_ID,
  SCENARIO_LEARNER_CODE,
  SCENARIO_STEPS,
  scenarioState,
} from './crm/scenario'

/** The presenter-driven CRM scenario (SPEC §9). See `crm/scenario.ts` for the rules. */

export type StepStatus = 'done' | 'current' | 'pending'

export type ScenarioView = {
  runId: number
  step: number
  complete: boolean
  simulatedEvidence: boolean
  steps: { n: number; title: string; actor: string; status: StepStatus }[]
  log: ReturnType<typeof scenarioState>['log']
  learner: { display: string; name: string; crmId: string }
  licence: { status: LicenceStatus; pending: string | null; updatedAt: string } | null
}

function view(): ScenarioView {
  const state = scenarioState()
  const profile = db.profiles.find((p) => p.learnerCode === SCENARIO_LEARNER_CODE)
  if (!profile) throw ApiError.notFound('The scenario learner was not found')
  const licence = db.licenceStatus.find((l) => l.learnerId === profile.userId)
  return {
    runId: state.runId,
    step: state.step,
    complete: state.step >= SCENARIO_STEPS.length,
    simulatedEvidence: state.simulatedEvidence,
    steps: SCENARIO_STEPS.map((s) => ({
      ...s,
      status: s.n <= state.step ? 'done' : s.n === state.step + 1 ? 'current' : 'pending',
    })),
    log: state.log,
    learner: { display: 'LRN-0042', name: profile.fullName, crmId: SCENARIO_CRM_ID },
    licence: licence
      ? {
          status: licence.status,
          pending: licence.pendingRequest
            ? `Review request for "${licence.pendingRequest.requestedStatus}" is pending until the CRM acknowledges it.`
            : null,
          updatedAt: licence.updatedAt,
        }
      : null,
  }
}

export async function getCrmScenario(): Promise<ScenarioView> {
  await delay()
  requireRole('admin')
  return out(view())
}

export async function advanceCrmScenario(
  input: AdvanceInput = {},
): Promise<{ result: AdvanceResult; scenario: ScenarioView }> {
  await delay()
  const user = requireCapability('integration.configure')
  const result = advanceScenario({ id: user.id, role: user.role, name: user.name }, input)
  commit()
  return { result: out(result), scenario: out(view()) }
}

/** Clears the run. Events already recorded stay in the log; nothing is deleted. */
export async function resetCrmScenario(): Promise<ScenarioView> {
  await delay()
  requireCapability('integration.configure')
  patchCrmConfig({ scenario: null })
  audit({
    action: 'crm.scenario.reset',
    objectType: 'crm_scenario',
    reason: 'Scenario restarted by the presenter.',
  })
  commit()
  return out(view())
}
