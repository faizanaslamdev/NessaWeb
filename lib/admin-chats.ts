/**
 * Nessa admin: Place Chat room settings (currently message retention).
 * Authorization is server-side: the `managePlaceChat` callable requires an
 * Admin or Super Admin (`admin_users`) and audits every change. These
 * wrappers only shape requests and map errors to messages.
 */

import { doc, getDoc } from 'firebase/firestore'
import { getFunctions, httpsCallable } from 'firebase/functions'

import { AdminActionError } from '@/lib/admin'
import { getFirebaseClient } from '@/lib/firebase'
import { isGooglePlaceId } from '@/lib/place-chat/constants'
import {
  PLACE_CHAT_RETENTION_HOURS_OPTIONS,
  placeChatRetentionLabel,
  type PlaceChatRetentionHours,
} from '@/lib/place-chat/retention'
import { isValidPlaceSlug } from '@/lib/place-slug'

export type AdminPlaceChatRoom = {
  placeId: string
  roomExists: boolean
  placeExists: boolean
  title: string
  placeName: string | null
  city: string | null
  slug: string | null
  messageRetentionHours: PlaceChatRetentionHours
  retentionIsDefault: boolean
  retentionUpdatedAt: string | null
  retentionUpdatedByEmail: string | null
  latestMessageAt: string | null
}

export type PlaceChatAuditEntry = {
  id: string
  action: 'retention_change'
  targetType: 'place_chat'
  targetId: string
  targetLabel: string
  details: { previousHours: number; hours: number }
  actorUid: string
  actorEmail: string | null
  note: string | null
  at: string | null
}

export const RETENTION_OPTION_LABELS: Record<PlaceChatRetentionHours, string> = {
  24: '24 hours (default)',
  72: '3 days',
  168: '7 days',
  720: '30 days',
}

export const ADMIN_RETENTION_OPTIONS = PLACE_CHAT_RETENTION_HOURS_OPTIONS

export type PlaceRef = { kind: 'placeId'; placeId: string } | { kind: 'slug'; slug: string }

/**
 * Accepts a Google Place ID, a Nessa Place / Place Chat link
 * (`/place/{id}`, `/places/{slug}`, with or without `/chat` and query) or a
 * bare slug.
 */
export function parsePlaceRef(input: string): PlaceRef | null {
  const raw = input.trim()
  if (!raw) return null
  if (isGooglePlaceId(raw)) return { kind: 'placeId', placeId: raw }
  if (raw.includes('/')) {
    const path = raw.split(/[?#]/)[0]
    const byId = path.match(/(?:^|\/)place\/([^/]+)/)
    if (byId) {
      const id = safeDecode(byId[1])
      return isGooglePlaceId(id) ? { kind: 'placeId', placeId: id } : null
    }
    const bySlug = path.match(/(?:^|\/)places\/([^/]+)/)
    if (bySlug) {
      const slug = safeDecode(bySlug[1])
      return isValidPlaceSlug(slug) ? { kind: 'slug', slug } : null
    }
    return null
  }
  return isValidPlaceSlug(raw) ? { kind: 'slug', slug: raw } : null
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

/** Resolves a slug to its Google Place ID (`place_slugs/{slug}` is public). */
export async function resolvePlaceRef(ref: PlaceRef): Promise<string | null> {
  if (ref.kind === 'placeId') return ref.placeId
  try {
    const { firestore } = getFirebaseClient()
    const snap = await getDoc(doc(firestore, 'place_slugs', ref.slug))
    const placeId = snap.exists() ? snap.data()?.placeId : null
    return typeof placeId === 'string' && isGooglePlaceId(placeId) ? placeId : null
  } catch {
    return null
  }
}

/** One readable line, e.g. "a@x changed Cumbuco Chat from 24 hours to 7 days". */
export function describeChatAuditEntry(entry: PlaceChatAuditEntry): string {
  const actor = entry.actorEmail || 'An admin'
  return `${actor} changed ${entry.targetLabel || entry.targetId} from ${placeChatRetentionLabel(
    entry.details?.previousHours,
  )} to ${placeChatRetentionLabel(entry.details?.hours)}`
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
      return new AdminActionError(code, 'Only Nessa admins can manage chats.')
    case 'admin/invalid-argument':
    case 'admin/not-found':
    case 'admin/no-change':
      return new AdminActionError(code, serverMessage || 'Please check and try again.')
    default:
      return new AdminActionError(code, 'Something went wrong. Please try again.')
  }
}

async function call<T>(data: Record<string, unknown>): Promise<T> {
  try {
    const { app } = getFirebaseClient()
    const callable = httpsCallable<Record<string, unknown>, T>(getFunctions(app), 'managePlaceChat')
    const res = await callable(data)
    return res.data
  } catch (e) {
    throw mapError(e)
  }
}

export async function getAdminPlaceChatRoom(placeId: string): Promise<AdminPlaceChatRoom> {
  const res = await call<{ ok: true; room: AdminPlaceChatRoom }>({ action: 'getRoom', placeId })
  return res.room
}

export async function setPlaceChatRetention(
  placeId: string,
  hours: PlaceChatRetentionHours,
  note?: string,
): Promise<AdminPlaceChatRoom> {
  const res = await call<{ ok: true; room: AdminPlaceChatRoom }>({
    action: 'setRetention',
    placeId,
    hours,
    ...(note?.trim() ? { note: note.trim() } : {}),
  })
  return res.room
}

export async function listPlaceChatAudit(limit = 50): Promise<PlaceChatAuditEntry[]> {
  const res = await call<{ ok: true; entries: PlaceChatAuditEntry[] }>({ action: 'listAudit', limit })
  return res.entries ?? []
}
