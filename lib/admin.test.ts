import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { describeAuditEntry, isAdminRole, isValidAdminEmail, type AdminAuditEntry } from './admin'

const base: AdminAuditEntry = {
  id: 'a1',
  action: 'grant',
  targetUid: 't',
  targetEmail: 'ops@nessa.test',
  role: 'admin',
  previousRole: null,
  actorUid: 's',
  actorEmail: 'chris@nessa.test',
  note: null,
  at: '2026-10-24T10:00:00.000Z',
}

describe('admin helpers', () => {
  it('isAdminRole / isValidAdminEmail', () => {
    assert.equal(isAdminRole('admin'), true)
    assert.equal(isAdminRole('super_admin'), true)
    assert.equal(isAdminRole('owner'), false)
    assert.equal(isValidAdminEmail(' ops@nessa.test '), true)
    assert.equal(isValidAdminEmail('ops@nessa'), false)
    assert.equal(isValidAdminEmail('not an email'), false)
  })

  it('describeAuditEntry covers every action', () => {
    assert.equal(describeAuditEntry(base), 'chris@nessa.test added ops@nessa.test as Admin')
    assert.equal(
      describeAuditEntry({ ...base, action: 'role_change', role: 'super_admin', previousRole: 'admin' }),
      'chris@nessa.test changed ops@nessa.test from Admin to Super Admin',
    )
    assert.equal(
      describeAuditEntry({ ...base, action: 'revoke', role: null, previousRole: 'super_admin' }),
      'chris@nessa.test removed ops@nessa.test (Super Admin)',
    )
    assert.equal(
      describeAuditEntry({ ...base, action: 'bootstrap', role: 'super_admin', actorUid: 'bootstrap-script', actorEmail: null }),
      'Initial setup made ops@nessa.test Super Admin',
    )
  })
})
