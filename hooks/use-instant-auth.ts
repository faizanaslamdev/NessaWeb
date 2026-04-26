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
        unsub = onAuthStateChanged(auth, (u) => {
          if (!cancelled) setUser(u)
        })
        if (!auth.currentUser) {
          await signInAnonymously(auth)
        }
      } catch (e) {
        if (!cancelled) {
          const { headline, detail } = describeChatAuthFailure(e)
          setError(new Error(`${headline}\n\n${detail}`))
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
      unsub?.()
    }
  }, [])

  return { user, loading, error }
}
