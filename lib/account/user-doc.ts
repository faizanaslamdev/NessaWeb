/**
 * Initial `users/{uid}` document for an account created on the web.
 *
 * Mirrors NessaChat/src/hooks/useAuth.ts signUpWithEmail so that an account
 * created here can sign in to the app afterwards (the app refuses to sign in
 * without a profile doc) and goes through the app's normal profile setup
 * (`isProfileComplete: false`). Search-index fields are maintained by the
 * `onUserSearchFieldsSync` Cloud Function trigger.
 */

/** Keep in sync with NessaChat/src/constants/schema.ts */
export const WEB_USER_SCHEMA_VERSION = 2

export function buildInitialUserDoc(input: {
  email: string | null
  name: string
  serverTimestamp: unknown
}): Record<string, unknown> {
  return {
    schemaVersion: WEB_USER_SCHEMA_VERSION,
    email: input.email,
    name: input.name,
    avatar: '',
    country: '',
    countryFlag: '',
    nativeLanguages: [{ code: 'en', level: 5 }],
    learningLanguages: [],
    interests: [],
    visitedCountries: [],
    profilePhotos: [],
    socialCounts: { followers: 0, following: 0, stories: 0 },
    isProfileComplete: false,
    requiresEmailVerification: true,
    discoveryVisible: true,
    blockedUsers: [],
    createdAt: input.serverTimestamp,
    lastActive: input.serverTimestamp,
    settings: {
      notifications: true,
      hideFromSearch: false,
      discoveryVisible: true,
      autoTranslateMessages: true,
      translationLanguage: 'en',
    },
    /** Where the account was created; informational only. */
    signupSource: 'web',
  }
}
