/**
 * Business Inbox (staff side of business messaging) — pure logic, unit-tested.
 *
 * Threads live in `business_threads/{businessId}_{placeId}_{customerUid}` and
 * are read with Firestore listeners under rules: owners may list
 * `businessId == X`; managers (role `staff`) must also scope by
 * `placeId == P` / `placeId in [their places]` or the query is denied.
 * Every write goes through callables (see business-inbox-api.ts).
 */

export const INBOX_PAGE_SIZE = 30
/** Badge listener size (Needs reply, all places). */
export const INBOX_BADGE_LIMIT = 100
export const INBOX_MESSAGES_PAGE = 50
export const BUSINESS_MESSAGE_MAX = 2000
export const REPORT_REASON_MAX = 500
/** Firestore `in` accepts at most 30 values. */
export const FIRESTORE_IN_MAX = 30

export type ThreadStatus = 'open' | 'archived' | 'blocked'
export type SenderRole = 'customer' | 'business'

export type InboxThread = {
  id: string
  businessId: string
  placeId: string
  customerUid: string
  businessName: string
  businessLogoUrl: string | null
  placeName: string
  customerName: string
  customerAvatar: string | null
  customerLanguage: string | null
  businessLanguage: string
  lastMessage: { text: string; senderRole: SenderRole; createdAtMs: number | null } | null
  customerUnread: number
  businessUnread: number
  needsReply: boolean
  customerLastReadAtMs: number | null
  businessLastReadAtMs: number | null
  status: ThreadStatus
  createdAtMs: number | null
  updatedAtMs: number | null
}

export type InboxMessage = {
  id: string
  senderRole: SenderRole
  senderUid: string
  text: string
  createdAtMs: number | null
  clientId: string | null
  sourceLanguage: string | null
  translations: Record<string, string>
  translationStatus: 'completed' | 'failed' | null
}

/* ───────────── Parsing (Firestore data → plain objects) ───────────── */

/** Timestamp | {seconds,nanoseconds} | Date | number → epoch ms, else null. */
export function toMillis(value: unknown): number | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.getTime()
  if (typeof value === 'object') {
    const v = value as { toMillis?: () => number; seconds?: unknown; nanoseconds?: unknown }
    if (typeof v.toMillis === 'function') return v.toMillis()
    if (typeof v.seconds === 'number') {
      return v.seconds * 1000 + Math.floor((typeof v.nanoseconds === 'number' ? v.nanoseconds : 0) / 1e6)
    }
  }
  return null
}

const str = (v: unknown, fallback = ''): string => (typeof v === 'string' ? v : fallback)
const strOrNull = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v : null)
const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0)

export function normalizeStatus(value: unknown): ThreadStatus {
  return value === 'archived' || value === 'blocked' ? value : 'open'
}

const role = (v: unknown): SenderRole => (v === 'business' ? 'business' : 'customer')

export function parseThread(id: string, data: Record<string, unknown>): InboxThread {
  const business = (data.business ?? {}) as Record<string, unknown>
  const customer = (data.customer ?? {}) as Record<string, unknown>
  const last = data.lastMessage as Record<string, unknown> | undefined
  return {
    id,
    businessId: str(data.businessId),
    placeId: str(data.placeId),
    customerUid: str(data.customerUid),
    businessName: str(business.name, 'Your business'),
    businessLogoUrl: strOrNull(business.logoUrl),
    placeName: str(business.placeName),
    customerName: str(customer.name).trim() || 'Traveler',
    customerAvatar: strOrNull(customer.avatar),
    customerLanguage: strOrNull(data.customerLanguage),
    businessLanguage: str(data.businessLanguage, 'en') || 'en',
    lastMessage:
      last && typeof last === 'object'
        ? { text: str(last.text), senderRole: role(last.senderRole), createdAtMs: toMillis(last.createdAt) }
        : null,
    customerUnread: num(data.customerUnread),
    businessUnread: num(data.businessUnread),
    needsReply: data.needsReply === true,
    customerLastReadAtMs: toMillis(data.customerLastReadAt),
    businessLastReadAtMs: toMillis(data.businessLastReadAt),
    status: normalizeStatus(data.status),
    createdAtMs: toMillis(data.createdAt),
    updatedAtMs: toMillis(data.updatedAt),
  }
}

export function parseMessage(id: string, data: Record<string, unknown>): InboxMessage {
  const translations: Record<string, string> = {}
  if (data.translations && typeof data.translations === 'object') {
    for (const [lang, text] of Object.entries(data.translations as Record<string, unknown>)) {
      if (typeof text === 'string' && text.trim()) translations[lang] = text
    }
  }
  const ts = data.translationStatus
  return {
    id,
    senderRole: role(data.senderRole),
    senderUid: str(data.senderUid),
    text: str(data.text),
    createdAtMs: toMillis(data.createdAt),
    clientId: strOrNull(data.clientId),
    sourceLanguage: strOrNull(data.sourceLanguage),
    translations,
    translationStatus: ts === 'completed' || ts === 'failed' ? ts : null,
  }
}

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

export type WhereClause = [field: string, op: '==' | 'in', value: string | boolean | string[]]

export type InboxQuerySpec = {
  where: WhereClause[]
  orderBy: ['updatedAt', 'desc']
  limit: number
  /** Manager with more Places than Firestore `in` allows: only the first 30 are covered. */
  truncated: boolean
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
export function inboxQueryKey(spec: InboxQuerySpec | null): string {
  return spec ? JSON.stringify([spec.where, spec.orderBy, spec.limit]) : ''
}

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

/* ───────────── Thread view ───────────── */

/**
 * Text to show for a message on the business side: the translation into the
 * business language when there is one that differs from the original.
 */
export function businessSideTranslation(
  message: Pick<InboxMessage, 'senderRole' | 'text' | 'translations' | 'sourceLanguage'>,
  businessLanguage: string,
): { text: string; from: string | null } | null {
  if (message.senderRole !== 'customer') return null
  const lang = businessLanguage.trim().toLowerCase()
  const translated = message.translations[lang]?.trim()
  if (!translated) return null
  if (translated === message.text.trim()) return null
  const source = message.sourceLanguage?.trim().toLowerCase()
  if (source && source.split(/[-_]/)[0] === lang.split(/[-_]/)[0]) return null
  return { text: translated, from: source ? source.toUpperCase() : null }
}

/** A staff message the customer has read (createdAt ≤ customerLastReadAt). */
export function isSeenByCustomer(
  message: Pick<InboxMessage, 'senderRole' | 'createdAtMs'>,
  customerLastReadAtMs: number | null,
): boolean {
  return (
    message.senderRole === 'business' &&
    message.createdAtMs !== null &&
    customerLastReadAtMs !== null &&
    message.createdAtMs <= customerLastReadAtMs
  )
}

/**
 * Where to show the read receipt: under the newest staff message, "Seen"
 * when the customer has read it, otherwise "Sent". Older staff messages
 * carry no label (one receipt per thread, like most messengers).
 */
export function readReceipt(
  messages: Pick<InboxMessage, 'id' | 'senderRole' | 'createdAtMs'>[],
  customerLastReadAtMs: number | null,
): { messageId: string; label: 'Seen' | 'Sent' } | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i]
    if (m.senderRole !== 'business') continue
    return { messageId: m.id, label: isSeenByCustomer(m, customerLastReadAtMs) ? 'Seen' : 'Sent' }
  }
  return null
}

/**
 * Identifies the newest batch of incoming (customer) messages. The thread
 * is marked read once per key — a new key appears only when a newer
 * customer message arrives, so re-renders never re-call the callable.
 */
export function incomingBatchKey(
  threadId: string,
  messages: Pick<InboxMessage, 'id' | 'senderRole'>[],
  thread: Pick<InboxThread, 'lastMessage'> | null,
): string | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].senderRole === 'customer') return `${threadId}:${messages[i].id}`
  }
  // Messages not loaded yet: fall back to the thread's newest customer message.
  const last = thread?.lastMessage
  if (last && last.senderRole === 'customer' && last.createdAtMs !== null) return `${threadId}:@${last.createdAtMs}`
  return null
}

export function shouldMarkRead(input: {
  thread: Pick<InboxThread, 'businessUnread'> | null
  visible: boolean
  batchKey: string | null
  lastMarkedKey: string | null
}): boolean {
  return Boolean(
    input.thread &&
      input.thread.businessUnread > 0 &&
      input.visible &&
      input.batchKey &&
      input.batchKey !== input.lastMarkedKey,
  )
}

/* ───────────── Optimistic send ───────────── */

export type OutboxItem = {
  clientId: string
  text: string
  createdAtMs: number
  status: 'sending' | 'sent' | 'failed'
  error?: string
}

export type OutboxAction =
  | { type: 'queued'; clientId: string; text: string; at: number }
  | { type: 'sent'; clientId: string }
  | { type: 'failed'; clientId: string; error: string }
  | { type: 'retry'; clientId: string }
  | { type: 'discard'; clientId: string }
  /** The listener delivered these clientIds — drop the local copies. */
  | { type: 'reconcile'; clientIds: string[] }
  | { type: 'reset' }

export function outboxReducer(state: OutboxItem[], action: OutboxAction): OutboxItem[] {
  switch (action.type) {
    case 'queued':
      if (state.some(i => i.clientId === action.clientId)) return state
      return [...state, { clientId: action.clientId, text: action.text, createdAtMs: action.at, status: 'sending' }]
    case 'sent':
      return state.map(i => (i.clientId === action.clientId ? { clientId: i.clientId, text: i.text, createdAtMs: i.createdAtMs, status: 'sent' } : i))
    case 'failed':
      return state.map(i => (i.clientId === action.clientId ? { ...i, status: 'failed', error: action.error } : i))
    case 'retry':
      return state.map(i =>
        i.clientId === action.clientId && i.status === 'failed'
          ? { clientId: i.clientId, text: i.text, createdAtMs: i.createdAtMs, status: 'sending' }
          : i,
      )
    case 'discard':
      return state.filter(i => i.clientId !== action.clientId)
    case 'reconcile': {
      if (!action.clientIds.length) return state
      const delivered = new Set(action.clientIds)
      const next = state.filter(i => !delivered.has(i.clientId))
      return next.length === state.length ? state : next
    }
    case 'reset':
      return state.length ? [] : state
  }
}

export type TimelineItem =
  | { kind: 'message'; key: string; message: InboxMessage; atMs: number | null }
  | { kind: 'pending'; key: string; item: OutboxItem; atMs: number }

/** Server messages (oldest first) + local sends not delivered yet, at the end. */
export function mergeTimeline(messages: InboxMessage[], outbox: OutboxItem[]): TimelineItem[] {
  const delivered = new Set(messages.map(m => m.clientId).filter((c): c is string => Boolean(c)))
  const items: TimelineItem[] = messages.map(m => ({ kind: 'message', key: m.id, message: m, atMs: m.createdAtMs }))
  for (const item of outbox) {
    if (!delivered.has(item.clientId)) items.push({ kind: 'pending', key: `pending:${item.clientId}`, item, atMs: item.createdAtMs })
  }
  return items
}

/** clientIds of outbox items the server list now contains. */
export function deliveredClientIds(messages: InboxMessage[], outbox: OutboxItem[]): string[] {
  if (!outbox.length) return []
  const server = new Set(messages.map(m => m.clientId).filter(Boolean))
  return outbox.filter(i => server.has(i.clientId)).map(i => i.clientId)
}

/** 8–64 chars of [A-Za-z0-9_-], as sendBusinessMessage requires. */
export function isValidClientId(value: string): boolean {
  return /^[A-Za-z0-9_-]{8,64}$/.test(value)
}

export function newClientId(random: () => number = Math.random): string {
  const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto
  if (c?.randomUUID) return c.randomUUID()
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let out = ''
  for (let i = 0; i < 24; i++) out += alphabet[Math.floor(random() * alphabet.length)]
  return out
}

/** What the composer would send ('' = nothing). Mirrors the server's cleaning. */
export function cleanComposerText(value: string): string {
  return value.replace(/\r\n?/g, '\n').replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, '').trim()
}

/* ───────────── Dates ───────────── */

export function localDayKey(ms: number): string {
  const d = new Date(ms)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function dayLabel(ms: number, now: number = Date.now(), locale?: string): string {
  const key = localDayKey(ms)
  if (key === localDayKey(now)) return 'Today'
  const y = new Date(now)
  y.setDate(y.getDate() - 1)
  if (key === localDayKey(y.getTime())) return 'Yesterday'
  const d = new Date(ms)
  const sameYear = d.getFullYear() === new Date(now).getFullYear()
  return d.toLocaleDateString(locale, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
  })
}

/**
 * Splits an (oldest-first) timeline into days. Items without a time yet
 * (server timestamp pending) stay with the day before them, or today.
 */
export function groupByDay<T extends { atMs: number | null }>(
  items: T[],
  now: number = Date.now(),
  locale?: string,
): { key: string; label: string; items: T[] }[] {
  const groups: { key: string; label: string; items: T[] }[] = []
  for (const item of items) {
    const at = item.atMs ?? groups[groups.length - 1]?.items.at(-1)?.atMs ?? now
    const key = localDayKey(at)
    const last = groups[groups.length - 1]
    if (last && last.key === key) last.items.push(item)
    else groups.push({ key, label: dayLabel(at, now, locale), items: [item] })
  }
  return groups
}

/** List row time: "now", "5m", "3h", "Mon", "12 Mar", "12 Mar 2025". */
export function shortRelativeTime(ms: number | null, now: number = Date.now(), locale?: string): string {
  if (ms === null) return ''
  const s = Math.max(0, Math.round((now - ms) / 1000))
  if (s < 60) return 'now'
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24 && localDayKey(ms) === localDayKey(now)) return `${h}h`
  const d = new Date(ms)
  if (now - ms < 6 * 24 * 3600 * 1000) return d.toLocaleDateString(locale, { weekday: 'short' })
  return d.toLocaleDateString(locale, {
    day: 'numeric',
    month: 'short',
    ...(d.getFullYear() === new Date(now).getFullYear() ? {} : { year: 'numeric' }),
  })
}

export function messageTime(ms: number | null, locale?: string): string {
  if (ms === null) return ''
  return new Date(ms).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
}

/* ───────────── Errors ───────────── */

export type InboxErrorInfo = { code: string; message: string; retryAfterMs?: number }

function minutesLabel(ms: number): string {
  const min = Math.max(1, Math.ceil(ms / 60000))
  if (min < 60) return `${min} minute${min === 1 ? '' : 's'}`
  const h = Math.ceil(min / 60)
  return `${h} hour${h === 1 ? '' : 's'}`
}

/** Callable error → plain-language message (details.businessCode first). */
export function describeInboxError(err: unknown, fallback = 'Something went wrong. Please try again.'): InboxErrorInfo {
  const e = (err ?? {}) as { code?: unknown; message?: unknown; details?: unknown }
  const details = (e.details && typeof e.details === 'object' ? e.details : {}) as Record<string, unknown>
  const code = typeof details.businessCode === 'string' ? details.businessCode : typeof e.code === 'string' ? e.code : 'unknown'
  const server = typeof e.message === 'string' ? e.message : ''
  switch (code) {
    case 'business/rate-limited':
    case 'functions/resource-exhausted': {
      const retryAfterMs = typeof details.retryAfterMs === 'number' ? details.retryAfterMs : undefined
      return {
        code,
        retryAfterMs,
        message: retryAfterMs
          ? `You’re sending a lot of messages. Try again in ${minutesLabel(retryAfterMs)}.`
          : 'You’re sending a lot of messages. Try again a little later.',
      }
    }
    case 'business/email-not-verified':
      return { code, message: 'Verify your email address to reply as your business.' }
    case 'business/thread-blocked':
      return { code, message: 'This conversation is blocked. Unblock it to reply.' }
    case 'business/not-found':
    case 'functions/not-found':
      return { code, message: 'This conversation is no longer available to you.' }
    case 'business/permission-denied':
    case 'functions/permission-denied':
      return { code, message: server || 'You don’t have permission to do that.' }
    case 'business/invalid-argument':
    case 'functions/invalid-argument':
      return { code, message: server || 'Please check the message and try again.' }
    case 'business/unauthenticated':
    case 'functions/unauthenticated':
      return { code, message: 'Your session ended. Sign in again to continue.' }
    case 'functions/unavailable':
    case 'functions/deadline-exceeded':
      return { code, message: 'Couldn’t reach NessaChat. Check your connection and try again.' }
    default:
      return { code, message: fallback }
  }
}

/** Firestore listener error → plain-language message. */
export function describeListenError(err: unknown): string {
  const code = (err as { code?: unknown })?.code
  if (code === 'permission-denied') return 'You don’t have access to these conversations. Ask the business owner to check your Places.'
  if (code === 'failed-precondition') return 'The inbox is still being set up. Try again in a few minutes.'
  if (code === 'unavailable') return 'You’re offline. Conversations will update when you reconnect.'
  return 'Couldn’t load conversations. Refresh the page to try again.'
}
