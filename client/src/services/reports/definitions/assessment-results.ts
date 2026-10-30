import { learnerDisplayId } from '@shared/utils/identity'
import { db } from '../../api'
import { settleAllExpired } from '../../assessments/attempts'
import { activeRule, allowance, countedScore } from '../../assessments/rules'
import type { ReportDefinition, ReportRow } from '../types'

const KIND_LABEL = { pre: 'Pre-assessment', post: 'Post-assessment' } as const
const LANGUAGE_LABEL = { en: 'English', ar: 'Arabic' } as const

/**
 * Reports, Assessment Results (SPEC §6): one row per learner and assessment, from the attempts
 * the rules engine recorded, with the attempts used, language, outcome and the score that counts.
 */
export const assessmentResultsReport: ReportDefinition = {
  key: 'assessment-results',
  title: 'Assessment results',
  description:
    'Pre and post assessment outcomes per learner: attempts used, language, pass or fail and the score that counts. Demo settings, subject to Qatar Tourism confirmation.',
  filterScope: 'cohort',
  columns: [
    { key: 'learnerCode', header: 'Learner ID', type: 'code', field: 'learnerCode' },
    { key: 'name', header: 'Learner', type: 'text', field: 'displayName' },
    { key: 'programme', header: 'Programme', type: 'programme' },
    { key: 'assessment', header: 'Assessment', type: 'text' },
    { key: 'language', header: 'Language', type: 'text' },
    { key: 'attempts', header: 'Attempts', type: 'number' },
    { key: 'attemptLimit', header: 'Allowed', type: 'number' },
    { key: 'remaining', header: 'Attempts left', type: 'number' },
    { key: 'result', header: 'Result', type: 'status' },
    { key: 'best', header: 'Best score', type: 'score' },
    { key: 'counted', header: 'Counted score', type: 'score' },
    { key: 'latest', header: 'Latest score', type: 'score', detailOnly: true },
    { key: 'passMark', header: 'Pass mark', type: 'percent', detailOnly: true },
    { key: 'ruleVersion', header: 'Rule version', type: 'code', detailOnly: true },
    { key: 'lastSubmitted', header: 'Last submitted', type: 'date' },
  ],
  statusKey: 'result',
  statusOptions: [
    { value: 'Passed', label: 'Passed' },
    { value: 'Not passed', label: 'Not passed' },
    { value: 'Attempt limit reached', label: 'Attempt limit reached' },
    { value: 'Baseline recorded', label: 'Baseline recorded' },
    { value: 'In progress', label: 'In progress' },
  ],
  defaultSort: { key: 'lastSubmitted', direction: 'desc' },
  searchKeys: ['learnerCode', 'name', 'assessment', 'language', 'result'],
  load({ cohort }) {
    settleAllExpired()
    const assessments = new Map(db.assessments.map((a) => [a.id, a]))
    const byEnrolment = new Map(cohort.map((fact) => [fact.enrolmentId, fact]))
    const groups = new Map<string, typeof db.assessmentAttempts>()
    for (const attempt of db.assessmentAttempts) {
      const kind = assessments.get(attempt.assessmentId)?.kind
      if (!byEnrolment.has(attempt.enrolmentId) || (kind !== 'pre' && kind !== 'post')) continue
      const key = `${attempt.enrolmentId}:${attempt.assessmentId}`
      groups.set(key, [...(groups.get(key) ?? []), attempt])
    }
    const rows: ReportRow[] = []
    for (const [key, attempts] of groups) {
      const first = attempts[0]
      const fact = first ? byEnrolment.get(first.enrolmentId) : undefined
      const assessment = first ? assessments.get(first.assessmentId) : undefined
      if (!first || !fact || !assessment) continue
      const kind = assessment.kind as 'pre' | 'post'
      const programme = fact.programme === 'A' || fact.programme === 'B' ? fact.programme : null
      const rule = programme ? activeRule(programme, kind) : null
      const ordered = [...attempts].sort((a, b) => a.attemptNo - b.attemptNo)
      const submitted = ordered.filter((a) => a.status === 'submitted')
      const latest = submitted[submitted.length - 1]
      const lastWithRule = [...ordered].reverse().find((a) => a.ruleId !== null)
      const pass = lastWithRule?.ruleId
        ? (db.assessmentRules.find((r) => r.id === lastWithRule.ruleId)?.passPercent ?? null)
        : (assessment.passPercent ?? rule?.passPercent ?? null)
      const policy = rule?.scorePolicy ?? 'best'
      const counted = countedScore(policy, ordered)
      const best = countedScore('best', ordered)
      const open = ordered.some((a) => a.status === 'in_progress')
      const standing = rule ? allowance(rule, first.enrolmentId, first.assessmentId) : null
      const result =
        open && submitted.length === 0
          ? 'In progress'
          : pass === null
            ? 'Baseline recorded'
            : counted !== null && counted >= pass
              ? 'Passed'
              : standing && standing.remaining === 0 && !open
                ? 'Attempt limit reached'
                : 'Not passed'
      const language =
        latest?.snapshot?.items[0]?.language ?? ordered.at(-1)?.snapshot?.items[0]?.language ?? 'en'
      rows.push({
        id: key,
        learnerId: fact.learnerId,
        learnerCode: learnerDisplayId(fact.learnerCode),
        name: fact.learnerName,
        programme: fact.programme,
        assessment: KIND_LABEL[kind],
        language: LANGUAGE_LABEL[language],
        attempts: ordered.length,
        attemptLimit: standing ? standing.limit + standing.granted : null,
        remaining: standing ? standing.remaining : null,
        result,
        best,
        counted,
        latest: latest?.score ?? null,
        passMark: pass,
        ruleVersion: lastWithRule?.ruleVersion ? `v${lastWithRule.ruleVersion}` : 'Seeded history',
        lastSubmitted: latest?.submittedAt ?? null,
      })
    }
    return rows
  },
  summarise(rows) {
    const decided = rows.filter(
      (r) =>
        r.result === 'Passed' || r.result === 'Not passed' || r.result === 'Attempt limit reached',
    )
    const passed = decided.filter((r) => r.result === 'Passed').length
    const arabic = rows.filter((r) => r.language === 'Arabic').length
    return [
      { label: 'Learner assessments', value: rows.length.toLocaleString('en-GB') },
      {
        label: 'Pass rate (post)',
        value: decided.length ? `${Math.round((passed / decided.length) * 100)}%` : 'None',
      },
      {
        label: 'Attempt limit reached',
        value: String(rows.filter((r) => r.result === 'Attempt limit reached').length),
      },
      { label: 'Taken in Arabic', value: String(arabic) },
    ]
  },
}
