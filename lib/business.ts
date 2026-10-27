/**
 * Business profile callables (Phase A). All authorization is server-side:
 * callables check the caller's verified email and business membership, and
 * admin actions check the backend allowlist. These wrappers only shape
 * requests/responses and map errors to user-facing messages.
 */

import { httpsCallable } from 'firebase/functions'
import { getFunctions } from 'firebase/functions'

import { getFirebaseClient } from '@/lib/firebase'

export type BusinessCategory =
  | 'hostel'
  | 'hotel'
  | 'restaurant'
  | 'bar'
  | 'cafe'
  | 'kite_school'
  | 'tour'
  | 'shop'
  | 'other'

export const BUSINESS_CATEGORY_LABELS: Record<BusinessCategory, string> = {
  hostel: 'Hostel',
  hotel: 'Hotel / Pousada',
  restaurant: 'Restaurant',
  bar: 'Bar / Beach bar',
  cafe: 'Café',
  kite_school: 'Kite / Surf school',
  tour: 'Tours & activities',
  shop: 'Shop',
  other: 'Other',
}

export type BusinessProfileInput = {
  name: string
  category?: BusinessCategory | ''
  description?: string
  website?: string
  phone?: string
  whatsapp?: string
  hours?: string
  checkIn?: string
  checkOut?: string
  amenities?: string[]
  languages?: string[]
  logoUrl?: string
  coverUrl?: string
}

export type MyBusinessPlace = {
  placeId: string
  name: string
  city: string
  country: string
  slug: string | null
  hasWifi: boolean
  /** Pinned welcome currently shown at the top of the Place Chat ('' = none). */
  pinnedText?: string
}

export type PlaceStatsWindow = 7 | 30

export type PlaceStatsSummary = {
  days: PlaceStatsWindow
  visits: number
  visitors: { new: number; returning: number }
  sources: Record<string, number>
  /** Visits per registered QR placement (`qr=<id>`). */
  qrCodes: Record<string, number>
  /** QR visits whose `qr=` tag isn't a registered placement (absent before the QR placements release). */
  qrUnlisted?: number
  chatJoins: { total: number; sources: Record<string, number> }
  activeDays: number
}

export type BusinessPlaceStats = {
  placeId: string
  asOf: string
  windows: Record<PlaceStatsWindow, PlaceStatsSummary>
  daily: { date: string; visits: number; chatJoins: number }[]
  /** `qrId` → label of every registered placement (active or retired). */
  qrPlacementLabels?: Record<string, string>
}

export type MyBusiness = {
  businessId: string
  role: 'owner' | 'staff'
  profile: BusinessProfileInput & { createdAt: string | null; updatedAt: string | null }
  places: MyBusinessPlace[]
}

export type MyClaim = {
  claimId: string
  placeId: string
  businessName: string
  status: 'pending' | 'approved' | 'rejected'
  createdAt: string | null
  reviewNote: string | null
}

export type AdminClaim = MyClaim & {
  uid: string
  email: string
  role: 'owner' | 'manager'
  contactPhone: string | null
  website: string | null
  message: string | null
  verificationMethod: 'manual' | 'admin_assigned'
  reviewedAt: string | null
  businessId: string | null
}

export class BusinessActionError extends Error {
  readonly code: string
  constructor(code: string, message: string) {
    super(message)
    this.name = 'BusinessActionError'
    this.code = code
  }
}

function fns() {
  const { app } = getFirebaseClient()
  return getFunctions(app)
}

function mapError(err: unknown): BusinessActionError {
  const e = err as { code?: string; message?: string; details?: { businessCode?: string } }
  const code = e?.details?.businessCode ?? e?.code ?? 'unknown'
  const serverMessage = typeof e?.message === 'string' ? e.message : ''
  switch (code) {
    case 'business/unauthenticated':
    case 'functions/unauthenticated':
      return new BusinessActionError(code, 'Please sign in to continue.')
    case 'business/email-not-verified':
      return new BusinessActionError(code, 'Verify your email address first.')
    case 'business/permission-denied':
    case 'functions/permission-denied':
    case 'places/permission-denied':
      return new BusinessActionError(code, serverMessage || 'You are not authorized to do that.')
    case 'business/not-found':
    case 'functions/not-found':
      return new BusinessActionError(code, serverMessage || 'Not found.')
    case 'business/already-exists':
    case 'business/limit-reached':
    case 'functions/failed-precondition':
    case 'business/already-claimed':
    case 'business/claim-pending':
    case 'business/invalid-argument':
    case 'functions/invalid-argument':
    case 'functions/already-exists':
      return new BusinessActionError(code, serverMessage || 'Please check the form and try again.')
    case 'business/rate-limited':
    case 'functions/resource-exhausted':
      return new BusinessActionError(code, serverMessage || 'Too many requests. Please try again later.')
    default:
      return new BusinessActionError(code, 'Something went wrong. Please try again.')
  }
}

export async function requestPlaceClaim(input: {
  placeId: string
  role: 'owner' | 'manager'
  businessName: string
  contactPhone?: string
  website?: string
  message?: string
}): Promise<{ claimId: string }> {
  try {
    const callable = httpsCallable<typeof input, { ok: true; claimId: string }>(fns(), 'requestPlaceClaim')
    const res = await callable(input)
    return { claimId: res.data.claimId }
  } catch (e) {
    throw mapError(e)
  }
}

export async function getMyBusinesses(): Promise<{ businesses: MyBusiness[]; claims: MyClaim[] }> {
  try {
    const callable = httpsCallable<Record<string, never>, { ok: true; businesses: MyBusiness[]; claims: MyClaim[] }>(
      fns(),
      'getMyBusinesses',
    )
    const res = await callable({})
    return { businesses: res.data.businesses ?? [], claims: res.data.claims ?? [] }
  } catch (e) {
    throw mapError(e)
  }
}

export async function updateBusinessProfile(businessId: string, profile: BusinessProfileInput): Promise<void> {
  try {
    const callable = httpsCallable<{ businessId: string; profile: BusinessProfileInput }, { ok: true }>(
      fns(),
      'updateBusinessProfile',
    )
    await callable({ businessId, profile })
  } catch (e) {
    throw mapError(e)
  }
}

export async function adminListClaims(status: 'pending' | 'approved' | 'rejected' = 'pending'): Promise<AdminClaim[]> {
  try {
    const callable = httpsCallable<{ action: 'listClaims'; status: string }, { ok: true; claims: AdminClaim[] }>(
      fns(),
      'runBusinessAdminOps',
    )
    const res = await callable({ action: 'listClaims', status })
    return res.data.claims ?? []
  } catch (e) {
    throw mapError(e)
  }
}

export async function adminReviewClaim(claimId: string, decision: 'approve' | 'reject', note?: string): Promise<void> {
  try {
    const callable = httpsCallable<{ action: 'reviewClaim'; claimId: string; decision: string; note?: string }, { ok: true }>(
      fns(),
      'runBusinessAdminOps',
    )
    await callable({ action: 'reviewClaim', claimId, decision, ...(note ? { note } : {}) })
  } catch (e) {
    throw mapError(e)
  }
}

export async function adminAssignOwner(input: {
  placeId: string
  ownerEmail: string
  businessName: string
  businessId?: string
  note?: string
}): Promise<{ businessId: string; created: boolean; alreadyLinked: boolean }> {
  try {
    const callable = httpsCallable<
      { action: 'assignOwner' } & typeof input,
      { ok: true; result: { businessId: string; created: boolean; alreadyLinked: boolean } }
    >(fns(), 'runBusinessAdminOps')
    const res = await callable({ action: 'assignOwner', ...input })
    return res.data.result
  } catch (e) {
    throw mapError(e)
  }
}

/** Business members pin (or clear with '') the welcome shown in the Place Chat. */
export async function setPlaceChatPinnedInfo(placeId: string, text: string): Promise<{ text: string; cleared: boolean }> {
  try {
    const callable = httpsCallable<{ placeId: string; text: string }, { ok: true; text: string; cleared: boolean }>(
      fns(),
      'setPlaceChatPinnedInfo',
    )
    const res = await callable({ placeId, text })
    return { text: res.data.text, cleared: res.data.cleared }
  } catch (e) {
    throw mapError(e)
  }
}

/** Last 7 / 30 days of link activity (Nessa admins: any Place; owners / managers: their Places). */
export async function getBusinessPlaceStats(placeId: string): Promise<BusinessPlaceStats> {
  try {
    const callable = httpsCallable<{ placeId: string }, { ok: true; stats: BusinessPlaceStats }>(
      fns(),
      'getBusinessPlaceStats',
    )
    const res = await callable({ placeId })
    return res.data.stats
  } catch (e) {
    throw mapError(e)
  }
}

export type QrPlacement = {
  qrId: string
  label: string
  active: boolean
  createdAt: string | null
  createdByEmail: string | null
  createdVia: 'admin' | 'business' | 'backfill'
  retiredAt: string | null
}

export type QrPlacementPlace = {
  placeId: string
  name: string
  city: string | null
  country: string | null
  slug: string | null
  businessId: string | null
}

export type QrPlacementAccess =
  | { kind: 'admin'; role: 'admin' | 'super_admin' }
  | { kind: 'business'; role: 'owner' | 'staff'; businessId: string }

export type QrPlacementList = {
  place: QrPlacementPlace | null
  access: QrPlacementAccess
  placements: QrPlacement[]
  limit: number
}

async function callQrPlacements<T>(data: Record<string, unknown>): Promise<T> {
  try {
    const callable = httpsCallable<Record<string, unknown>, T>(fns(), 'managePlaceQrPlacements')
    const res = await callable(data)
    return res.data
  } catch (e) {
    throw mapError(e)
  }
}

/**
 * QR placements of a Place. Allowed for Nessa admins (any Place) and the
 * Place's business owners / managers — checked by the backend.
 */
export async function listQrPlacements(placeId: string): Promise<QrPlacementList> {
  return callQrPlacements<QrPlacementList>({ action: 'list', placeId })
}

export async function createQrPlacement(placeId: string, label: string): Promise<QrPlacement[]> {
  const res = await callQrPlacements<{ placements: QrPlacement[] }>({ action: 'create', placeId, label })
  return res.placements
}

export async function retireQrPlacement(placeId: string, qrId: string): Promise<QrPlacement[]> {
  const res = await callQrPlacements<{ placements: QrPlacement[] }>({ action: 'retire', placeId, qrId })
  return res.placements
}

export async function restoreQrPlacement(placeId: string, qrId: string): Promise<QrPlacement[]> {
  const res = await callQrPlacements<{ placements: QrPlacement[] }>({ action: 'restore', placeId, qrId })
  return res.placements
}

/** "a, b, c" → ['a','b','c'] (trimmed, deduped). */
export function splitList(raw: string): string[] {
  const out: string[] = []
  for (const part of raw.split(/[,\n]/)) {
    const item = part.trim()
    if (item && !out.includes(item)) {
      out.push(item)
    }
  }
  return out
}
