import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import { auditTargetPlaceId, describeAuditChange, toSlugPrefix, type ConsoleAuditItem } from './admin-console'

const base: ConsoleAuditItem = {
  id: 'a', scope: 'chat', action: 'retention_change', at: null, actorUid: 'u', actorEmail: 'a@x.dev', actorKind: null,
  targetType: 'place_chat', targetId: 'ChIJx', targetLabel: 'Cumbuco Chat', targetEmail: null, role: null, previousRole: null,
  details: { previousHours: 24, hours: 168 }, note: null,
}

describe('admin console helpers', () => {
  it('toSlugPrefix turns names into address prefixes', () => {
    assert.equal(toSlugPrefix('  Café Tortoni '), 'cafe-tortoni')
    assert.equal(toSlugPrefix('São Luís'), 'sao-luis')
    assert.equal(toSlugPrefix('cumbuco'), 'cumbuco')
    assert.equal(toSlugPrefix('  '), '')
  })
  it('describes audit entries in plain words', () => {
    assert.equal(describeAuditChange(base), 'set Cumbuco Chat messages to last 7 days (was 24 hours)')
    assert.equal(
      describeAuditChange({ ...base, scope: 'business', action: 'claim_approve', targetType: 'business', targetLabel: 'Kite Group', details: { email: 'o@x.dev', grantedRole: 'staff', placeId: 'ChIJp' } }),
      'approved o@x.dev as manager of Kite Group',
    )
    assert.equal(
      describeAuditChange({ ...base, scope: 'places', action: 'wifi_update', targetType: 'place', targetLabel: 'Kite Hotel', details: { networkName: 'Guests', isPublic: true, hasNote: false } }),
      'set the guest Wi-Fi to “Guests” at Kite Hotel',
    )
    assert.equal(describeAuditChange({ ...base, scope: 'places', action: 'wifi_remove', targetType: 'place', targetLabel: 'Kite Hotel', details: {} }), 'removed the guest Wi-Fi at Kite Hotel')
    assert.equal(auditTargetPlaceId({ ...base, scope: 'places', action: 'wifi_remove', targetType: 'place', targetId: 'ChIJh' }), 'ChIJh')
    assert.equal(describeAuditChange({ ...base, scope: 'admins', action: 'role_change', targetEmail: 'b@x.dev', role: 'admin', previousRole: 'super_admin' }), 'changed b@x.dev from Super Admin to Admin')
  })
  it('links entries to their place', () => {
    assert.equal(auditTargetPlaceId(base), 'ChIJx')
    assert.equal(auditTargetPlaceId({ ...base, targetType: 'business', targetId: 'biz', details: { placeId: 'ChIJp' } }), 'ChIJp')
    assert.equal(auditTargetPlaceId({ ...base, targetType: 'admin_user', details: null }), null)
  })
})
