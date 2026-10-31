import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  cleanReportReason,
  describeMessagingError,
  incomingBatchKeyFor,
  isSeenByOther,
  parseMessage,
  readReceiptFor,
  shouldMarkReadFor,
  translationFor,
  waitLabel,
  type BusinessMessage,
} from './business-messaging'

const ts = (ms: number) => ({ toMillis: () => ms })

function msg(id: string, over: Partial<BusinessMessage> = {}): BusinessMessage {
  return { ...parseMessage(id, { senderRole: 'customer', text: 'hi', createdAt: ts(1000) }), ...over }
}

describe('translations for either side', () => {
  const fromBusiness = msg('m', {
    senderRole: 'business',
    text: 'Hello, we have rooms',
    sourceLanguage: 'en',
    translations: { pt: 'Olá, temos quartos' },
  })

  it('travelers see business messages in their language', () => {
    assert.deepEqual(translationFor(fromBusiness, 'customer', 'pt'), { text: 'Olá, temos quartos', from: 'EN' })
    assert.deepEqual(translationFor(fromBusiness, 'customer', 'pt-BR'), { text: 'Olá, temos quartos', from: 'EN' })
  })

  it('never translates own messages, a missing language or same-language text', () => {
    assert.equal(translationFor(fromBusiness, 'business', 'pt'), null)
    assert.equal(translationFor(fromBusiness, 'customer', null), null)
    assert.equal(translationFor(fromBusiness, 'customer', 'de'), null)
    assert.equal(translationFor({ ...fromBusiness, sourceLanguage: 'pt' }, 'customer', 'pt'), null)
    assert.equal(translationFor({ ...fromBusiness, translations: { pt: 'Hello, we have rooms' } }, 'customer', 'pt'), null)
  })
})

describe('Seen / mark read for the traveler', () => {
  const list = [msg('a', { createdAtMs: 1 }), msg('b', { senderRole: 'business', createdAtMs: 2 }), msg('c', { createdAtMs: 3 })]

  it('Seen when businessLastReadAt ≥ the traveler’s latest message', () => {
    assert.deepEqual(readReceiptFor(list, 'customer', 3), { messageId: 'c', label: 'Seen' })
    assert.deepEqual(readReceiptFor(list, 'customer', 2), { messageId: 'c', label: 'Sent' })
    assert.deepEqual(readReceiptFor(list, 'customer', null), { messageId: 'c', label: 'Sent' })
    assert.equal(readReceiptFor([msg('x', { senderRole: 'business' })], 'customer', 9), null)
    assert.equal(isSeenByOther(msg('p', { createdAtMs: null }), 'customer', 9), false)
  })

  it('marks read once per new batch of business messages', () => {
    const key = incomingBatchKeyFor('t', list, null, 'customer')
    assert.equal(key, 't:b')
    assert.equal(shouldMarkReadFor({ unread: 1, visible: true, batchKey: key, lastMarkedKey: null }), true)
    assert.equal(shouldMarkReadFor({ unread: 1, visible: true, batchKey: key, lastMarkedKey: key }), false)
    assert.equal(shouldMarkReadFor({ unread: 0, visible: true, batchKey: key, lastMarkedKey: null }), false)
    assert.equal(shouldMarkReadFor({ unread: 1, visible: false, batchKey: key, lastMarkedKey: null }), false)
    assert.equal(
      incomingBatchKeyFor('t', [], { text: 'x', senderRole: 'business', senderStaffId: 'staffA0000001', createdAtMs: 7 }, 'customer'),
      't:@7',
    )
    assert.equal(incomingBatchKeyFor('t', [], { text: 'x', senderRole: 'customer', senderStaffId: null, createdAtMs: 7 }, 'customer'), null)
  })
})

describe('errors for travelers', () => {
  const err = (businessCode: string, extra: Record<string, unknown> = {}) => ({
    code: 'functions/failed-precondition',
    message: 'server text',
    details: { businessCode, ...extra },
  })

  it('explains blocked states without blaming the traveler', () => {
    assert.match(describeMessagingError(err('business/customer-blocked'), 'customer').message, /You blocked this business/)
    assert.match(describeMessagingError(err('business/thread-blocked'), 'customer').message, /isn’t accepting messages from you/)
    assert.match(describeMessagingError(err('business/thread-blocked'), 'business').message, /Unblock it to reply/)
    assert.match(describeMessagingError(err('business/messaging-disabled'), 'customer').message, /isn’t accepting messages/)
    assert.match(describeMessagingError(err('business/own-business'), 'customer').message, /team/)
    assert.match(describeMessagingError(err('business/account-required'), 'customer').message, /Sign in/)
  })

  it('rate limits carry the retry time', () => {
    const info = describeMessagingError(err('business/rate-limited', { retryAfterMs: 30 * 60_000, limit: 'newThreads' }), 'customer')
    assert.equal(info.retryAfterMs, 1_800_000)
    assert.match(info.message, /started a lot of conversations/)
    assert.match(info.message, /30 minutes/)
    assert.match(describeMessagingError(err('business/rate-limited'), 'customer').message, /a little later/)
    // Reports and archive / block limits aren't about messages.
    assert.match(describeMessagingError(err('business/rate-limited', { limit: 'reports' }), 'business').message, /^You’ve sent a lot of reports today\./)
    assert.match(describeMessagingError(err('business/rate-limited', { limit: 'manage' }), 'business').message, /^You’ve made a lot of changes\./)
    assert.equal(waitLabel(61 * 60_000), '2 hours')
    assert.equal(waitLabel(1), '1 minute')
  })

  it('report reasons are one line', () => {
    assert.equal(cleanReportReason('  spam\n\nand\tscam  '), 'spam and scam')
  })
})
