/**
 * Human-readable messages for Firebase Auth errors on the account pages.
 * Pure (no Firebase import) so it can be unit-tested.
 */

export function authErrorCode(e: unknown): string {
  const code = (e as { code?: unknown })?.code
  return typeof code === 'string' ? code : ''
}

export function describeAccountAuthError(e: unknown): string {
  switch (authErrorCode(e)) {
    case 'auth/invalid-email':
      return 'That email address doesn’t look right.'
    case 'auth/user-disabled':
      return 'This account has been disabled. Contact support if you think this is a mistake.'
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
    case 'auth/invalid-login-credentials':
      return 'Incorrect email or password.'
    case 'auth/email-already-in-use':
      return 'An account with this email already exists. Sign in instead, or reset your password.'
    case 'auth/weak-password':
      return 'Please choose a longer password (at least 8 characters).'
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a few minutes and try again.'
    case 'auth/network-request-failed':
      return 'Network problem. Check your connection and try again.'
    case 'auth/operation-not-allowed':
      return 'Email sign-in isn’t enabled for this project yet.'
    case 'auth/requires-recent-login':
      return 'Please sign in again to continue.'
    default:
      return 'Something went wrong. Please try again.'
  }
}
