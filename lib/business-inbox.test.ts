import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  buildInboxQuery,
  businessSideTranslation,
  cleanComposerText,
  countUnreadThreads,
  deliveredClientIds,
  describeInboxError,
  describeListenError,
  groupByDay,
  inboxQueryKey,
  incomingBatchKey,
  isSeenByCustomer,
  isValidClientId,
  mergeTimeline,
  newClientId,
  outboxReducer,
  parseMessage,
  parseThread,
  staffSenderLabel,
  staffThreadPreview,
  readReceipt,
  shortRelativeTime,
  shouldMarkRead,
  staffComposerState,
  staffRowLabel,
  toMillis,
  unreadBadgeLabel,
  visibleInboxThreads,
  type InboxMessage,
  type InboxThread,
  type OutboxItem,
} from './business-inbox'

const ts = (ms: number) => ({ toMillis: () => ms })

function thread(over: Partial<InboxThread> = {}): InboxThread {
  return {
    ...parseThread('b1_ChIJabc_u1', {
      businessId: 'b1',
      placeId: 'ChIJabc',
      customerUid: 'u1',
      business: { name: 'Casa', placeName: 'Casa Cumbuco' },
      customer: { name: 'Ana' },
      businessLanguage: 'en',
      status: 'open',
    }),
    ...over,
  }
}

function msg(id: string, over: Partial<InboxMessage> = {}): InboxMessage {
  return { ...parseMessage(id, { senderRole: 'customer', text: 'hi', createdAt: ts(1000) }), ...over }
}

describe('parsing', () => {
  it('toMillis handles Timestamp, {seconds}, Date, number and junk', () => {
    assert.equal(toMillis(ts(5)), 5)
    assert.equal(toMillis({ seconds: 2, nanoseconds: 5_000_000 }), 2005)
    assert.equal(toMillis(new Date(7)), 7)
    assert.equal(toMillis(9), 9)
    assert.equal(toMillis(null), null)
    assert.equal(toMillis('x'), null)
  })

  it('parseThread reads the documented fields with safe defaults', () => {
    const t = parseThread('id', {
      businessId: 'b1',
      placeId: 'p1',
      customerUid: 'u1',
      business: { name: 'Casa', logoUrl: 'https://x/l.png', placeName: 'Casa Cumbuco' },
      customer: { name: '  ', avatar: 'https://x/a.png' },
      customerLanguage: 'pt',
      businessLanguage: 'en',
      lastMessage: { text: 'Oi', senderRole: 'customer', createdAt: ts(10) },
      customerUnread: 0,
      businessUnread: 2,
      needsReply: true,
      customerLastReadAt: ts(4),
      status: 'weird',
      updatedAt: ts(10),
    })
    assert.equal(t.customerName, 'Traveler')
    assert.equal(t.customerAvatar, 'https://x/a.png')
    assert.equal(t.placeName, 'Casa Cumbuco')
    assert.equal(t.status, 'open')
    assert.equal(t.businessUnread, 2)
    assert.equal(t.customerLastReadAtMs, 4)
    assert.deepEqual(t.lastMessage, { text: 'Oi', senderRole: 'customer', senderStaffId: null, createdAtMs: 10 })
    assert.equal(t.businessLastReadAtMs, null)
  })

  it('parseMessage keeps non-empty translations only', () => {
    const m = parseMessage('m', {
      senderRole: 'business',
      text: 'Hello',
      createdAt: ts(3),
      clientId: 'abcdefgh',
      translations: { pt: 'Olá', es: '', de: 4 },
      sourceLanguage: 'en',
      translationStatus: 'completed',
    })
    assert.deepEqual(m.translations, { pt: 'Olá' })
    assert.equal(m.senderRole, 'business')
    assert.equal(m.clientId, 'abcdefgh')
  })

  it('staff senders are opaque staffIds; uid fields are never read', () => {
    assert.equal(parseMessage('m', { senderRole: 'business', senderStaffId: 'staffA0000001', text: 'x' }).senderStaffId, 'staffA0000001')
    assert.equal(parseMessage('m', { senderRole: 'business', senderUid: 'uid-1', text: 'x' }).senderStaffId, null)
    assert.equal(parseMessage('m', { senderRole: 'customer', senderStaffId: 'x', text: 'x' }).senderStaffId, null)
    assert.equal('senderUid' in parseMessage('m', { senderRole: 'business', senderUid: 'uid-1', text: 'x' }), false)
    const t = parseThread('id', { lastMessage: { text: 'Yes', senderRole: 'business', senderStaffId: 'staffA0000001', senderUid: 'uid-1', createdAt: ts(1) } })
    assert.deepEqual(t.lastMessage, { text: 'Yes', senderRole: 'business', senderStaffId: 'staffA0000001', createdAtMs: 1 })
  })
})

describe('You / Team (staffIds from businessAccess)', () => {
  const last = (senderRole: 'customer' | 'business', senderStaffId: string | null) => ({
    lastMessage: { text: 'Yes', senderRole, senderStaffId, createdAtMs: 1 },
  })

  it('bubble labels', () => {
    assert.equal(staffSenderLabel({ senderRole: 'business', senderStaffId: 'me0000000001' }, 'me0000000001'), 'You')
    assert.equal(staffSenderLabel({ senderRole: 'business', senderStaffId: 'other0000001' }, 'me0000000001'), 'Team')
    assert.equal(staffSenderLabel({ senderRole: 'business', senderStaffId: null }, null), 'Team', 'unknown viewer id: never "You"')
    assert.equal(staffSenderLabel({ senderRole: 'customer', senderStaffId: null }, 'me0000000001'), null)
  })

  it('row previews', () => {
    assert.equal(staffThreadPreview(last('business', 'me0000000001'), 'me0000000001'), 'You: Yes')
    assert.equal(staffThreadPreview(last('business', 'other0000001'), 'me0000000001'), 'Team: Yes')
    assert.equal(staffThreadPreview(last('customer', null), 'me0000000001'), 'Yes')
    assert.equal(staffThreadPreview({ lastMessage: null }, 'me0000000001'), 'No messages yet')
  })
})

describe('buildInboxQuery', () => {
  const owner = { role: 'owner' as const, placeIds: ['p1', 'p2'] }
  const manager = { role: 'staff' as const, placeIds: ['p1', 'p2'] }

  it('owner: businessId only, plus the filter field', () => {
    assert.deepEqual(buildInboxQuery({ businessId: 'b', access: owner, filter: 'all', placeId: null })?.where, [
      ['businessId', '==', 'b'],
    ])
    assert.deepEqual(buildInboxQuery({ businessId: 'b', access: owner, filter: 'needs_reply', placeId: null })?.where, [
      ['businessId', '==', 'b'],
      ['status', '==', 'open'],
      ['needsReply', '==', true],
    ])
    const spec = buildInboxQuery({ businessId: 'b', access: owner, filter: 'archived', placeId: 'p9', limit: 60 })
    assert.deepEqual(spec?.where, [
      ['businessId', '==', 'b'],
      ['placeId', '==', 'p9'],
      ['status', '==', 'archived'],
    ])
    assert.equal(spec?.limit, 60)
    assert.deepEqual(spec?.orderBy, ['updatedAt', 'desc'])
  })

  it('manager: always scoped to their Places (== for one, in for several)', () => {
    assert.deepEqual(buildInboxQuery({ businessId: 'b', access: manager, filter: 'blocked', placeId: null })?.where, [
      ['businessId', '==', 'b'],
      ['placeId', 'in', ['p1', 'p2']],
      ['status', '==', 'blocked'],
    ])
    assert.deepEqual(
      buildInboxQuery({ businessId: 'b', access: { role: 'staff', placeIds: ['p1', 'p1'] }, filter: 'all', placeId: null })?.where,
      [
        ['businessId', '==', 'b'],
        ['placeId', '==', 'p1'],
      ],
    )
    assert.deepEqual(buildInboxQuery({ businessId: 'b', access: manager, filter: 'all', placeId: 'p2' })?.where, [
      ['businessId', '==', 'b'],
      ['placeId', '==', 'p2'],
    ])
  })

  it('needs reply: open threads only, managers still scoped to their Places', () => {
    assert.deepEqual(buildInboxQuery({ businessId: 'b', access: manager, filter: 'needs_reply', placeId: null })?.where, [
      ['businessId', '==', 'b'],
      ['placeId', 'in', ['p1', 'p2']],
      ['status', '==', 'open'],
      ['needsReply', '==', true],
    ])
    assert.deepEqual(buildInboxQuery({ businessId: 'b', access: manager, filter: 'needs_reply', placeId: 'p1' })?.where, [
      ['businessId', '==', 'b'],
      ['placeId', '==', 'p1'],
      ['status', '==', 'open'],
      ['needsReply', '==', true],
    ])
    assert.deepEqual(buildInboxQuery({ businessId: 'b', access: owner, filter: 'needs_reply', placeId: 'p2' })?.where, [
      ['businessId', '==', 'b'],
      ['placeId', '==', 'p2'],
      ['status', '==', 'open'],
      ['needsReply', '==', true],
    ])
  })

  it('all = every status (no status filter)', () => {
    for (const access of [owner, manager]) {
      const where = buildInboxQuery({ businessId: 'b', access, filter: 'all', placeId: null })!.where
      assert.equal(where.some(([field]) => field === 'status' || field === 'needsReply'), false)
    }
  })

  it('manager: no Places or a foreign Place → no query', () => {
    assert.equal(buildInboxQuery({ businessId: 'b', access: { role: 'staff', placeIds: [] }, filter: 'all', placeId: null }), null)
    assert.equal(buildInboxQuery({ businessId: 'b', access: manager, filter: 'all', placeId: 'p3' }), null)
  })

  it('manager with >30 Places: first 30, flagged', () => {
    const ids = Array.from({ length: 35 }, (_, i) => `p${i}`)
    const spec = buildInboxQuery({ businessId: 'b', access: { role: 'staff', placeIds: ids }, filter: 'all', placeId: null })
    assert.equal(spec?.truncated, true)
    assert.equal((spec?.where[1][2] as string[]).length, 30)
  })

  it('inboxQueryKey changes with the limit and is empty for null', () => {
    const a = buildInboxQuery({ businessId: 'b', access: owner, filter: 'all', placeId: null, limit: 30 })
    const b = buildInboxQuery({ businessId: 'b', access: owner, filter: 'all', placeId: null, limit: 60 })
    assert.notEqual(inboxQueryKey(a), inboxQueryKey(b))
    assert.equal(inboxQueryKey(null), '')
  })
})

describe('filters and unread', () => {
  it('counts open threads with businessUnread > 0', () => {
    assert.equal(
      countUnreadThreads([
        thread({ businessUnread: 2 }),
        thread({ businessUnread: 0 }),
        thread({ businessUnread: 1, status: 'blocked' }),
        thread({ businessUnread: 1 }),
        // The traveler blocked the business: nothing to reply to.
        thread({ businessUnread: 1, customerBlocked: true }),
      ]),
      2,
    )
    assert.equal(unreadBadgeLabel(0), null)
    assert.equal(unreadBadgeLabel(3), '3')
    assert.equal(unreadBadgeLabel(100), '99+')
  })
})

describe('visibleInboxThreads', () => {
  it('Needs reply leaves out threads whose traveler blocked the business; other filters keep them', () => {
    const open = thread({ id: 'a' })
    const blockedByTraveler = thread({ id: 'b', customerBlocked: true })
    assert.deepEqual(visibleInboxThreads([open, blockedByTraveler], 'needs_reply'), [open])
    assert.deepEqual(visibleInboxThreads([open, blockedByTraveler], 'all'), [open, blockedByTraveler])
    const list = [open]
    assert.equal(visibleInboxThreads(list, 'needs_reply'), list)
  })
})

describe('thread view', () => {
  it('translation shows only for customer messages with a different business-language text', () => {
    const base = msg('m', { text: 'Oi, tem quarto?', sourceLanguage: 'pt', translations: { en: 'Hi, any rooms?' } })
    assert.deepEqual(businessSideTranslation(base, 'en'), { text: 'Hi, any rooms?', from: 'PT' })
    assert.equal(businessSideTranslation(base, 'es'), null)
    assert.equal(businessSideTranslation({ ...base, translations: { en: 'Oi, tem quarto?' } }, 'en'), null)
    assert.equal(businessSideTranslation({ ...base, sourceLanguage: 'en' }, 'en'), null)
    assert.equal(businessSideTranslation({ ...base, senderRole: 'business' }, 'en'), null)
  })

  it('read ticks: Seen when createdAt ≤ customerLastReadAt, on the newest staff message only', () => {
    const staff = (id: string, at: number) => msg(id, { senderRole: 'business', createdAtMs: at })
    assert.equal(isSeenByCustomer(staff('a', 10), 10), true)
    assert.equal(isSeenByCustomer(staff('a', 11), 10), false)
    assert.equal(isSeenByCustomer(staff('a', 11), null), false)
    assert.equal(isSeenByCustomer(msg('c', { createdAtMs: 1 }), 10), false)
    const list = [staff('a', 1), msg('c', { createdAtMs: 2 }), staff('b', 3), msg('d', { createdAtMs: 4 })]
    assert.deepEqual(readReceipt(list, 3), { messageId: 'b', label: 'Seen' })
    assert.deepEqual(readReceipt(list, 2), { messageId: 'b', label: 'Sent' })
    assert.equal(readReceipt([msg('c')], 5), null)
  })

  it('mark read once per incoming batch', () => {
    const msgs = [msg('c1'), msg('s1', { senderRole: 'business' })]
    const key = incomingBatchKey('t', msgs, null)
    assert.equal(key, 't:c1')
    const t = { businessUnread: 1 }
    assert.equal(shouldMarkRead({ thread: t, visible: true, batchKey: key, lastMarkedKey: null }), true)
    assert.equal(shouldMarkRead({ thread: t, visible: true, batchKey: key, lastMarkedKey: key }), false)
    assert.equal(shouldMarkRead({ thread: t, visible: false, batchKey: key, lastMarkedKey: null }), false)
    assert.equal(shouldMarkRead({ thread: { businessUnread: 0 }, visible: true, batchKey: key, lastMarkedKey: null }), false)
    const newer = incomingBatchKey('t', [...msgs, msg('c2')], null)
    assert.equal(shouldMarkRead({ thread: t, visible: true, batchKey: newer, lastMarkedKey: key }), true)
    assert.equal(
      incomingBatchKey('t', [], { lastMessage: { text: 'x', senderRole: 'customer', senderStaffId: null, createdAtMs: 5 } }),
      't:@5',
    )
    assert.equal(incomingBatchKey('t', [], { lastMessage: null }), null)
  })

  it('groups messages by local day with Today / Yesterday labels', () => {
    const now = new Date(2026, 9, 31, 15, 0).getTime()
    const yesterday = new Date(2026, 9, 30, 23, 0).getTime()
    const older = new Date(2026, 9, 20, 9, 0).getTime()
    const groups = groupByDay(
      [{ atMs: older }, { atMs: yesterday }, { atMs: now - 1000 }, { atMs: null }, { atMs: now }],
      now,
      'en-US',
    )
    assert.deepEqual(groups.map(g => [g.label, g.items.length]), [
      ['Tue, Oct 20', 1],
      ['Yesterday', 1],
      ['Today', 3],
    ])
  })

  it('shortRelativeTime', () => {
    const now = new Date(2026, 9, 31, 15, 0).getTime()
    assert.equal(shortRelativeTime(now - 20_000, now), 'now')
    assert.equal(shortRelativeTime(now - 5 * 60_000, now), '5m')
    assert.equal(shortRelativeTime(now - 3 * 3600_000, now), '3h')
    assert.equal(shortRelativeTime(new Date(2026, 9, 29, 10).getTime(), now, 'en-US'), 'Thu')
    assert.equal(shortRelativeTime(new Date(2026, 2, 12).getTime(), now, 'en-US'), 'Mar 12')
    assert.equal(shortRelativeTime(new Date(2025, 2, 12).getTime(), now, 'en-US'), 'Mar 12, 2025')
    assert.equal(shortRelativeTime(null, now), '')
  })
})

describe('optimistic send', () => {
  it('queued → sent → reconciled by the listener', () => {
    let s: OutboxItem[] = []
    s = outboxReducer(s, { type: 'queued', clientId: 'c-1234567', text: 'Hi', at: 1 })
    s = outboxReducer(s, { type: 'queued', clientId: 'c-1234567', text: 'Hi', at: 2 })
    assert.equal(s.length, 1)
    assert.equal(s[0].status, 'sending')
    s = outboxReducer(s, { type: 'sent', clientId: 'c-1234567' })
    assert.equal(s[0].status, 'sent')
    const server = [msg('m1', { senderRole: 'business', clientId: 'c-1234567' })]
    assert.deepEqual(deliveredClientIds(server, s), ['c-1234567'])
    assert.equal(mergeTimeline(server, s).length, 1, 'no duplicate while both exist')
    s = outboxReducer(s, { type: 'reconcile', clientIds: ['c-1234567'] })
    assert.deepEqual(s, [])
  })

  it('failed keeps the clientId for retry; discard removes it', () => {
    let s = outboxReducer([], { type: 'queued', clientId: 'c-abcdefgh', text: 'Hi', at: 1 })
    s = outboxReducer(s, { type: 'failed', clientId: 'c-abcdefgh', error: 'Offline' })
    assert.deepEqual([s[0].status, s[0].error, s[0].clientId], ['failed', 'Offline', 'c-abcdefgh'])
    s = outboxReducer(s, { type: 'retry', clientId: 'c-abcdefgh' })
    assert.equal(s[0].status, 'sending')
    assert.equal(s[0].error, undefined)
    assert.equal(s[0].createdAtMs, 1)
    s = outboxReducer(s, { type: 'discard', clientId: 'c-abcdefgh' })
    assert.deepEqual(s, [])
  })

  it('reconcile without matches returns the same state', () => {
    const s = outboxReducer([], { type: 'queued', clientId: 'c-abcdefgh', text: 'Hi', at: 1 })
    assert.equal(outboxReducer(s, { type: 'reconcile', clientIds: ['other-123'] }), s)
    assert.equal(outboxReducer(s, { type: 'reconcile', clientIds: [] }), s)
  })

  it('mergeTimeline appends undelivered sends after server messages', () => {
    const s = outboxReducer([], { type: 'queued', clientId: 'c-abcdefgh', text: 'Hi', at: 99 })
    const items = mergeTimeline([msg('m1')], s)
    assert.deepEqual(items.map(i => i.kind), ['message', 'pending'])
    assert.equal(items[1].key, 'pending:c-abcdefgh')
  })

  it('client ids satisfy the callable contract', () => {
    assert.equal(isValidClientId(newClientId()), true)
    const original = globalThis.crypto
    Object.defineProperty(globalThis, 'crypto', { value: undefined, configurable: true })
    try {
      assert.equal(isValidClientId(newClientId(() => 0.5)), true)
    } finally {
      Object.defineProperty(globalThis, 'crypto', { value: original, configurable: true })
    }
    assert.equal(isValidClientId('short'), false)
    assert.equal(isValidClientId('has space in it'), false)
  })

  it('cleanComposerText trims and strips control characters', () => {
    assert.equal(cleanComposerText('  hi\r\nthere\u0007 '), 'hi\nthere')
    assert.equal(cleanComposerText(' \n '), '')
  })
})

describe('errors', () => {
  it('maps business codes to plain language', () => {
    const rate = describeInboxError({ code: 'functions/resource-exhausted', details: { businessCode: 'business/rate-limited', retryAfterMs: 90_000 } })
    assert.equal(rate.code, 'business/rate-limited')
    assert.equal(rate.retryAfterMs, 90_000)
    assert.match(rate.message, /2 minutes/)
    assert.match(describeInboxError({ details: { businessCode: 'business/email-not-verified' } }).message, /Verify your email/)
    assert.match(describeInboxError({ details: { businessCode: 'business/thread-blocked' } }).message, /blocked/)
    assert.equal(describeInboxError(new Error('boom'), 'Fallback').message, 'Fallback')
    assert.match(describeListenError({ code: 'permission-denied' }), /access/)
    assert.match(describeListenError({ code: 'failed-precondition' }), /being set up/)
  })
})

describe('traveler-blocked state (staff side)', () => {
  it('parses customerBlocked (absent = false)', () => {
    assert.equal(thread().customerBlocked, false)
    const t = parseThread('b1_ChIJabc_u1', { customerBlocked: true, customerBlockedAt: ts(42), status: 'open' })
    assert.equal(t.customerBlocked, true)
    assert.equal(t.customerBlockedAtMs, 42)
  })

  it('row label: staff block first, then the traveler’s block, then archived', () => {
    assert.equal(staffRowLabel(thread()), null)
    assert.equal(staffRowLabel(thread({ status: 'archived' })), 'Archived')
    assert.equal(staffRowLabel(thread({ customerBlocked: true })), 'Traveler blocked messages')
    assert.equal(staffRowLabel(thread({ customerBlocked: true, status: 'archived' })), 'Traveler blocked messages')
    assert.equal(staffRowLabel(thread({ customerBlocked: true, status: 'blocked' })), 'Blocked')
  })

  it('composer: blocked by staff > blocked by traveler (doc or refused send) > open', () => {
    assert.equal(staffComposerState(thread()), 'open')
    assert.equal(staffComposerState(thread({ status: 'archived' })), 'open')
    assert.equal(staffComposerState(thread({ customerBlocked: true })), 'customer-blocked')
    assert.equal(staffComposerState(thread(), true), 'customer-blocked')
    assert.equal(staffComposerState(thread({ status: 'blocked', customerBlocked: true })), 'blocked')
  })

  it('explains business/blocked-by-customer', () => {
    const info = describeInboxError({ code: 'functions/failed-precondition', details: { businessCode: 'business/blocked-by-customer' } })
    assert.equal(info.code, 'business/blocked-by-customer')
    assert.match(info.message, /blocked messages from your business/)
  })
})
