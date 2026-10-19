'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
  type User,
} from 'firebase/auth'
import { doc, serverTimestamp, setDoc } from 'firebase/firestore'

import { getFirebaseClient } from '@/lib/firebase'
import { AUTH_EMAIL_ACTION_CODE_SETTINGS } from '@/lib/account/constants'
import { buildInitialUserDoc } from '@/lib/account/user-doc'
import { cleanDisplayName, normalizeEmail } from '@/lib/account/validation'

/**
 * Account (non-anonymous) Firebase Auth for business owners on the web.
 *
 * Shares the single Firebase Auth instance with the anonymous guest sign-in
 * used by Place Chat (`useInstantAuth`), but never creates an anonymous user
 * and treats one as "signed out". Signing in replaces any guest session;
 * signing out returns the browser to a guest state, and Place Chat will mint
 * a fresh anonymous user on its next mount, exactly as before.
 *
 * Same Firebase project and email/password accounts as the Nessa app, so a
 * user signs in here with their app credentials. A web sign-up also writes
 * the app-compatible `users/{uid}` profile doc so the app can sign them in.
 */
export type AccountAuthState = {
  /** Non-anonymous Firebase user, or null (includes "anonymous guest"). */
  user: User | null
  /** True until the persisted session has been read. */
  loading: boolean
  emailVerified: boolean
}

export function useAccountAuth(): AccountAuthState & {
  signIn: (email: string, password: string) => Promise<User>
  signUp: (name: string, email: string, password: string) => Promise<User>
  requestPasswordReset: (email: string) => Promise<void>
  resendVerification: () => Promise<void>
  refresh: () => Promise<void>
  signOut: () => Promise<void>
} {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    let unsub: (() => void) | undefined
    ;(async () => {
      try {
        const { auth } = getFirebaseClient()
        await auth.authStateReady()
        if (cancelled) return
        unsub = onAuthStateChanged(auth, u => {
          if (cancelled) return
          setUser(u && !u.isAnonymous ? u : null)
          setLoading(false)
        })
      } catch {
        if (!cancelled) {
          setUser(null)
          setLoading(false)
        }
      }
    })()
    return () => {
      cancelled = true
      unsub?.()
    }
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    const { auth } = getFirebaseClient()
    const cred = await signInWithEmailAndPassword(auth, normalizeEmail(email), password)
    setUser(cred.user)
    return cred.user
  }, [])

  const signUp = useCallback(async (name: string, email: string, password: string) => {
    const { auth, firestore } = getFirebaseClient()
    const cleanName = cleanDisplayName(name)
    const cred = await createUserWithEmailAndPassword(auth, normalizeEmail(email), password)
    // Profile doc first (the app refuses to sign in without it), then the
    // nice-to-haves; neither failure should strand a created account.
    try {
      await setDoc(
        doc(firestore, 'users', cred.user.uid),
        buildInitialUserDoc({
          email: cred.user.email,
          name: cleanName,
          serverTimestamp: serverTimestamp(),
        }),
      )
    } catch {
      // The app creates/repairs the profile on its own first sign-in path.
    }
    try {
      await updateProfile(cred.user, { displayName: cleanName })
    } catch {
      // ignore
    }
    try {
      await sendEmailVerification(cred.user, AUTH_EMAIL_ACTION_CODE_SETTINGS)
    } catch {
      // The sign-in page offers "resend".
    }
    setUser(cred.user)
    return cred.user
  }, [])

  const requestPasswordReset = useCallback(async (email: string) => {
    const { auth } = getFirebaseClient()
    await sendPasswordResetEmail(auth, normalizeEmail(email), AUTH_EMAIL_ACTION_CODE_SETTINGS)
  }, [])

  const resendVerification = useCallback(async () => {
    const { auth } = getFirebaseClient()
    const current = auth.currentUser
    if (current && !current.isAnonymous) {
      await sendEmailVerification(current, AUTH_EMAIL_ACTION_CODE_SETTINGS)
    }
  }, [])

  const refresh = useCallback(async () => {
    const { auth } = getFirebaseClient()
    const current = auth.currentUser
    if (current && !current.isAnonymous) {
      await current.reload()
      // reload() mutates in place; re-set to trigger a render.
      setUser(auth.currentUser)
    }
  }, [])

  const signOut = useCallback(async () => {
    const { auth } = getFirebaseClient()
    await firebaseSignOut(auth)
    setUser(null)
  }, [])

  const emailVerified = useMemo(() => Boolean(user?.emailVerified), [user])

  return {
    user,
    loading,
    emailVerified,
    signIn,
    signUp,
    requestPasswordReset,
    resendVerification,
    refresh,
    signOut,
  }
}
