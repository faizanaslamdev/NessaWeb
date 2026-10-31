/**
 * Business profile callables (Phase A). All authorization is server-side:
 * callables check the caller's verified email and business membership, and
 * admin actions check the backend allowlist. These wrappers only shape
 * requests/responses and map errors to user-facing messages.
 */

import { httpsCallable } from 'firebase/functions'
import { getFunctions } from 'firebase/functions'

import type {
  BusinessCategory,
  BusinessSocials,
  OpeningHours,
  PriceRange,
} from '@/lib/business-profile'
import { getFirebaseClient } from '@/lib/firebase'

export type { BusinessCategory }

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
  /** Weekly timetable; omitted = hours unknown (clears it on save). */
  openingHours?: OpeningHours
  address?: string
  email?: string
  bookingUrl?: string
  menuUrl?: string
  /** URL or @handle as typed (the backend normalizes to a URL). */
  socials?: BusinessSocials
  priceRange?: PriceRange
  paymentMethods?: string[]
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
  profile: BusinessProfileInput & {
    createdAt: string | null
    updatedAt: string | null
    /** Customer messaging switch; absent = on (setBusinessMessaging, owners). */
    messagingEnabled?: boolean
  }
  places: MyBusinessPlace[]
}

export type MyClaim = {
  claimId: string
  placeId: string
  businessName: string
  status: 'pending' | 'approved' | 'rejected'
  createdAt: string | null
  reviewNote: string | null
  /** What the person asked for. */
  role?: 'owner' | 'manager'
  /** What an approval granted ('staff' = manager). */
  grantedRole?: 'owner' | 'staff' | null
}

/** An open manager invitation addressed to the signed-in user. */
export type MyInvite = {
  inviteId: string
  businessId: string
  businessName: string
  placeCount: number
  invitedByEmail: string | null
  expiresAt: string | null
}

export type AdminClaim = MyClaim & {
  uid: string
  email: string
  role: 'owner' | 'manager'
  grantedRole: 'owner' | 'staff' | null
  /** Business already managing the claimed Place (a manager claim joins it). */
  placeBusinessId: string | null
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
    case 'business/needs-owner':
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

export async function getMyBusinesses(): Promise<{ businesses: MyBusiness[]; claims: MyClaim[]; invites: MyInvite[] }> {
  try {
    const callable = httpsCallable<
      Record<string, never>,
      { ok: true; businesses: MyBusiness[]; claims: MyClaim[]; invites?: MyInvite[] }
    >(fns(), 'getMyBusinesses')
    const res = await callable({})
    return { businesses: res.data.businesses ?? [], claims: res.data.claims ?? [], invites: res.data.invites ?? [] }
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

/**
 * Approve or reject a claim. `grantRole` overrides what an approval grants:
 * by default an owner claim makes an owner and a manager claim makes a
 * manager of the business that already runs the Place (never an owner).
 */
export async function adminReviewClaim(
  claimId: string,
  decision: 'approve' | 'reject',
  note?: string,
  grantRole?: 'owner' | 'staff',
): Promise<void> {
  try {
    const callable = httpsCallable<Record<string, unknown>, { ok: true }>(fns(), 'runBusinessAdminOps')
    await callable({ action: 'reviewClaim', claimId, decision, ...(note ? { note } : {}), ...(grantRole ? { grantRole } : {}) })
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

/** Owners turn customer messaging on / off (`messagingEnabled`; absent = on). */
export async function setBusinessMessaging(businessId: string, enabled: boolean): Promise<{ messagingEnabled: boolean }> {
  try {
    const callable = httpsCallable<{ businessId: string; enabled: boolean }, { ok: true; messagingEnabled: boolean }>(
      fns(),
      'setBusinessMessaging',
    )
    const res = await callable({ businessId, enabled })
    return { messagingEnabled: res.data.messagingEnabled }
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

export type TeamMember = {
  uid: string
  email: string | null
  name: string | null
  role: 'owner' | 'staff'
  placeIds: string[]
  addedAt: string | null
}

export type TeamInvite = {
  inviteId: string
  email: string
  placeIds: string[]
  status: 'pending' | 'accepted' | 'declined' | 'revoked' | 'expired'
  createdAt: string | null
  expiresAt: string | null
  invitedByEmail: string | null
}

export type BusinessTeam = {
  canManage: boolean
  you: { uid: string; kind: 'owner' | 'staff' | 'admin' }
  places: { placeId: string; name: string }[]
  members: TeamMember[]
  invites: TeamInvite[]
  limits: { pendingInvites: number; inviteDays: number }
}

export type InviteDetails = {
  inviteId: string
  businessId: string
  businessName: string
  places: { placeId: string; name: string }[]
  invitedByEmail: string | null
  status: TeamInvite['status']
  expiresAt: string | null
}

async function callTeam<T>(data: Record<string, unknown>): Promise<T> {
  try {
    const callable = httpsCallable<Record<string, unknown>, T>(fns(), 'manageBusinessTeam')
    return (await callable(data)).data
  } catch (e) {
    throw mapError(e)
  }
}

/** Team of a business (owners / managers / Nessa admins). Invites are only returned to owners and admins. */
export function getBusinessTeam(businessId: string): Promise<BusinessTeam> {
  return callTeam<BusinessTeam>({ action: 'list', businessId })
}

/** Owner invites a manager for some of the business's places; returns the link to share. */
export async function inviteManager(
  businessId: string,
  email: string,
  placeIds: string[],
): Promise<{ inviteId: string; path: string; refreshed: boolean }> {
  return callTeam({ action: 'invite', businessId, email, placeIds })
}

export async function revokeInvite(businessId: string, inviteId: string): Promise<void> {
  await callTeam({ action: 'revokeInvite', businessId, inviteId })
}

export async function updateManagerPlaces(businessId: string, uid: string, placeIds: string[]): Promise<void> {
  await callTeam({ action: 'updateMember', businessId, uid, placeIds })
}

/** Owner removes a manager, or a manager leaves (uid = their own). */
export async function removeTeamMember(businessId: string, uid: string): Promise<void> {
  await callTeam({ action: 'removeMember', businessId, uid })
}

export async function getInvite(inviteId: string): Promise<InviteDetails> {
  return (await callTeam<{ invite: InviteDetails }>({ action: 'getInvite', inviteId })).invite
}

export async function respondToInvite(inviteId: string, accept: boolean): Promise<{ businessId: string }> {
  return callTeam<{ businessId: string }>({ action: accept ? 'acceptInvite' : 'declineInvite', inviteId })
}

export { splitList } from '@/lib/business-form'
