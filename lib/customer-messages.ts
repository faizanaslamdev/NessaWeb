/**
 * Traveler side of business messaging (/messages on the website) — pure
 * logic, unit-tested. Shared thread logic is in business-messaging.ts.
 *
 * A traveler reads only their own threads: `customerUid == uid` ordered by
 * `updatedAt desc` (composite index in firestore.indexes.json). Reading a
 * thread doc that doesn't exist yet is denied by the rules, so a thread is
 * only listened to once it is known to exist (in the list, or just started).
 */

import type { BusinessThread, ThreadQuerySpec } from './business-messaging'
import type { PublicBusinessProfile } from './business-profile'

export const MESSAGES_PATH = '/messages'
export const NEW_MESSAGE_PATH = '/messages/new'
/** Rows per page on /messages. */
export const CUSTOMER_THREADS_PAGE = 30
/** The account menu's unread listener: the newest few threads are enough for a badge. */
export const CUSTOMER_BADGE_LIMIT = 20

const SIGN_IN_PATH = '/account/sign-in'

/* ───────────── Query ───────────── */

/** The traveler's own threads, newest first. Null when signed out. */
export function buildCustomerThreadsQuery(uid: string | null | undefined, limit: number = CUSTOMER_THREADS_PAGE): ThreadQuerySpec | null {
  if (!uid) return null
  return {
    where: [['customerUid', '==', uid]],
    orderBy: ['updatedAt', 'desc'],
    limit: Math.max(1, Math.floor(limit)),
    truncated: false,
  }
}

/* ───────────── List ───────────── */

/**
 * Threads shown on /messages: not hidden ("deleted") by the traveler, and
 * not hidden locally while the hide call is on its way (`locallyHidden`:
 * id → lastMessage time when hidden; a newer message shows it again, as the
 * server does).
 */
export function visibleCustomerThreads(
  threads: readonly BusinessThread[],
  locallyHidden?: ReadonlyMap<string, number | null>,
): BusinessThread[] {
  return threads.filter(t => {
    if (t.customerHidden) return false
    if (!locallyHidden?.has(t.id)) return true
    const hiddenAt = locallyHidden.get(t.id) ?? null
    const lastAt = t.lastMessage?.createdAtMs ?? null
    return hiddenAt !== null && lastAt !== null && lastAt > hiddenAt
  })
}

export function isUnreadForCustomer(thread: Pick<BusinessThread, 'customerUnread' | 'customerHidden'>): boolean {
  return thread.customerUnread > 0 && !thread.customerHidden
}

/** Conversations with unread business messages (account menu badge). */
export function countCustomerUnread(threads: readonly BusinessThread[]): number {
  return threads.filter(isUnreadForCustomer).length
}

export function customerUnreadLabel(count: number): string | null {
  if (count <= 0) return null
  return count > 9 ? '9+' : String(count)
}

export function customerThreadPreview(thread: Pick<BusinessThread, 'lastMessage'>): string {
  const last = thread.lastMessage
  if (!last || !last.text) return 'No messages yet'
  return last.senderRole === 'customer' ? `You: ${last.text}` : last.text
}

/** Row label on /messages (the traveler's own block). */
export function customerRowLabel(thread: Pick<BusinessThread, 'customerBlocked'>): string | null {
  return thread.customerBlocked ? 'Blocked' : null
}

/* ───────────── Links ───────────── */

export function messageThreadHref(threadId: string, opts: { started?: boolean } = {}): string {
  return `${MESSAGES_PATH}?thread=${encodeURIComponent(threadId)}${opts.started ? '&started=1' : ''}`
}

export function newMessageHref(placeId: string): string {
  return `${NEW_MESSAGE_PATH}?place=${encodeURIComponent(placeId)}`
}

/** Sign in, then land on the composer for this Place. */
export function signInToMessageHref(placeId: string): string {
  return `${SIGN_IN_PATH}?next=${encodeURIComponent(newMessageHref(placeId))}`
}

/** Same id the server builds (businessId and uids never contain `_`). */
export function expectedThreadId(businessId: string, placeId: string, uid: string): string {
  return `${businessId}_${placeId}_${uid}`
}

/* ───────────── Starting a conversation ───────────── */

/** The traveler's thread with this business about this Place, if it is in `threads`. */
export function findCustomerThread(
  threads: readonly BusinessThread[],
  key: { businessId: string; placeId: string; uid: string },
): BusinessThread | null {
  const id = expectedThreadId(key.businessId, key.placeId, key.uid)
  return (
    threads.find(t => t.id === id) ??
    threads.find(t => t.businessId === key.businessId && t.placeId === key.placeId && t.customerUid === key.uid) ??
    null
  )
}

export type StartTarget = { kind: 'thread'; threadId: string; href: string } | { kind: 'new'; href: string }

/**
 * Where "Message" goes for a signed-in traveler: their existing thread when
 * it is in their list and not deleted (or they blocked the business — the
 * thread view explains how to unblock), otherwise the first-message composer
 * (startBusinessThread continues a deleted thread anyway).
 */
export function messageStartTarget(input: {
  placeId: string
  businessId: string
  uid: string
  threads: readonly BusinessThread[]
}): StartTarget {
  const thread = findCustomerThread(input.threads, input)
  if (thread && (!thread.customerHidden || thread.customerBlocked)) {
    return { kind: 'thread', threadId: thread.id, href: messageThreadHref(thread.id) }
  }
  return { kind: 'new', href: newMessageHref(input.placeId) }
}

/** Whether a Place page offers "Message": a verified business that hasn't turned messaging off. */
export function canMessageBusiness(business: Pick<PublicBusinessProfile, 'verified' | 'businessId' | 'messagingEnabled'> | null | undefined): boolean {
  return Boolean(business && business.verified === true && business.businessId && business.messagingEnabled !== false)
}

export type MessageButtonAction =
  | { kind: 'hidden' }
  | { kind: 'sign-in'; href: string }
  | { kind: 'new'; href: string }
  | { kind: 'thread'; href: string; threadId: string }

/**
 * The Place page's Message button. Signed out (incl. anonymous Place Chat
 * guests) → sign in, then the composer. Signed in → the existing thread when
 * the shared thread listener has it, else the composer (which checks again).
 */
export function messageButtonAction(input: {
  placeId: string
  business: Pick<PublicBusinessProfile, 'verified' | 'businessId' | 'messagingEnabled'> | null | undefined
  uid: string | null
  threads: readonly BusinessThread[]
}): MessageButtonAction {
  const { business, placeId, uid } = input
  if (!business || !canMessageBusiness(business)) return { kind: 'hidden' }
  if (!uid) return { kind: 'sign-in', href: signInToMessageHref(placeId) }
  return messageStartTarget({ placeId, businessId: business.businessId, uid, threads: input.threads })
}

export type NewMessageDecision =
  | { kind: 'invalid' }
  | { kind: 'loading' }
  | { kind: 'error' }
  | { kind: 'no-business' }
  | { kind: 'disabled'; businessName: string }
  | { kind: 'existing'; href: string }
  | { kind: 'compose' }

/**
 * /messages/new?place=…: what to show. Waits for the Place and the traveler's
 * thread list; an existing thread wins (no second composer for it).
 */
export function newMessageDecision(input: {
  placeId: string
  placeValid: boolean
  place: { state: 'loading' } | { state: 'error' } | { state: 'ready'; business: PublicBusinessProfile | null }
  uid: string
  threads: readonly BusinessThread[]
  threadsLoaded: boolean
}): NewMessageDecision {
  if (!input.placeValid) return { kind: 'invalid' }
  if (input.place.state === 'error') return { kind: 'error' }
  if (input.place.state === 'loading' || !input.threadsLoaded) return { kind: 'loading' }
  const business = input.place.business
  if (!business || business.verified !== true || !business.businessId) return { kind: 'no-business' }
  const target = messageStartTarget({ placeId: input.placeId, businessId: business.businessId, uid: input.uid, threads: input.threads })
  if (target.kind === 'thread') return { kind: 'existing', href: target.href }
  if (business.messagingEnabled === false) return { kind: 'disabled', businessName: business.name }
  return { kind: 'compose' }
}

/* ───────────── Thread view ───────────── */

/**
 * When to attach the thread listener on /messages?thread=…: it is in the
 * traveler's list, it was just started (the callable returned), or the list
 * is full so an older thread may sit beyond it. Otherwise it's not found —
 * without reading a doc the rules would refuse.
 */
export function threadViewAccess(input: {
  threadId: string
  threads: readonly BusinessThread[]
  listLoaded: boolean
  listFull: boolean
  started: boolean
}): 'listen' | 'wait' | 'not-found' {
  if (input.started || input.threads.some(t => t.id === input.threadId)) return 'listen'
  if (!input.listLoaded) return 'wait'
  return input.listFull ? 'listen' : 'not-found'
}

export type CustomerComposerState = 'open' | 'you-blocked' | 'business-blocked' | 'messaging-off'

/**
 * What the traveler's composer shows:
 * - 'you-blocked': they blocked the business (Unblock to write again);
 * - 'business-blocked': a send was refused with business/thread-blocked.
 *   The staff block itself isn't shown up front ("they aren't told they
 *   were blocked" on the staff side) — only once a message is refused;
 * - 'messaging-off': the business turned messaging off;
 * - 'open': the composer.
 */
export function customerComposerState(input: {
  thread: Pick<BusinessThread, 'customerBlocked'>
  messagingEnabled: boolean
  refusedAsBlocked: boolean
}): CustomerComposerState {
  if (input.thread.customerBlocked) return 'you-blocked'
  if (input.refusedAsBlocked) return 'business-blocked'
  if (!input.messagingEnabled) return 'messaging-off'
  return 'open'
}
