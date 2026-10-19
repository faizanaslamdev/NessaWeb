/** Shared form validation for the account pages (pure, unit-tested). */

export const ACCOUNT_PASSWORD_MIN_LENGTH = 8
export const ACCOUNT_NAME_MAX_LENGTH = 60

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase()
}

export function validateEmail(raw: string): string | null {
  const email = normalizeEmail(raw)
  if (!email) {
    return 'Enter your email address.'
  }
  if (email.length > 254 || !EMAIL_PATTERN.test(email)) {
    return 'That email address doesn’t look right.'
  }
  return null
}

export function validatePassword(raw: string): string | null {
  if (!raw) {
    return 'Enter a password.'
  }
  if (raw.length < ACCOUNT_PASSWORD_MIN_LENGTH) {
    return `Use at least ${ACCOUNT_PASSWORD_MIN_LENGTH} characters.`
  }
  if (raw.length > 128) {
    return 'That password is too long.'
  }
  return null
}

export function validateDisplayName(raw: string): string | null {
  const name = raw.trim().replace(/\s+/g, ' ')
  if (!name) {
    return 'Enter your name.'
  }
  if (name.length > ACCOUNT_NAME_MAX_LENGTH) {
    return `Keep your name under ${ACCOUNT_NAME_MAX_LENGTH} characters.`
  }
  return null
}

export function cleanDisplayName(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ').slice(0, ACCOUNT_NAME_MAX_LENGTH)
}

/**
 * Only allow same-origin relative paths as post-sign-in destinations, so a
 * crafted link can't bounce someone to another site after they sign in.
 */
export function safeNextPath(raw: string | null | undefined, fallback = '/business'): string {
  if (!raw) {
    return fallback
  }
  const value = raw.trim()
  if (!value.startsWith('/') || value.startsWith('//') || value.includes('\\')) {
    return fallback
  }
  try {
    const url = new URL(value, 'https://www.nessachat.com')
    if (url.origin !== 'https://www.nessachat.com') {
      return fallback
    }
    return `${url.pathname}${url.search}${url.hash}`
  } catch {
    return fallback
  }
}
