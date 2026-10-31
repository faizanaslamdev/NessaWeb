'use client'

import { useEffect, useState } from 'react'
import { onAuthStateChanged, signInAnonymously, type User } from 'firebase/auth'
import { getFirebaseClient } from '@/lib/firebase'
import { describeChatAuthFailure } from '@/lib/chat/auth-errors'

/**
 * Anonymous Firebase user for web chat (plan §7).
 */
export function useInstantAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    let unsub: (() => void) | undefined
    let cancelled = false

    ;(async () => {
      try {
        const { auth } = getFirebaseClient()
        await auth.authStateReady()
        if (cancelled) return

        unsub = onAuthStateChanged(auth, (u) => {
          if (!cancelled) setUser(u)
        })

        if (!auth.currentUser) {
          await signInAnonymously(auth)
        }
        if (cancelled) return

        const signedIn = auth.currentUser
        if (!signedIn) {
          if (!cancelled) {
            setError(new Error('Sign-in finished but no Firebase user is available. Try again.'))
            setLoading(false)
          }
          return
        }

        // Mint a credential before Firestore reads so rules always see `request.auth` (prod cold start).
        await signedIn.getIdToken()
        if (cancelled) return

        // Avoid a frame where `loading` is false but `user` is still null (onAuthStateChanged not flushed yet).
        setUser(signedIn)
        setLoading(false)
      } catch (e) {
        if (!cancelled) {
          const { headline, detail } = describeChatAuthFailure(e)
          setError(new Error(`${headline}\n\n${detail}`))
          setLoading(false)
        }
      }
    })()

    return () => {
      cancelled = true
      unsub?.()
    }
  }, [])

  return { user, loading, error }
}

/**
 * The signed-in user, or a new anonymous one — only when the visitor acts
 * (e.g. "Create room"). Pages crawlers may render (the /chat lobby) use this
 * instead of `useInstantAuth`, so a page view never creates an anonymous
 * account. Throws an Error with readable copy on failure.
 */
export async function ensureInstantUser(): Promise<User> {
  try {
    const { auth } = getFirebaseClient()
    await auth.authStateReady()
    const user = auth.currentUser ?? (await signInAnonymously(auth)).user
    // Mint a credential before Firestore writes so rules see `request.auth`.
    await user.getIdToken()
    return user
  } catch (e) {
    const { headline, detail } = describeChatAuthFailure(e)
    throw new Error(`${headline}\n\n${detail}`)
  }
}
