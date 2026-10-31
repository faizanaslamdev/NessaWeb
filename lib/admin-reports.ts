/**
 * Admin console → Reports: business-messaging abuse reports
 * (`business_thread_reports`, admin-only) read and resolved through the
 * `adminBusinessMessaging` callable. Pure helpers, unit-tested; the callable
 * wrapper is in admin-reports-api.ts.
 */

import {
  normalizeStatus,
  parseMessage,
  parseThread,
  toMillis,
  type BusinessMessage,
  type BusinessThread,
  type SenderRole,
  type ThreadStatus,
} from './business-messaging'

export type ReportStatusFilter = 'open' | 'resolved' | 'all'
export type ReportResolution = 'dismissed' | 'actioned'

export const REPORT_FILTERS: { value: ReportStatusFilter; label: string }[] = [
  { value: 'open', label: 'Open' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'all', label: 'All' },
]

export const REPORTS_PAGE = 25
/** The callable caps a page at 50. */
export const REPORTS_PAGE_MAX = 50
export const REPORT_NOTE_MAX = 500
/** Messages loaded with a report's conversation. */
export const REPORT_THREAD_MESSAGES = 100

export type AdminReportThread = {
  businessName: string
  placeName: string
  customerName: string
  status: ThreadStatus
  customerBlocked: boolean
}

export type AdminReport = {
  id: string
  threadId: string
  businessId: string
  placeId: string
  reporterRole: SenderRole
  reporterUid: string
  reason: string
  status: 'open' | 'resolved'
  createdAtMs: number | null
  resolvedAtMs: number | null
  resolvedBy: string | null
  resolution: ReportResolution | null
  note: string | null
  /** Thread snapshot; null when the thread no longer exists. */
  thread: AdminReportThread | null
}

const str = (v: unknown): string => (typeof v === 'string' ? v : '')
const strOrNull = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v : null)

function parseReportThread(raw: unknown): AdminReportThread | null {
  if (!raw || typeof raw !== 'object') return null
  const t = raw as Record<string, unknown>
  return {
    businessName: str(t.businessName).trim() || 'Business',
    placeName: str(t.placeName).trim(),
    customerName: str(t.customerName).trim() || 'Traveler',
    status: normalizeStatus(t.status),
    customerBlocked: t.customerBlocked === true,
  }
}

/** One report from the callable; null when it has no id / thread id. */
export function parseReport(raw: unknown): AdminReport | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const id = str(r.id)
  const threadId = str(r.threadId)
  if (!id || !threadId) return null
  const resolution = r.resolution === 'dismissed' || r.resolution === 'actioned' ? r.resolution : null
  return {
    id,
    threadId,
    businessId: str(r.businessId),
    placeId: str(r.placeId),
    reporterRole: r.reporterRole === 'business' ? 'business' : 'customer',
    reporterUid: str(r.reporterUid),
    reason: str(r.reason).trim(),
    status: r.status === 'resolved' ? 'resolved' : 'open',
    createdAtMs: toMillis(r.createdAt),
    resolvedAtMs: toMillis(r.resolvedAt),
    resolvedBy: strOrNull(r.resolvedBy),
    resolution,
    note: strOrNull(r.note),
    thread: parseReportThread(r.thread),
  }
}

export function parseReportsPage(raw: unknown): { reports: AdminReport[]; nextCursor: string | null } {
  const data = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const reports = Array.isArray(data.reports) ? data.reports.map(parseReport).filter((r): r is AdminReport => r !== null) : []
  const nextCursor = typeof data.nextCursor === 'string' && data.nextCursor ? data.nextCursor : null
  return { reports, nextCursor }
}

/** listReports payload: limit clamped to 1…50, cursor only when continuing. */
export function buildListReportsRequest(input: {
  status: ReportStatusFilter
  limit?: number
  cursor?: string | null
}): { action: 'listReports'; status: ReportStatusFilter; limit: number; cursor?: string } {
  const limit = Math.min(REPORTS_PAGE_MAX, Math.max(1, Math.floor(input.limit ?? REPORTS_PAGE)))
  return { action: 'listReports', status: input.status, limit, ...(input.cursor ? { cursor: input.cursor } : {}) }
}

/** Appends a page, skipping reports already shown (a report can move between pages). */
export function mergeReportPages(current: readonly AdminReport[], incoming: readonly AdminReport[]): AdminReport[] {
  const seen = new Set(current.map(r => r.id))
  return [...current, ...incoming.filter(r => !seen.has(r.id))]
}

/** After resolving: drop it from the Open list, otherwise replace it in place. */
export function applyResolvedReport(list: readonly AdminReport[], report: AdminReport, filter: ReportStatusFilter): AdminReport[] {
  if (filter === 'open' && report.status === 'resolved') return list.filter(r => r.id !== report.id)
  return list.map(r => (r.id === report.id ? report : r))
}

export function reportMatchesFilter(report: Pick<AdminReport, 'status'>, filter: ReportStatusFilter): boolean {
  return filter === 'all' || report.status === filter
}

/* ───────────── Resolving ───────────── */

export type ResolveDraft = {
  resolution: ReportResolution
  note: string
  blockThread: boolean
  disableBusinessMessaging: boolean
}

export const EMPTY_RESOLVE_DRAFT: ResolveDraft = { resolution: 'dismissed', note: '', blockThread: false, disableBusinessMessaging: false }

export function cleanReportNote(note: string): string {
  return note.replace(/\r\n?/g, '\n').replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, '').trim()
}

/**
 * resolveReport payload. The extra actions only apply to "actioned" and are
 * sent only when chosen; the note only when there is one.
 */
export function buildResolveRequest(
  reportId: string,
  draft: ResolveDraft,
): {
  action: 'resolveReport'
  reportId: string
  resolution: ReportResolution
  note?: string
  blockThread?: true
  disableBusinessMessaging?: true
} {
  const note = cleanReportNote(draft.note).slice(0, REPORT_NOTE_MAX)
  const actioned = draft.resolution === 'actioned'
  return {
    action: 'resolveReport',
    reportId,
    resolution: draft.resolution,
    ...(note ? { note } : {}),
    ...(actioned && draft.blockThread ? { blockThread: true as const } : {}),
    ...(actioned && draft.disableBusinessMessaging ? { disableBusinessMessaging: true as const } : {}),
  }
}

/**
 * What resolving will do, in words, and whether it changes anything for
 * users (then the console asks for confirmation).
 */
export function describeResolution(
  draft: ResolveDraft,
  names: { businessName: string; customerName: string },
): { destructive: boolean; title: string; effects: string[] } {
  if (draft.resolution === 'dismissed') {
    return { destructive: false, title: 'Dismiss this report?', effects: ['The report is closed. Nothing changes for the business or the traveler.'] }
  }
  const effects: string[] = []
  if (draft.blockThread) {
    effects.push(`The conversation between ${names.businessName} and ${names.customerName} is blocked — no messages either way until the business unblocks it.`)
  }
  if (draft.disableBusinessMessaging) {
    effects.push(`Messaging is turned off for ${names.businessName}: travelers can’t start or continue conversations until the owner turns it back on.`)
  }
  if (!effects.length) effects.push('The report is closed as actioned. Nothing else changes.')
  return {
    destructive: draft.blockThread || draft.disableBusinessMessaging,
    title: draft.blockThread || draft.disableBusinessMessaging ? 'Take action on this report?' : 'Close as actioned?',
    effects,
  }
}

/* ───────────── Conversation (getThread) ───────────── */

/**
 * A message as moderators see it: the backend resolves business senders'
 * opaque staffIds to the staff member's uid and name (admins only — the
 * thread's customer never sees them).
 */
export type AdminThreadMessage = BusinessMessage & { senderUid: string | null; senderName: string | null }

export type AdminThreadView = { thread: BusinessThread | null; messages: AdminThreadMessage[] }

/** getThread response (timestamps in ms, messages oldest first). */
export function parseAdminThread(raw: unknown, threadId: string): AdminThreadView {
  const data = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const t = data.thread && typeof data.thread === 'object' ? (data.thread as Record<string, unknown>) : null
  const thread = t ? parseThread(str(t.id) || threadId, t) : null
  const messages = Array.isArray(data.messages)
    ? data.messages
        .filter((m): m is Record<string, unknown> => Boolean(m) && typeof m === 'object' && typeof (m as { id?: unknown }).id === 'string')
        .map(m => ({
          ...parseMessage(m.id as string, m),
          senderUid: typeof m.senderUid === 'string' && m.senderUid ? m.senderUid : null,
          senderName: typeof m.senderName === 'string' && m.senderName.trim() ? m.senderName.trim() : null,
        }))
    : []
  messages.sort((a, b) => (a.createdAtMs ?? 0) - (b.createdAtMs ?? 0))
  return { thread, messages }
}

/** Who sent a message, for the moderation log ("Casa · Maria", "Lia"). */
export function adminSenderLabel(
  message: Pick<AdminThreadMessage, 'senderRole' | 'senderName'>,
  names: { businessName: string; customerName: string },
): string {
  if (message.senderRole !== 'business') return names.customerName
  return message.senderName ? `${names.businessName} · ${message.senderName}` : names.businessName
}

export function reporterLabel(report: Pick<AdminReport, 'reporterRole'>): string {
  return report.reporterRole === 'business' ? 'Business' : 'Traveler'
}

/** The thread's state for the report list (who blocked whom). */
export function reportThreadStateLabel(thread: AdminReportThread | null): string | null {
  if (!thread) return 'Conversation deleted'
  if (thread.status === 'blocked' && thread.customerBlocked) return 'Blocked both ways'
  if (thread.status === 'blocked') return 'Blocked by business'
  if (thread.customerBlocked) return 'Blocked by traveler'
  return null
}

/** Callable error → { code, message } (details.adminCode / businessCode first). */
export function describeReportsError(err: unknown, fallback = 'Something went wrong. Please try again.'): { code: string; message: string } {
  const e = (err ?? {}) as { code?: unknown; message?: unknown; details?: unknown }
  const details = (e.details && typeof e.details === 'object' ? e.details : {}) as Record<string, unknown>
  const code =
    typeof details.adminCode === 'string'
      ? details.adminCode
      : typeof details.businessCode === 'string'
        ? details.businessCode
        : typeof e.code === 'string'
          ? e.code
          : 'unknown'
  const server = typeof e.message === 'string' ? e.message : ''
  if (/unauthenticated$/.test(code)) return { code, message: 'Please sign in to continue.' }
  if (/email-not-verified$/.test(code)) return { code, message: 'Verify your email address first.' }
  if (/permission-denied$/.test(code)) return { code, message: 'Only Nessa admins can review reports.' }
  if (/not-found$/.test(code)) return { code, message: server || 'That report or conversation no longer exists.' }
  if (/invalid-argument$/.test(code)) return { code, message: server || 'Please check and try again.' }
  if (/failed-precondition$/.test(code)) return { code, message: server || 'That can’t be done right now.' }
  if (code === 'functions/unavailable' || code === 'functions/deadline-exceeded') {
    return { code, message: 'Couldn’t reach NessaChat. Check your connection and try again.' }
  }
  return { code, message: fallback }
}
