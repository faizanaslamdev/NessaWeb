import { FirebaseError } from 'firebase/app'

export type ChatAuthFailure = {
  headline: string
  detail: string
  /** Show “copy .env.example” hint */
  showEnvHint: boolean
}

function authCode(e: unknown): string | undefined {
  if (e instanceof FirebaseError) return e.code
  if (typeof e === 'object' && e !== null && 'code' in e && typeof (e as { code: unknown }).code === 'string') {
    return (e as { code: string }).code
  }
  return undefined
}

/**
 * Maps Firebase Auth failures to actionable copy (anonymous auth for web chat).
 */
export function describeChatAuthFailure(e: unknown): ChatAuthFailure {
  const code = authCode(e)
  if (code === 'auth/admin-restricted-operation' || code === 'auth/operation-not-allowed') {
    return {
      headline: 'Anonymous sign-in is turned off',
      detail:
        'Web chat uses Firebase Anonymous Auth. Enable it in the Firebase Console:\n\n' +
        '• Authentication → Sign-in method → Anonymous → Enable → Save.\n\n' +
        'If this project uses Google Identity Platform, also check Authentication → Settings → User actions — policies that disable all “sign-up” can block anonymous users too.',
      showEnvHint: false,
    }
  }

  const raw = e instanceof Error ? e.message : String(e)
  const showEnvHint =
    raw.includes('Missing Firebase env') ||
    raw.includes('NEXT_PUBLIC_FIREBASE') ||
    raw.includes('.env.local')

  return {
    headline: showEnvHint ? 'Firebase env missing' : 'Could not sign in',
    detail: raw,
    showEnvHint,
  }
}
