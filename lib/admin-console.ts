/**
 * Admin console data (read-only). The `adminConsole` callable requires an
 * Admin or Super Admin and hides admin-team entries from Admins; these
 * wrappers only shape requests and describe audit entries for people.
 */

import { getFunctions, httpsCallable } from 'firebase/functions'

import { AdminActionError, ADMIN_ROLE_LABELS, isAdminRole, type AdminRole } from '@/lib/admin'
import { getFirebaseClient } from '@/lib/firebase'
import { placeChatRetentionLabel } from '@/lib/place-chat/retention'

export type AuditScope = 'admins' | 'chat' | 'links' | 'business'

export const AUDIT_SCOPE_LABELS: Record<AuditScope, string> = {
  admins: 'Admin team',
  chat: 'Live chat',
  links: 'Links & QR',
  business: 'Businesses',
}

export type ConsoleAuditItem = {
  id: string
  scope: AuditScope | string
  action: string
  at: string | null
  actorUid: string | null
  actorEmail: string | null
  actorKind: string | null
  targetType: string | null
  targetId: string | null
  targetLabel: string | null
  targetEmail: string | null
  role: string | null
  previousRole: string | null
  details: Record<string, unknown> | null
  note: string | null
}

export type ConsoleOverview = {
  you: { uid: string; email: string; role: AdminRole }
  counts: {
    places: number
    rooms: number
    pendingClaims: number
    openInvites: number
    businesses: number
    admins: number
  }
  audit: ConsoleAuditItem[]
}

export type ConsolePlaceRow = {
  placeId: string
  name: string
  city: string | null
  country: string | null
  slug: string | null
  businessId: string | null
  retentionHours: number | null
  hasRoom: boolean
  recommendations: number
  visits: number
  stories: number
}

function mapError(err: unknown): AdminActionError {
  const e = err as { code?: string; message?: string; details?: { adminCode?: string } }
  const code = e?.details?.adminCode ?? e?.code ?? 'unknown'
  const serverMessage = typeof e?.message === 'string' ? e.message : ''
  switch (code) {
    case 'admin/unauthenticated':
    case 'functions/unauthenticated':
      return new AdminActionError(code, 'Please sign in to continue.')
    case 'admin/email-not-verified':
      return new AdminActionError(code, 'Verify your email address first.')
    case 'admin/permission-denied':
    case 'functions/permission-denied':
      return new AdminActionError(code, serverMessage || 'Only Nessa admins can open the admin console.')
    case 'admin/invalid-argument':
      return new AdminActionError(code, serverMessage || 'Please check and try again.')
    default:
      return new AdminActionError(code, 'Something went wrong. Please try again.')
  }
}

async function call<T>(data: Record<string, unknown>): Promise<T> {
  try {
    const { app } = getFirebaseClient()
    const callable = httpsCallable<Record<string, unknown>, T>(getFunctions(app), 'adminConsole')
    return (await callable(data)).data
  } catch (e) {
    throw mapError(e)
  }
}

export function getConsoleOverview(): Promise<ConsoleOverview> {
  return call<ConsoleOverview>({ action: 'overview' })
}

export function listConsoleAudit(input: {
  scope?: AuditScope | 'all'
  limit?: number
  before?: string | null
}): Promise<{ items: ConsoleAuditItem[]; more: boolean }> {
  return call({ action: 'audit', scope: input.scope ?? 'all', limit: input.limit ?? 50, ...(input.before ? { before: input.before } : {}) })
}

export function listConsolePlaces(input: { q?: string; after?: string | null }): Promise<{ places: ConsolePlaceRow[]; more: boolean }> {
  return call({ action: 'places', ...(input.q ? { q: input.q } : {}), ...(input.after ? { after: input.after } : {}) })
}

export function getPlaceHistory(placeId: string): Promise<{ items: ConsoleAuditItem[]; businessId: string | null }> {
  return call({ action: 'placeHistory', placeId })
}

function str(v: unknown): string {
  return typeof v === 'string' ? v : ''
}

function roleLabel(role: unknown): string {
  if (isAdminRole(role)) return ADMIN_ROLE_LABELS[role]
  if (role === 'staff' || role === 'manager') return 'manager'
  if (role === 'owner') return 'owner'
  return ''
}

/** Who did it: "Faizan (faizan@…)" → the email, "Initial setup", or "Nessa". */
export function auditActor(item: ConsoleAuditItem): string {
  if (item.actorUid === 'bootstrap-script') return 'Initial setup'
  return item.actorEmail || (item.actorKind === 'admin' ? 'A Nessa admin' : 'Someone')
}

/** One plain sentence describing what changed (without the actor). */
export function describeAuditChange(item: ConsoleAuditItem): string {
  const d = item.details ?? {}
  const target = item.targetLabel || item.targetEmail || item.targetId || 'an item'
  switch (item.action) {
    // Admin team
    case 'bootstrap':
      return `made ${item.targetEmail ?? target} ${roleLabel(item.role)}`
    case 'grant':
      return `added ${item.targetEmail ?? target} as ${roleLabel(item.role)}`
    case 'role_change':
      return `changed ${item.targetEmail ?? target} from ${roleLabel(item.previousRole)} to ${roleLabel(item.role)}`
    case 'revoke':
      return `removed ${item.targetEmail ?? target} from the admin team`
    // Live chat
    case 'retention_change':
      return `set ${target} messages to last ${placeChatRetentionLabel(d.hours as number)} (was ${placeChatRetentionLabel(d.previousHours as number)})`
    // QR placements
    case 'qr_placement_create':
      return `added the QR placement “${str(d.label)}” at ${target}`
    case 'qr_placement_retire':
      return `retired the QR placement “${str(d.label)}” at ${target}`
    case 'qr_placement_restore':
      return `restored the QR placement “${str(d.label)}” at ${target}`
    // Businesses
    case 'claim_approve':
      return `approved ${str(d.email) || 'a claim'} as ${roleLabel(d.grantedRole) || 'member'} of ${target}`
    case 'invite_create':
      return `invited ${str(d.email)} to manage ${target}`
    case 'invite_update':
      return `renewed the invitation for ${str(d.email)} at ${target}`
    case 'invite_revoke':
      return `cancelled the invitation for ${str(d.email)} at ${target}`
    case 'invite_accept':
      return `accepted an invitation to manage ${target}`
    case 'invite_decline':
      return `declined an invitation to ${target}`
    case 'member_places_update':
      return `changed a manager’s places at ${target}`
    case 'member_remove':
      return `removed a manager from ${target}`
    case 'member_leave':
      return `left ${target}`
    default:
      return `${item.action.replace(/_/g, ' ')} · ${target}`
  }
}

/** Where an entry links to in the console (a Place page when it's about one). */
export function auditTargetPlaceId(item: ConsoleAuditItem): string | null {
  if (item.targetType === 'place_chat' || item.targetType === 'place_qr_placement' || item.targetType === 'place') {
    return item.targetId
  }
  const placeId = item.details?.placeId
  return typeof placeId === 'string' ? placeId : null
}
