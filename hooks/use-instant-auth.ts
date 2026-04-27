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
