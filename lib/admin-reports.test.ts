import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  EMPTY_RESOLVE_DRAFT,
  applyResolvedReport,
  buildListReportsRequest,
  buildResolveRequest,
  describeReportsError,
  describeResolution,
  mergeReportPages,
  adminSenderLabel,
  parseAdminThread,
  parseReport,
  parseReportsPage,
  reportMatchesFilter,
  reportThreadStateLabel,
  type AdminReport,
} from './admin-reports'

const raw = {
  id: 'r1',
  threadId: 'biz_ChIJx_u1',
  businessId: 'biz',
  placeId: 'ChIJx',
  reporterRole: 'customer',
  reporterUid: 'u1',
  reason: ' Spam ',
  status: 'open',
  createdAt: 1000,
  thread: { businessName: 'Casa', placeName: 'Casa Cumbuco', customerName: 'Ana', status: 'open', customerBlocked: false },
}

const report = (over: Partial<AdminReport> = {}): AdminReport => ({ ...(parseReport(raw) as AdminReport), ...over })

describe('report parsing', () => {
  it('reads the documented fields', () => {
    const r = parseReport(raw)!
    assert.equal(r.reason, 'Spam')
    assert.equal(r.createdAtMs, 1000)
    assert.equal(r.resolution, null)
    assert.equal(r.thread?.businessName, 'Casa')
    assert.equal(parseReport({ ...raw, thread: null })?.thread, null)
    assert.equal(parseReport({ ...raw, id: '' }), null)
    assert.equal(parseReport({ ...raw, reporterRole: 'business', status: 'resolved', resolution: 'actioned', resolvedAt: 5 })?.resolvedAtMs, 5)
  })

  it('reads a page and its cursor', () => {
    assert.deepEqual(parseReportsPage({ reports: [raw, { nope: 1 }], nextCursor: 'c2' }).reports.map(r => r.id), ['r1'])
    assert.equal(parseReportsPage({ reports: [], nextCursor: null }).nextCursor, null)
    assert.equal(parseReportsPage({ reports: [], nextCursor: '' }).nextCursor, null)
    assert.deepEqual(parseReportsPage(null), { reports: [], nextCursor: null })
  })
})

describe('filters and cursor handling', () => {
  it('builds listReports with a clamped limit and the cursor only when continuing', () => {
    assert.deepEqual(buildListReportsRequest({ status: 'open' }), { action: 'listReports', status: 'open', limit: 25 })
    assert.deepEqual(buildListReportsRequest({ status: 'all', limit: 500, cursor: 'abc' }), {
      action: 'listReports',
      status: 'all',
      limit: 50,
      cursor: 'abc',
    })
    assert.equal(buildListReportsRequest({ status: 'resolved', limit: 0, cursor: null }).limit, 1)
    assert.equal('cursor' in buildListReportsRequest({ status: 'resolved', cursor: null }), false)
  })

  it('merges pages without duplicates', () => {
    const merged = mergeReportPages([report({ id: 'a' }), report({ id: 'b' })], [report({ id: 'b' }), report({ id: 'c' })])
    assert.deepEqual(merged.map(r => r.id), ['a', 'b', 'c'])
  })

  it('a resolved report leaves the Open list but stays in Resolved / All', () => {
    const list = [report({ id: 'a' }), report({ id: 'b' })]
    const resolved = report({ id: 'a', status: 'resolved', resolution: 'dismissed' })
    assert.deepEqual(applyResolvedReport(list, resolved, 'open').map(r => r.id), ['b'])
    assert.equal(applyResolvedReport(list, resolved, 'all')[0].status, 'resolved')
    assert.equal(reportMatchesFilter(resolved, 'open'), false)
    assert.equal(reportMatchesFilter(resolved, 'all'), true)
  })
})

describe('resolving', () => {
  it('sends extra actions only for "actioned"', () => {
    assert.deepEqual(buildResolveRequest('r1', { ...EMPTY_RESOLVE_DRAFT, blockThread: true, disableBusinessMessaging: true }), {
      action: 'resolveReport',
      reportId: 'r1',
      resolution: 'dismissed',
    })
    assert.deepEqual(
      buildResolveRequest('r1', { resolution: 'actioned', note: '  scam links \u0007', blockThread: true, disableBusinessMessaging: false }),
      { action: 'resolveReport', reportId: 'r1', resolution: 'actioned', note: 'scam links', blockThread: true },
    )
    assert.equal(buildResolveRequest('r1', { ...EMPTY_RESOLVE_DRAFT, note: 'x'.repeat(900) }).note?.length, 500)
  })

  it('asks for confirmation when users are affected', () => {
    const names = { businessName: 'Casa', customerName: 'Ana' }
    assert.equal(describeResolution(EMPTY_RESOLVE_DRAFT, names).destructive, false)
    assert.equal(describeResolution({ ...EMPTY_RESOLVE_DRAFT, resolution: 'actioned' }, names).destructive, false)
    const both = describeResolution({ ...EMPTY_RESOLVE_DRAFT, resolution: 'actioned', blockThread: true, disableBusinessMessaging: true }, names)
    assert.equal(both.destructive, true)
    assert.equal(both.effects.length, 2)
    assert.match(both.effects[1], /Messaging is turned off for Casa/)
  })
})

describe('conversation and labels', () => {
  it('parses getThread (ms timestamps, oldest first)', () => {
    const view = parseAdminThread(
      {
        thread: { businessId: 'biz', placeId: 'ChIJx', customerUid: 'u1', status: 'blocked', customerBlocked: true, updatedAt: 9 },
        messages: [
          { id: 'm2', senderRole: 'business', senderStaffId: 'staffA0000001', senderUid: 'owner1', senderName: 'Maria', text: 'b', createdAt: 2 },
          { id: 'm1', senderRole: 'customer', senderUid: 'u1', senderName: 'Lia', text: 'a', createdAt: 1, translations: { en: 'A' } },
          { text: 'no id' },
        ],
      },
      'biz_ChIJx_u1',
    )
    assert.equal(view.thread?.id, 'biz_ChIJx_u1')
    assert.equal(view.thread?.customerBlocked, true)
    assert.equal(view.thread?.updatedAtMs, 9)
    assert.deepEqual(view.messages.map(m => m.id), ['m1', 'm2'])
    assert.deepEqual(view.messages[0].translations, { en: 'A' })
    // Staff resolved server-side for moderators.
    assert.equal(view.messages[1].senderStaffId, 'staffA0000001')
    assert.equal(view.messages[1].senderUid, 'owner1')
    assert.equal(adminSenderLabel(view.messages[1], { businessName: 'Casa', customerName: 'Lia' }), 'Casa · Maria')
    assert.equal(adminSenderLabel({ ...view.messages[1], senderName: null }, { businessName: 'Casa', customerName: 'Lia' }), 'Casa')
    assert.equal(adminSenderLabel(view.messages[0], { businessName: 'Casa', customerName: 'Lia' }), 'Lia')
    assert.deepEqual(parseAdminThread({}, 't'), { thread: null, messages: [] })
  })

  it('labels who blocked whom', () => {
    const t = report().thread!
    assert.equal(reportThreadStateLabel(t), null)
    assert.equal(reportThreadStateLabel({ ...t, status: 'blocked' }), 'Blocked by business')
    assert.equal(reportThreadStateLabel({ ...t, customerBlocked: true }), 'Blocked by traveler')
    assert.equal(reportThreadStateLabel({ ...t, status: 'blocked', customerBlocked: true }), 'Blocked both ways')
    assert.equal(reportThreadStateLabel(null), 'Conversation deleted')
  })

  it('describes callable errors', () => {
    assert.match(describeReportsError({ code: 'functions/permission-denied', details: { adminCode: 'admin/permission-denied' } }).message, /admins/)
    assert.equal(describeReportsError(new Error('x'), 'Fallback').message, 'Fallback')
  })
})
