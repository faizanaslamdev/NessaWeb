/** Account routes and shared Auth email settings (web). */

export const accountRoutes = {
  signIn: '/account/sign-in',
  signUp: '/account/sign-up',
  reset: '/account/reset',
  /** Protected business area. */
  business: '/business',
  /** Claim a Place: `${claim}/{googlePlaceId}`. */
  claim: '/business/claim',
  /** Nessa admin console home (admin role enforced by the backend). */
  admin: '/admin',
  /** Admin: business claims review. */
  adminClaims: '/admin/business',
  /** Super Admins manage the admin team (manageAdmins callable). */
  adminTeam: '/admin/team',
  /** Admins: Places — chat settings, QR placements, stats, business, history. */
  adminPlaces: '/admin/places',
  /** Admins: audit log of every admin / business change. */
  adminAudit: '/admin/audit',
} as const

/**
 * Branded email action handler, same as the app
 * (NessaChat/src/config/authAction.ts). Password-reset and verification
 * emails link to nessachat.com/auth/action, handled by AuthActionClient.
 */
export const AUTH_EMAIL_ACTION_CODE_SETTINGS = {
  url: 'https://nessachat.com/auth/action',
  handleCodeInApp: false,
} as const

/**
 * The admin console lives at admin.nessachat.com once that domain is set up
 * (NEXT_PUBLIC_ADMIN_ORIGIN, e.g. https://admin.nessachat.com); until then,
 * and in development, at /admin on the same site.
 */
export function adminConsoleHref(path = ''): string {
  const origin = process.env.NEXT_PUBLIC_ADMIN_ORIGIN?.replace(/\/$/, '')
  const clean = path ? `/${path.replace(/^\/+/, '')}` : ''
  return origin ? `${origin}${clean || '/'}` : `/admin${clean}`
}

/** Hostname of the admin console (rewrites + host checks). */
export const ADMIN_HOSTNAME_PREFIX = 'admin.'
