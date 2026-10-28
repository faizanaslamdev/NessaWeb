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

/** Production admin console origin (Vercel domain on the nessa-web project). */
export const PRODUCTION_ADMIN_ORIGIN = 'https://admin.nessachat.com'

/** Public-site hostnames whose admin links go to the admin console domain. */
export const PRODUCTION_PUBLIC_HOSTS = ['nessachat.com', 'www.nessachat.com'] as const

/**
 * Origin of the admin console for links shown on this site:
 * - NEXT_PUBLIC_ADMIN_ORIGIN when set (override);
 * - https://admin.nessachat.com on the production public site;
 * - '' (same site, /admin) in development and preview deployments.
 */
export function adminConsoleOrigin(hostname?: string | null): string {
  const override = process.env.NEXT_PUBLIC_ADMIN_ORIGIN?.replace(/\/$/, '')
  if (override) return override
  const host = (hostname ?? (typeof window !== 'undefined' ? window.location.hostname : '')).toLowerCase()
  return (PRODUCTION_PUBLIC_HOSTS as readonly string[]).includes(host) ? PRODUCTION_ADMIN_ORIGIN : ''
}

/** Link to the admin console (optionally a page in it), e.g. adminConsoleHref('places'). */
export function adminConsoleHref(path = '', hostname?: string | null): string {
  const origin = adminConsoleOrigin(hostname)
  const clean = path ? `/${path.replace(/^\/+/, '')}` : ''
  return origin ? `${origin}${clean || '/'}` : `/admin${clean}`
}

/** Hostname of the admin console (rewrites + host checks). */
export const ADMIN_HOSTNAME_PREFIX = 'admin.'
