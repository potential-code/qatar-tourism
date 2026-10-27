import { describe, expect, test } from 'bun:test'
import {
  ACTIONS,
  ADMIN_LEARNER_FIELDS,
  accessFor,
  can,
  EXPORT_BLOCKED_MESSAGE,
  PERMISSION_MATRIX,
  pickVisibleLearnerFields,
  TRAINER_LEARNER_FIELDS,
  visibleLearnerFields,
} from './permissions'

describe('permission matrix (brief §11)', () => {
  test('every action has an entry for all three roles', () => {
    for (const action of ACTIONS) {
      const row = PERMISSION_MATRIX[action]
      expect(['none', 'own', 'assigned', 'authorised']).toContain(row.learner)
      expect(['none', 'own', 'assigned', 'authorised']).toContain(row.trainer)
      expect(['none', 'own', 'assigned', 'authorised']).toContain(row.admin)
    }
  })

  test('learners cannot do anything administrative or trainer-only', () => {
    for (const action of [
      'session.create',
      'marking.record',
      'export.personal',
      'path.change',
      'analytics.use',
      'permissions.manage',
      'demo.reset',
      'audit.view',
      'certificate.revoke',
    ] as const) {
      expect(can('learner', action)).toBe(false)
    }
  })

  test('a learner sees only their own profile and results', () => {
    expect(accessFor('learner', 'profile.view')).toBe('own')
    expect(accessFor('learner', 'export.marks')).toBe('own')
    expect(accessFor('learner', 'contact.view')).toBe('own')
  })

  test('trainers: assigned data only, own programmes, no personal-data export, no contact data', () => {
    expect(accessFor('trainer', 'profile.view')).toBe('assigned')
    expect(accessFor('trainer', 'session.create')).toBe('own')
    expect(accessFor('trainer', 'marking.record')).toBe('assigned')
    expect(can('trainer', 'export.personal')).toBe(false)
    expect(can('trainer', 'contact.view')).toBe(false)
    expect(can('trainer', 'analytics.use')).toBe(false)
    expect(can('trainer', 'path.change')).toBe(false)
    expect(can('trainer', 'permissions.manage')).toBe(false)
  })

  test('a trainer marks exports of learner ID and score only', () => {
    expect(accessFor('trainer', 'export.marks')).toBe('assigned')
    expect(PERMISSION_MATRIX['export.marks'].note.trainer).toBe(
      'Optional learner ID and score only',
    )
  })

  test('admins hold the authorised scope for every action except learner submissions', () => {
    for (const action of ACTIONS) {
      if (action === 'assignment.submit') expect(can('admin', action)).toBe(false)
      else expect(accessFor('admin', action)).toBe('authorised')
    }
  })

  test('only admins change paths and certificates, with an audit trail', () => {
    expect(can('admin', 'path.change')).toBe(true)
    expect(PERMISSION_MATRIX['path.change'].note.admin).toBe('Yes with audit trail')
    expect(can('admin', 'certificate.revoke')).toBe(true)
  })

  test('the blocked-export message is the brief wording', () => {
    expect(EXPORT_BLOCKED_MESSAGE).toBe(
      'Your role does not allow this export. Contact the Academy administrator.',
    )
  })
})

describe('learner field visibility', () => {
  const record = {
    learnerCode: 'L0001',
    displayName: 'Maha Al Nouri',
    email: 'learner0001@example.com',
    mobile: '+000',
    jobTitle: 'Guest Relations Officer',
    accessibilityRequest: 'Needs transcripts',
  }

  test('trainers see learner ID and display name only', () => {
    expect([...TRAINER_LEARNER_FIELDS]).toEqual(['learnerCode', 'displayName'])
    expect(pickVisibleLearnerFields('trainer', record)).toEqual({
      learnerCode: 'L0001',
      displayName: 'Maha Al Nouri',
    })
  })

  test('trainers never get email, phone or accessibility notes', () => {
    const picked = pickVisibleLearnerFields('trainer', record)
    expect(picked).not.toHaveProperty('email')
    expect(picked).not.toHaveProperty('mobile')
    expect(picked).not.toHaveProperty('accessibilityRequest')
  })

  test('admins see profile fields but contact fields stay controlled', () => {
    expect(ADMIN_LEARNER_FIELDS).not.toContain('email')
    expect(ADMIN_LEARNER_FIELDS).not.toContain('mobile')
    expect(pickVisibleLearnerFields('admin', record)).toHaveProperty('jobTitle')
    expect(pickVisibleLearnerFields('admin', record)).not.toHaveProperty('email')
  })

  test('learners see their own contact details', () => {
    expect(visibleLearnerFields('learner')).toContain('email')
    expect(pickVisibleLearnerFields('learner', record)).toHaveProperty('email')
  })

  test('unknown keys are dropped, never passed through', () => {
    const picked = pickVisibleLearnerFields('trainer', { ...record, passwordHash: 'x' } as never)
    expect(picked).not.toHaveProperty('passwordHash')
  })
})
