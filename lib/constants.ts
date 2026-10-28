// Site-wide constants

export const siteConfig = {
  name: 'NessaChat',
  description: 'Connect, communicate, and share like never before',
  tagline: 'The messaging app that keeps you connected',
  /** Public support address (deletion requests, legal pages). */
  supportEmail: 'support@nessachat.com',
}

/**
 * Generic “open the app” deep link (host `open`).
 * Must stay in sync with AndroidManifest intent-filter + iOS URL scheme.
 * Do not use bare `nessachat://` — Android requires a host.
 */
export const APP_OPEN_DEEP_LINK = 'nessachat://open' as const


export const appStores = [
  {
    name: 'App Store',
    url: 'https://apps.apple.com/us/app/nessa-chat/id6759522140',
    iconSrc: '/app-store.svg',
    label: 'Download on App Store',
  },
  {
    name: 'Google Play',
    url: 'https://play.google.com/store/apps/details?id=com.nessachat&hl=en_US',
    iconSrc: '/google-play.svg',
    label: 'Get it on Google Play',
  },
]

export const siteRoutes = {
  about: '/about',
  /** What Nessa offers places, and how to claim yours. */
  forBusinesses: '/for-businesses',
  /** Canonical privacy content (Play / store URL). */
  privacyPolicy: '/privacy-policy',
  /** Canonical terms content. */
  termsOfService: '/terms-of-service',
  cookiePolicy: '/cookie-policy',
  acceptableUse: '/acceptable-use',
  requestDeletion: '/request-deletion',
  /** Custom Firebase Auth email action handler (password reset). */
  authAction: '/auth/action',
  /** Public Place QR / acquisition landing. */
  place: '/place',
} as const

/** Native deep link to open a Place in the app (Android host `place`). */
export function placeAppDeepLink(placeId: string): string {
  return `nessachat://place/${encodeURIComponent(placeId.trim())}`
}

/** HTTPS Place share / QR URL (canonical public origin). */
export function placeShareUrl(placeId: string): string {
  return `https://www.nessachat.com/place/${encodeURIComponent(placeId.trim())}`
}
