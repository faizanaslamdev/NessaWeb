import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  businessAccessSnapshotAction,
  businessInboxHref,
  parseBusinessAccess,
  staffIdsByBusiness,
  teamBusinessIds,
} from './business-access'

describe('parseBusinessAccess', () => {
  it('keeps valid memberships and drops malformed ones', () => {
    const memberships = parseBusinessAccess({
      memberships: [
        { businessId: 'biz1', role: 'owner', staffId: 'staffOwn00001', placeIds: ['ChIJa', 'ChIJb'], businessName: 'Casa', places: [] },
        { businessId: 'biz2', role: 'staff', placeIds: ['ChIJc', 3], businessName: ' ' },
        { businessId: 'biz3', role: 'admin', placeIds: [] },
        { role: 'owner' },
        null,
        'x',
      ],
    })
    assert.deepEqual(memberships, [
      { businessId: 'biz1', role: 'owner', staffId: 'staffOwn00001', placeIds: ['ChIJa', 'ChIJb'], businessName: 'Casa' },
      { businessId: 'biz2', role: 'staff', staffId: null, placeIds: ['ChIJc'], businessName: 'Business' },
    ])
    assert.deepEqual(teamBusinessIds(memberships), ['biz1', 'biz2'])
    // The viewer's own staffId per business ("You" vs "Team"); none yet → left out.
    assert.deepEqual(staffIdsByBusiness(memberships), { biz1: 'staffOwn00001' })
  })
  it('handles a missing or empty doc', () => {
    assert.deepEqual(parseBusinessAccess(undefined), [])
    assert.deepEqual(parseBusinessAccess({}), [])
    assert.deepEqual(parseBusinessAccess({ memberships: [] }), [])
  })
})

describe('businessAccessSnapshotAction', () => {
  it('uses the doc, waits for the server, then syncs once', () => {
    assert.equal(businessAccessSnapshotAction({ exists: true, fromCache: true, syncRequested: false }), 'use')
    assert.equal(businessAccessSnapshotAction({ exists: false, fromCache: true, syncRequested: false }), 'wait')
    assert.equal(businessAccessSnapshotAction({ exists: false, fromCache: false, syncRequested: false }), 'sync')
    assert.equal(businessAccessSnapshotAction({ exists: false, fromCache: false, syncRequested: true }), 'empty')
  })
})

describe('businessInboxHref', () => {
  it('links to the business dashboard inbox', () => {
    assert.equal(businessInboxHref('biz1'), '/business/biz1/inbox')
  })
})
