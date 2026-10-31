/**
 * Business messaging — logic shared by both sides of a thread (the staff
 * Inbox in the Business dashboard and the traveler's /messages page).
 * Pure and unit-tested; nothing here touches Firebase.
 *
 * Threads live in `business_threads/{businessId}_{placeId}_{customerUid}`
 * with a `messages` subcollection; clients only read them (firestore.rules),
 * every write goes through the business-messaging callables.
 */

export const BUSINESS_MESSAGE_MAX = 2000
export const REPORT_REASON_MAX = 500
/** Messages loaded per page in a conversation. */
export const MESSAGES_PAGE = 50

export type ThreadStatus = 'open' | 'archived' | 'blocked'
export type SenderRole = 'customer' | 'business'

export type BusinessThread = {
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
  /**
   * `senderStaffId`: the opaque staffId of a business sender (staff "You" /
   * "Team"); null for customer messages. Threads never carry staff uids.
   */
  lastMessage: { text: string; senderRole: SenderRole; senderStaffId: string | null; createdAtMs: number | null } | null
  customerUnread: number
  businessUnread: number
  needsReply: boolean
  customerLastReadAtMs: number | null
  businessLastReadAtMs: number | null
  /** Staff-side status (archive / block by the business). */
  status: ThreadStatus
  /** The traveler removed the thread from their list (back on the next message). */
  customerHidden: boolean
  /** The traveler blocked the business (absent = false). */
  customerBlocked: boolean
  customerBlockedAtMs: number | null
  createdAtMs: number | null
  updatedAtMs: number | null
}

export type BusinessMessage = {
  id: string
  senderRole: SenderRole
  /**
   * Business messages: the sender's opaque staffId (compare with the viewer's
   * own, from businessAccess, for "You" / "Team"). Null for customer messages.
   * Messages never carry uids.
   */
  senderStaffId: string | null
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

export function parseThread(id: string, data: Record<string, unknown>): BusinessThread {
  const business = (data.business ?? {}) as Record<string, unknown>
  const customer = (data.customer ?? {}) as Record<string, unknown>
  const last = data.lastMessage as Record<string, unknown> | undefined
  return {
    id,
    businessId: str(data.businessId),
    placeId: str(data.placeId),
    customerUid: str(data.customerUid),
    businessName: str(business.name).trim() || 'Business',
    businessLogoUrl: strOrNull(business.logoUrl),
    placeName: str(business.placeName),
    customerName: str(customer.name).trim() || 'Traveler',
    customerAvatar: strOrNull(customer.avatar),
    customerLanguage: strOrNull(data.customerLanguage),
    businessLanguage: str(data.businessLanguage, 'en') || 'en',
    lastMessage:
      last && typeof last === 'object'
        ? {
            text: str(last.text),
            senderRole: role(last.senderRole),
            senderStaffId: role(last.senderRole) === 'business' ? strOrNull(last.senderStaffId) : null,
            createdAtMs: toMillis(last.createdAt),
          }
        : null,
    customerUnread: num(data.customerUnread),
    businessUnread: num(data.businessUnread),
    needsReply: data.needsReply === true,
    customerLastReadAtMs: toMillis(data.customerLastReadAt),
    businessLastReadAtMs: toMillis(data.businessLastReadAt),
    status: normalizeStatus(data.status),
    customerHidden: data.customerHidden === true,
    customerBlocked: data.customerBlocked === true,
    customerBlockedAtMs: toMillis(data.customerBlockedAt),
    createdAtMs: toMillis(data.createdAt),
    updatedAtMs: toMillis(data.updatedAt),
  }
}

export function parseMessage(id: string, data: Record<string, unknown>): BusinessMessage {
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
    senderStaffId: role(data.senderRole) === 'business' ? strOrNull(data.senderStaffId) : null,
    text: str(data.text),
    createdAtMs: toMillis(data.createdAt),
    clientId: strOrNull(data.clientId),
    sourceLanguage: strOrNull(data.sourceLanguage),
    translations,
    translationStatus: ts === 'completed' || ts === 'failed' ? ts : null,
  }
}

/* ───────────── Thread list queries ───────────── */

export type WhereClause = [field: string, op: '==' | 'in', value: string | boolean | string[]]

export type ThreadQuerySpec = {
  where: WhereClause[]
  orderBy: ['updatedAt', 'desc']
  limit: number
  /** Manager with more Places than Firestore `in` allows: only the first 30 are covered. */
  truncated: boolean
}

/** Stable key for a spec (listener dependency). */
export function threadQueryKey(spec: ThreadQuerySpec | null): string {
  return spec ? JSON.stringify([spec.where, spec.orderBy, spec.limit]) : ''
}

/* ───────────── Conversation view (either side) ───────────── */

const baseLang = (code: string) => code.trim().toLowerCase().split(/[-_]/)[0]

/**
 * The translation to show `viewer` for a message from the other side: the
 * text in `viewerLanguage` when there is one that differs from the original.
 * Own messages are never translated.
 */
export function translationFor(
  message: Pick<BusinessMessage, 'senderRole' | 'text' | 'translations' | 'sourceLanguage'>,
  viewer: SenderRole,
  viewerLanguage: string | null,
): { text: string; from: string | null } | null {
  if (message.senderRole === viewer || !viewerLanguage) return null
  const lang = viewerLanguage.trim().toLowerCase()
  if (!lang) return null
  const translated = (message.translations[lang] ?? message.translations[baseLang(lang)])?.trim()
  if (!translated) return null
  if (translated === message.text.trim()) return null
  const source = message.sourceLanguage?.trim().toLowerCase()
  if (source && baseLang(source) === baseLang(lang)) return null
  return { text: translated, from: source ? source.toUpperCase() : null }
}

/** A message of `viewer`'s side the other side has read (createdAt ≤ their lastReadAt). */
export function isSeenByOther(
  message: Pick<BusinessMessage, 'senderRole' | 'createdAtMs'>,
  viewer: SenderRole,
  otherLastReadAtMs: number | null,
): boolean {
  return (
    message.senderRole === viewer &&
    message.createdAtMs !== null &&
    otherLastReadAtMs !== null &&
    message.createdAtMs <= otherLastReadAtMs
  )
}

/**
 * One read receipt per thread, under the viewer's newest message: "Seen"
 * once the other side's lastReadAt reaches it, otherwise "Sent".
 */
export function readReceiptFor(
  messages: Pick<BusinessMessage, 'id' | 'senderRole' | 'createdAtMs'>[],
  viewer: SenderRole,
  otherLastReadAtMs: number | null,
): { messageId: string; label: 'Seen' | 'Sent' } | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i]
    if (m.senderRole !== viewer) continue
    return { messageId: m.id, label: isSeenByOther(m, viewer, otherLastReadAtMs) ? 'Seen' : 'Sent' }
  }
  return null
}

/**
 * Identifies the newest batch of incoming messages (from the other side).
 * A thread is marked read once per key — a new key appears only when a newer
 * incoming message arrives, so re-renders never re-call the callable.
 */
export function incomingBatchKeyFor(
  threadId: string,
  messages: Pick<BusinessMessage, 'id' | 'senderRole'>[],
  lastMessage: BusinessThread['lastMessage'],
  viewer: SenderRole,
): string | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].senderRole !== viewer) return `${threadId}:${messages[i].id}`
  }
  // Messages not loaded yet: fall back to the thread's newest incoming message.
  if (lastMessage && lastMessage.senderRole !== viewer && lastMessage.createdAtMs !== null) {
    return `${threadId}:@${lastMessage.createdAtMs}`
  }
  return null
}

export function shouldMarkReadFor(input: {
  /** The viewer's unread counter on the thread. */
  unread: number
  visible: boolean
  batchKey: string | null
  lastMarkedKey: string | null
}): boolean {
  return Boolean(input.unread > 0 && input.visible && input.batchKey && input.batchKey !== input.lastMarkedKey)
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
  | { kind: 'message'; key: string; message: BusinessMessage; atMs: number | null }
  | { kind: 'pending'; key: string; item: OutboxItem; atMs: number }

/** Server messages (oldest first) + local sends not delivered yet, at the end. */
export function mergeTimeline(messages: BusinessMessage[], outbox: OutboxItem[]): TimelineItem[] {
  const delivered = new Set(messages.map(m => m.clientId).filter((c): c is string => Boolean(c)))
  const items: TimelineItem[] = messages.map(m => ({ kind: 'message', key: m.id, message: m, atMs: m.createdAtMs }))
  for (const item of outbox) {
    if (!delivered.has(item.clientId)) items.push({ kind: 'pending', key: `pending:${item.clientId}`, item, atMs: item.createdAtMs })
  }
  return items
}

/** clientIds of outbox items the server list now contains. */
export function deliveredClientIds(messages: BusinessMessage[], outbox: OutboxItem[]): string[] {
  if (!outbox.length) return []
  const server = new Set(messages.map(m => m.clientId).filter(Boolean))
  return outbox.filter(i => server.has(i.clientId)).map(i => i.clientId)
}

/** 8–64 chars of [A-Za-z0-9_-], as the send callables require. */
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

/** Report reason as the server stores it: one line, whitespace collapsed. */
export function cleanReportReason(value: string): string {
  return value.replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim()
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

export type MessagingErrorInfo = { code: string; message: string; retryAfterMs?: number }

export function waitLabel(ms: number): string {
  const min = Math.max(1, Math.ceil(ms / 60000))
  if (min < 60) return `${min} minute${min === 1 ? '' : 's'}`
  const h = Math.ceil(min / 60)
  return `${h} hour${h === 1 ? '' : 's'}`
}

/** Callable error → its code (details.businessCode first, then the Functions code). */
export function messagingErrorCode(err: unknown): string {
  const e = (err ?? {}) as { code?: unknown; details?: unknown }
  const details = (e.details && typeof e.details === 'object' ? e.details : {}) as Record<string, unknown>
  return typeof details.businessCode === 'string' ? details.businessCode : typeof e.code === 'string' ? e.code : 'unknown'
}

/**
 * Callable error → plain-language message for the side that made the call
 * (`viewer`: 'business' = staff Inbox, 'customer' = traveler).
 */
export function describeMessagingError(
  err: unknown,
  viewer: SenderRole,
  fallback = 'Something went wrong. Please try again.',
): MessagingErrorInfo {
  const e = (err ?? {}) as { message?: unknown; details?: unknown }
  const details = (e.details && typeof e.details === 'object' ? e.details : {}) as Record<string, unknown>
  const code = messagingErrorCode(err)
  const server = typeof e.message === 'string' ? e.message : ''
  const staff = viewer === 'business'
  switch (code) {
    case 'business/rate-limited':
    case 'functions/resource-exhausted': {
      const retryAfterMs = typeof details.retryAfterMs === 'number' && details.retryAfterMs > 0 ? details.retryAfterMs : undefined
      const what =
        details.limit === 'newThreads'
          ? 'You’ve started a lot of conversations today.'
          : details.limit === 'reports'
            ? 'You’ve sent a lot of reports today.'
            : details.limit === 'manage'
              ? 'You’ve made a lot of changes.'
              : 'You’re sending a lot of messages.'
      return {
        code,
        retryAfterMs,
        message: retryAfterMs ? `${what} Try again in ${waitLabel(retryAfterMs)}.` : `${what} Try again a little later.`,
      }
    }
    case 'business/email-not-verified':
      return { code, message: 'Verify your email address to reply as your business.' }
    case 'business/thread-blocked':
      return staff
        ? { code, message: 'This conversation is blocked. Unblock it to reply.' }
        : { code, message: 'This business isn’t accepting messages from you.' }
    case 'business/blocked-by-customer':
      return { code, message: 'This traveler blocked messages from your business, so you can’t reply.' }
    case 'business/customer-blocked':
      return { code, message: 'You blocked this business. Unblock it to send messages.' }
    case 'business/messaging-disabled':
      return { code, message: 'This business isn’t accepting messages right now.' }
    case 'business/place-not-verified':
      return { code, message: 'This place has no verified business to message.' }
    case 'business/own-business':
      return {
        code,
        message: 'You’re on this business’s team, so you can’t message it as a traveler. Reply from the Inbox in your business dashboard.',
      }
    case 'business/account-required':
      return { code, message: 'Sign in with a NessaChat account to message businesses.' }
    case 'business/not-found':
    case 'functions/not-found':
      return { code, message: staff ? 'This conversation is no longer available to you.' : 'This conversation is no longer available.' }
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
