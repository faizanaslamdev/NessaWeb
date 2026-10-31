/**
 * Business Inbox (staff side of business messaging) — pure logic, unit-tested.
 * Shared thread / message logic lives in business-messaging.ts and is
 * re-exported here; this file adds what only the staff side needs.
 *
 * Threads are read with Firestore listeners under rules: owners may list
 * `businessId == X`; managers (role `staff`) must also scope by
 * `placeId == P` / `placeId in [their places]` or the query is denied.
 * Every write goes through callables (see business-messaging-api.ts).
 */

import {
  MESSAGES_PAGE,
  describeMessagingError,
  incomingBatchKeyFor,
  isSeenByOther,
  readReceiptFor,
  shouldMarkReadFor,
  threadQueryKey,
  translationFor,
  type BusinessMessage,
  type BusinessThread,
  type MessagingErrorInfo,
  type ThreadQuerySpec,
  type WhereClause,
} from './business-messaging'

export * from './business-messaging'

export const INBOX_PAGE_SIZE = 30
/** Badge listener size (Needs reply, all places). */
export const INBOX_BADGE_LIMIT = 100
export const INBOX_MESSAGES_PAGE = MESSAGES_PAGE
/** Firestore `in` accepts at most 30 values. */
export const FIRESTORE_IN_MAX = 30

export type InboxThread = BusinessThread
export type InboxMessage = BusinessMessage
export type InboxQuerySpec = ThreadQuerySpec
export type InboxErrorInfo = MessagingErrorInfo

/* ───────────── Queries per role ───────────── */

export type InboxFilter = 'needs_reply' | 'all' | 'archived' | 'blocked'

export const INBOX_FILTERS: { value: InboxFilter; label: string }[] = [
  { value: 'needs_reply', label: 'Needs reply' },
  { value: 'all', label: 'All' },
  { value: 'archived', label: 'Archived' },
  { value: 'blocked', label: 'Blocked' },
]

export type InboxAccess = {
  role: 'owner' | 'staff'
  /** Places the member may act on (getMyBusinesses → places). */
  placeIds: string[]
}

/**
 * The thread list query for a role / filter / place. Returns null when the
 * caller can't list anything (a manager with no Places, or a Place outside
 * their access) — the rules would deny it.
 *
 * Every shape is backed by a composite index in firestore.indexes.json:
 * businessId (+ placeId) (+ status (+ needsReply)) + updatedAt desc.
 * "All" is every status; the query alone defines each list (no
 * client-side filtering, so pages are always full).
 */
export function buildInboxQuery(input: {
  businessId: string
  access: InboxAccess
  filter: InboxFilter
  /** A single Place, or null for every Place the caller can see. */
  placeId: string | null
  limit?: number
}): InboxQuerySpec | null {
  const { businessId, access, filter, placeId } = input
  const where: WhereClause[] = [['businessId', '==', businessId]]
  let truncated = false
  if (placeId) {
    if (access.role !== 'owner' && !access.placeIds.includes(placeId)) return null
    where.push(['placeId', '==', placeId])
  } else if (access.role !== 'owner') {
    const ids = [...new Set(access.placeIds)]
    if (ids.length === 0) return null
    if (ids.length === 1) {
      where.push(['placeId', '==', ids[0]])
    } else {
      truncated = ids.length > FIRESTORE_IN_MAX
      where.push(['placeId', 'in', ids.slice(0, FIRESTORE_IN_MAX)])
    }
  }
  if (filter === 'needs_reply') {
    // Open threads only: archived / blocked ones were put away by staff.
    where.push(['status', '==', 'open'], ['needsReply', '==', true])
  }
  else if (filter === 'archived') where.push(['status', '==', 'archived'])
  else if (filter === 'blocked') where.push(['status', '==', 'blocked'])
  return {
    where,
    orderBy: ['updatedAt', 'desc'],
    limit: Math.max(1, Math.floor(input.limit ?? INBOX_PAGE_SIZE)),
    truncated,
  }
}

/** Stable key for a spec (listener dependency). */
export const inboxQueryKey = threadQueryKey

export function isThreadUnread(thread: InboxThread): boolean {
  return thread.businessUnread > 0 && thread.status === 'open'
}

/** Nav badge: threads with unread customer messages. */
export function countUnreadThreads(threads: InboxThread[]): number {
  return threads.filter(isThreadUnread).length
}

export function unreadBadgeLabel(count: number, cap = INBOX_BADGE_LIMIT): string | null {
  if (count <= 0) return null
  return count >= cap ? `${cap - 1}+` : String(count)
}

/* ───────────── Blocked states (staff side) ───────────── */

/** Small label on a thread row, or null for an ordinary open thread. */
export function staffRowLabel(thread: Pick<InboxThread, 'status' | 'customerBlocked'>): string | null {
  if (thread.status === 'blocked') return 'Blocked'
  if (thread.customerBlocked) return 'Traveler blocked messages'
  if (thread.status === 'archived') return 'Archived'
  return null
}

/**
 * What the staff composer shows:
 * - 'blocked': the business blocked the traveler (Unblock to reply);
 * - 'customer-blocked': the traveler blocked the business (replies refused
 *   with business/blocked-by-customer) — composer disabled with an explanation;
 * - 'open': the composer.
 * `blockedByCustomerError` covers a send refused before the listener caught up.
 */
export function staffComposerState(
  thread: Pick<InboxThread, 'status' | 'customerBlocked'>,
  blockedByCustomerError = false,
): 'blocked' | 'customer-blocked' | 'open' {
  if (thread.status === 'blocked') return 'blocked'
  if (thread.customerBlocked || blockedByCustomerError) return 'customer-blocked'
  return 'open'
}

/* ───────────── Thread view (staff wrappers over the shared logic) ───────────── */

/** The translation into the business language for a customer message, if any. */
export function businessSideTranslation(
  message: Pick<InboxMessage, 'senderRole' | 'text' | 'translations' | 'sourceLanguage'>,
  businessLanguage: string,
): { text: string; from: string | null } | null {
  return translationFor(message, 'business', businessLanguage)
}

/** A staff message the customer has read (createdAt ≤ customerLastReadAt). */
export function isSeenByCustomer(
  message: Pick<InboxMessage, 'senderRole' | 'createdAtMs'>,
  customerLastReadAtMs: number | null,
): boolean {
  return isSeenByOther(message, 'business', customerLastReadAtMs)
}

/** "Seen" / "Sent" under the newest staff message. */
export function readReceipt(
  messages: Pick<InboxMessage, 'id' | 'senderRole' | 'createdAtMs'>[],
  customerLastReadAtMs: number | null,
): { messageId: string; label: 'Seen' | 'Sent' } | null {
  return readReceiptFor(messages, 'business', customerLastReadAtMs)
}

/** Newest batch of customer messages (mark read once per key). */
export function incomingBatchKey(
  threadId: string,
  messages: Pick<InboxMessage, 'id' | 'senderRole'>[],
  thread: Pick<InboxThread, 'lastMessage'> | null,
): string | null {
  return incomingBatchKeyFor(threadId, messages, thread?.lastMessage ?? null, 'business')
}

export function shouldMarkRead(input: {
  thread: Pick<InboxThread, 'businessUnread'> | null
  visible: boolean
  batchKey: string | null
  lastMarkedKey: string | null
}): boolean {
  return shouldMarkReadFor({
    unread: input.thread?.businessUnread ?? 0,
    visible: input.visible,
    batchKey: input.batchKey,
    lastMarkedKey: input.lastMarkedKey,
  })
}

/** Callable error → plain-language message for staff. */
export function describeInboxError(err: unknown, fallback = 'Something went wrong. Please try again.'): InboxErrorInfo {
  return describeMessagingError(err, 'business', fallback)
}

/** Firestore listener error → plain-language message. */
export function describeListenError(err: unknown): string {
  const code = (err as { code?: unknown })?.code
  if (code === 'permission-denied') return 'You don’t have access to these conversations. Ask the business owner to check your Places.'
  if (code === 'failed-precondition') return 'The inbox is still being set up. Try again in a few minutes.'
  if (code === 'unavailable') return 'You’re offline. Conversations will update when you reconnect.'
  return 'Couldn’t load conversations. Refresh the page to try again.'
}
