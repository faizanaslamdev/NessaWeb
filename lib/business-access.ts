/**
 * The signed-in user's business memberships, from the server-maintained
 * `users/{uid}/private/businessAccess` doc (owner-readable; written only by
 * the backend). Used to tell a team member they're looking at their own
 * business instead of offering "Message" (the server refuses it with
 * business/own-business). Pure helpers, unit-tested.
 */

export type BusinessAccessRole = 'owner' | 'staff'

export type BusinessAccessMembership = {
  businessId: string
  role: BusinessAccessRole
  /** Owners: every Place of the business; managers: theirs. */
  placeIds: string[]
  businessName: string
}

function stringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string' && v.length > 0) : []
}

/** Memberships from the doc's data (malformed entries dropped). */
export function parseBusinessAccess(data: unknown): BusinessAccessMembership[] {
  const raw = (data as { memberships?: unknown } | null | undefined)?.memberships
  if (!Array.isArray(raw)) return []
  const out: BusinessAccessMembership[] = []
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue
    const m = entry as Record<string, unknown>
    const businessId = typeof m.businessId === 'string' ? m.businessId.trim() : ''
    const role = m.role === 'owner' || m.role === 'staff' ? m.role : null
    if (!businessId || !role) continue
    out.push({
      businessId,
      role,
      placeIds: stringList(m.placeIds),
      businessName: typeof m.businessName === 'string' && m.businessName.trim() ? m.businessName.trim() : 'Business',
    })
  }
  return out
}

/** Business ids the user is on the team of (any role, any Place — the server refuses all of them). */
export function teamBusinessIds(memberships: readonly BusinessAccessMembership[]): string[] {
  return memberships.map(m => m.businessId)
}

export function businessInboxHref(businessId: string): string {
  return `/business/${encodeURIComponent(businessId)}/inbox`
}

/**
 * What to do with the doc snapshot: use it, wait (only the local cache
 * answered), or — the server says it doesn't exist (accounts from before
 * the doc) — ask the backend once to create it (syncMyBusinessAccess).
 */
export function businessAccessSnapshotAction(input: {
  exists: boolean
  fromCache: boolean
  syncRequested: boolean
}): 'use' | 'wait' | 'sync' | 'empty' {
  if (input.exists) return 'use'
  if (input.fromCache) return 'wait'
  return input.syncRequested ? 'empty' : 'sync'
}
