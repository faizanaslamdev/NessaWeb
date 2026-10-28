/**
 * Nessa admin management (Firestore-backed roles). All authorization is
 * server-side: `manageAdmins` requires a Super Admin and enforces the
 * last-Super-Admin guard and audit log. These wrappers only shape requests
 * and map errors to messages; the role read below is for display.
 */

import { doc, getDoc } from 'firebase/firestore'
import { getFunctions, httpsCallable } from 'firebase/functions'

import { getFirebaseClient } from '@/lib/firebase'

export type AdminRole = 'admin' | 'super_admin'

export const ADMIN_ROLE_LABELS: Record<AdminRole, string> = {
  admin: 'Admin',
  super_admin: 'Super Admin',
}

export const ADMIN_ROLE_DESCRIPTIONS: Record<AdminRole, string> = {
  admin: 'Business claims and owner assignment, places (live chat, QR codes, stats) and the audit log.',
  super_admin: 'Everything an Admin can do, plus managing admins and data-maintenance tools.',
}

export type AdminEntry = {
  uid: string
  email: string
  role: AdminRole
  addedBy: string
  addedByEmail: string | null
  addedAt: string | null
  updatedAt: string | null
}

export type AdminAuditEntry = {
  id: string
  action: 'bootstrap' | 'grant' | 'role_change' | 'revoke'
  targetUid: string
  targetEmail: string
  role: AdminRole | null
  previousRole: AdminRole | null
  actorUid: string
  actorEmail: string | null
  note: string | null
  at: string | null
}

export class AdminActionError extends Error {
  readonly code: string
  constructor(code: string, message: string) {
    super(message)
    this.name = 'AdminActionError'
    this.code = code
  }
}

export function isAdminRole(value: unknown): value is AdminRole {
  return value === 'admin' || value === 'super_admin'
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Basic client-side email check (the server re-validates). */
export function isValidAdminEmail(value: string): boolean {
  const email = value.trim()
  return email.length <= 254 && EMAIL_PATTERN.test(email)
}

/** One readable line per audit entry, e.g. "a@x granted Admin to b@y". */
export function describeAuditEntry(entry: AdminAuditEntry): string {
  const actor = entry.actorUid === 'bootstrap-script' ? 'Initial setup' : entry.actorEmail || 'A Super Admin'
  const role = entry.role ? ADMIN_ROLE_LABELS[entry.role] : ''
  const previous = entry.previousRole ? ADMIN_ROLE_LABELS[entry.previousRole] : ''
  switch (entry.action) {
    case 'bootstrap':
      return `${actor} made ${entry.targetEmail} ${role}`
    case 'grant':
      return `${actor} added ${entry.targetEmail} as ${role}`
    case 'role_change':
      return `${actor} changed ${entry.targetEmail} from ${previous} to ${role}`
    case 'revoke':
      return `${actor} removed ${entry.targetEmail}${previous ? ` (${previous})` : ''}`
    default:
      return `${actor} updated ${entry.targetEmail}`
  }
}

function fns() {
  const { app } = getFirebaseClient()
  return getFunctions(app)
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
      return new AdminActionError(code, 'Only Super Admins can manage the admin team.')
    case 'admin/invalid-argument':
    case 'admin/not-found':
    case 'admin/account-not-eligible':
    case 'admin/last-super-admin':
    case 'admin/self-change':
    case 'admin/no-change':
      return new AdminActionError(code, serverMessage || 'Please check and try again.')
    default:
      return new AdminActionError(code, 'Something went wrong. Please try again.')
  }
}

async function call<T>(data: Record<string, unknown>): Promise<T> {
  try {
    const callable = httpsCallable<Record<string, unknown>, T>(fns(), 'manageAdmins')
    const res = await callable(data)
    return res.data
  } catch (e) {
    throw mapError(e)
  }
}

/** The signed-in user's own admin role (display only), or null. */
export async function readMyAdminRole(uid: string): Promise<AdminRole | null> {
  try {
    const { firestore } = getFirebaseClient()
    const snap = await getDoc(doc(firestore, 'admin_users', uid))
    const role = snap.exists() ? snap.data()?.role : null
    return isAdminRole(role) ? role : null
  } catch {
    return null
  }
}

export async function listAdmins(): Promise<{ admins: AdminEntry[]; me: string }> {
  const res = await call<{ ok: true; admins: AdminEntry[]; me: string }>({ action: 'listAdmins' })
  return { admins: res.admins ?? [], me: res.me }
}

export async function listAdminAudit(limit = 50): Promise<AdminAuditEntry[]> {
  const res = await call<{ ok: true; entries: AdminAuditEntry[] }>({ action: 'listAudit', limit })
  return res.entries ?? []
}

export async function grantAdmin(email: string, role: AdminRole, note?: string): Promise<void> {
  await call({ action: 'grantAdmin', email: email.trim(), role, ...(note?.trim() ? { note: note.trim() } : {}) })
}

export async function changeAdminRole(uid: string, role: AdminRole): Promise<void> {
  await call({ action: 'changeRole', uid, role })
}

export async function revokeAdmin(uid: string): Promise<void> {
  await call({ action: 'revokeAdmin', uid })
}
