import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { parseThread, type BusinessThread } from './business-messaging'
import type { PublicBusinessProfile } from './business-profile'
import { sanitizePublicBusiness } from './business-profile'
import {
  buildCustomerThreadsQuery,
  canMessageBusiness,
  countCustomerUnread,
  customerComposerState,
  customerRowLabel,
  customerThreadPreview,
  customerUnreadLabel,
  expectedThreadId,
  messageButtonAction,
  messageStartTarget,
  newMessageDecision,
  newMessageHref,
  signInToMessageHref,
  threadViewAccess,
  visibleCustomerThreads,
} from './customer-messages'

const ts = (ms: number) => ({ toMillis: () => ms })

function thread(over: Partial<BusinessThread> = {}): BusinessThread {
  return {
    ...parseThread('biz1_ChIJplace_u1', {
      businessId: 'biz1',
      placeId: 'ChIJplace',
      customerUid: 'u1',
      business: { name: 'Casa', placeName: 'Casa Cumbuco' },
      customer: { name: 'Ana' },
      businessLanguage: 'en',
      lastMessage: { text: 'Oi', senderRole: 'customer', createdAt: ts(10) },
      status: 'open',
      updatedAt: ts(10),
    }),
    ...over,
  }
}

const business: PublicBusinessProfile = { businessId: 'biz1', verified: true, name: 'Casa' }

describe('customer thread query', () => {
  it('scopes to the traveler and orders by updatedAt (the indexed shape)', () => {
    assert.deepEqual(buildCustomerThreadsQuery('u1', 20), {
      where: [['customerUid', '==', 'u1']],
      orderBy: ['updatedAt', 'desc'],
      limit: 20,
      truncated: false,
    })
    assert.equal(buildCustomerThreadsQuery('u1')?.limit, 30)
    assert.equal(buildCustomerThreadsQuery(null), null)
    assert.equal(buildCustomerThreadsQuery('', 5), null)
    assert.equal(buildCustomerThreadsQuery('u1', 0)?.limit, 1)
  })
})

describe('customer list', () => {
  it('hides deleted threads (server flag, or locally until a newer message)', () => {
    const a = thread({ id: 'a' })
    const b = thread({ id: 'b', customerHidden: true })
    const c = thread({ id: 'c', lastMessage: { text: 'new', senderRole: 'business', createdAtMs: 50 } })
    assert.deepEqual(visibleCustomerThreads([a, b, c]).map(t => t.id), ['a', 'c'])
    assert.deepEqual(visibleCustomerThreads([a, b, c], new Map([['a', 10], ['c', 20]])).map(t => t.id), ['c'])
  })

  it('counts unread conversations, ignoring deleted ones', () => {
    const list = [thread({ customerUnread: 2 }), thread({ customerUnread: 1, customerHidden: true }), thread()]
    assert.equal(countCustomerUnread(list), 1)
    assert.equal(customerUnreadLabel(0), null)
    assert.equal(customerUnreadLabel(3), '3')
    assert.equal(customerUnreadLabel(12), '9+')
  })

  it('previews and labels', () => {
    assert.equal(customerThreadPreview(thread()), 'You: Oi')
    assert.equal(customerThreadPreview(thread({ lastMessage: { text: 'Hi!', senderRole: 'business', createdAtMs: 1 } })), 'Hi!')
    assert.equal(customerThreadPreview(thread({ lastMessage: null })), 'No messages yet')
    assert.equal(customerRowLabel(thread()), null)
    assert.equal(customerRowLabel(thread({ customerBlocked: true })), 'Blocked')
  })
})

describe('Message button visibility', () => {
  it('only for a verified business that hasn’t turned messaging off', () => {
    assert.equal(canMessageBusiness(business), true)
    assert.equal(canMessageBusiness({ ...business, messagingEnabled: false }), false)
    assert.equal(canMessageBusiness(null), false)
    assert.equal(canMessageBusiness({ ...business, businessId: '' }), false)
  })

  it('the public profile keeps messagingEnabled only when it is false', () => {
    assert.equal(sanitizePublicBusiness({ businessId: 'b', verified: true, name: 'X', messagingEnabled: false })?.messagingEnabled, false)
    assert.equal('messagingEnabled' in (sanitizePublicBusiness({ businessId: 'b', verified: true, name: 'X', messagingEnabled: true }) ?? {}), false)
    assert.equal('messagingEnabled' in (sanitizePublicBusiness({ businessId: 'b', verified: true, name: 'X' }) ?? {}), false)
  })

  it('signed out → sign in, then the composer for this Place', () => {
    const action = messageButtonAction({ placeId: 'ChIJplace', business, uid: null, threads: [] })
    assert.deepEqual(action, { kind: 'sign-in', href: signInToMessageHref('ChIJplace') })
    assert.equal(signInToMessageHref('ChIJplace'), '/account/sign-in?next=%2Fmessages%2Fnew%3Fplace%3DChIJplace')
    assert.deepEqual(messageButtonAction({ placeId: 'p', business: { ...business, messagingEnabled: false }, uid: null, threads: [] }), {
      kind: 'hidden',
    })
  })

  it('signed in → the existing thread, else the composer', () => {
    assert.deepEqual(messageButtonAction({ placeId: 'ChIJplace', business, uid: 'u1', threads: [thread()] }), {
      kind: 'thread',
      threadId: 'biz1_ChIJplace_u1',
      href: '/messages?thread=biz1_ChIJplace_u1',
    })
    assert.deepEqual(messageButtonAction({ placeId: 'ChIJother', business, uid: 'u1', threads: [thread()] }), {
      kind: 'new',
      href: newMessageHref('ChIJother'),
    })
  })

  it('team members of the business → their Inbox, even with messaging off', () => {
    const own = { kind: 'own', href: '/business/biz1/inbox' }
    assert.deepEqual(messageButtonAction({ placeId: 'ChIJplace', business, uid: 'u1', threads: [], teamBusinessIds: ['biz1'] }), own)
    assert.deepEqual(
      messageButtonAction({ placeId: 'ChIJplace', business: { ...business, messagingEnabled: false }, uid: 'u1', threads: [], teamBusinessIds: ['biz1'] }),
      own,
    )
    // Another business's team, or signed out: unchanged.
    assert.equal(messageButtonAction({ placeId: 'ChIJplace', business, uid: 'u1', threads: [], teamBusinessIds: ['biz9'] }).kind, 'new')
    assert.equal(messageButtonAction({ placeId: 'ChIJplace', business, uid: null, threads: [], teamBusinessIds: ['biz1'] }).kind, 'sign-in')
  })
})

describe('start flow: existing vs new', () => {
  it('builds the server’s thread id', () => {
    assert.equal(expectedThreadId('biz1', 'ChIJ_a_b', 'u1'), 'biz1_ChIJ_a_b_u1')
  })

  it('existing visible thread → open it; deleted → composer; deleted but blocked → thread', () => {
    const key = { placeId: 'ChIJplace', businessId: 'biz1', uid: 'u1' }
    assert.equal(messageStartTarget({ ...key, threads: [thread()] }).kind, 'thread')
    assert.equal(messageStartTarget({ ...key, threads: [thread({ customerHidden: true })] }).kind, 'new')
    assert.equal(messageStartTarget({ ...key, threads: [thread({ customerHidden: true, customerBlocked: true })] }).kind, 'thread')
    assert.equal(messageStartTarget({ ...key, threads: [] }).href, '/messages/new?place=ChIJplace')
    // Another traveler's id never matches.
    assert.equal(messageStartTarget({ ...key, uid: 'u2', threads: [thread()] }).kind, 'new')
  })

  it('/messages/new waits for the Place and the list, then decides', () => {
    const base = { placeId: 'ChIJplace', placeValid: true, uid: 'u1', threads: [] as BusinessThread[], threadsLoaded: true }
    const ready = (b: PublicBusinessProfile | null) => ({ state: 'ready' as const, business: b })
    assert.deepEqual(newMessageDecision({ ...base, placeValid: false, place: { state: 'loading' } }), { kind: 'invalid' })
    assert.deepEqual(newMessageDecision({ ...base, place: { state: 'loading' } }), { kind: 'loading' })
    assert.deepEqual(newMessageDecision({ ...base, threadsLoaded: false, place: ready(business) }), { kind: 'loading' })
    assert.deepEqual(newMessageDecision({ ...base, place: { state: 'error' } }), { kind: 'error' })
    assert.deepEqual(newMessageDecision({ ...base, place: ready(null) }), { kind: 'no-business' })
    assert.deepEqual(newMessageDecision({ ...base, place: ready(business) }), { kind: 'compose' })
    // A team member of the business (the server would refuse with own-business).
    assert.deepEqual(newMessageDecision({ ...base, place: ready(business), teamBusinessIds: ['biz1'] }), {
      kind: 'own',
      businessName: 'Casa',
      href: '/business/biz1/inbox',
    })
    assert.deepEqual(newMessageDecision({ ...base, place: ready(business), teamBusinessIds: ['other'] }), { kind: 'compose' })
    assert.deepEqual(newMessageDecision({ ...base, place: ready({ ...business, messagingEnabled: false }) }), {
      kind: 'disabled',
      businessName: 'Casa',
    })
    assert.deepEqual(newMessageDecision({ ...base, threads: [thread()], place: ready({ ...business, messagingEnabled: false }) }), {
      kind: 'existing',
      href: '/messages?thread=biz1_ChIJplace_u1',
    })
  })
})

describe('thread view', () => {
  it('listens only to threads known to exist', () => {
    const base = { threadId: 'x', threads: [thread({ id: 'x' })], listLoaded: true, listFull: false, started: false }
    assert.equal(threadViewAccess(base), 'listen')
    assert.equal(threadViewAccess({ ...base, threads: [] }), 'not-found')
    assert.equal(threadViewAccess({ ...base, threads: [], listLoaded: false }), 'wait')
    assert.equal(threadViewAccess({ ...base, threads: [], started: true, listLoaded: false }), 'listen')
    assert.equal(threadViewAccess({ ...base, threads: [], listFull: true }), 'listen')
  })

  it('blocked states on the traveler side', () => {
    const open = { thread: thread(), messagingEnabled: true, refusedAsBlocked: false }
    assert.equal(customerComposerState(open), 'open')
    assert.equal(customerComposerState({ ...open, thread: thread({ customerBlocked: true }) }), 'you-blocked')
    assert.equal(customerComposerState({ ...open, thread: thread({ customerBlocked: true }), refusedAsBlocked: true }), 'you-blocked')
    assert.equal(
      customerComposerState({ ...open, thread: thread({ status: 'blocked' }), refusedAsBlocked: true }),
      'business-blocked',
    )
    // Staff unblocked after the refusal: the composer comes back live.
    assert.equal(customerComposerState({ ...open, thread: thread({ status: 'open' }), refusedAsBlocked: true }), 'open')
    assert.equal(customerComposerState({ ...open, messagingEnabled: false }), 'messaging-off')
    // The staff-side block isn't revealed up front.
    assert.equal(customerComposerState({ ...open, thread: thread({ status: 'blocked' }) }), 'open')
  })
})
