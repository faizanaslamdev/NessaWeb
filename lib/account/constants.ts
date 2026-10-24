/** Account routes and shared Auth email settings (web). */

export const accountRoutes = {
  signIn: '/account/sign-in',
  signUp: '/account/sign-up',
  reset: '/account/reset',
  /** Protected business area. */
  business: '/business',
  /** Claim a Place: `${claim}/{googlePlaceId}`. */
  claim: '/business/claim',
  /** Nessa-admin review page (admin role enforced by the backend). */
  admin: '/admin/business',
  /** Super Admins manage the admin team (manageAdmins callable). */
  adminTeam: '/admin/team',
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
