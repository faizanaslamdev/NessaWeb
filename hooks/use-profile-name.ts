'use client'

import { useEffect, useState } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import type { User } from 'firebase/auth'

import { getFirebaseClient } from '@/lib/firebase'

/**
 * Display name for dashboard greetings and avatars: the Auth profile name,
 * else the Nessa profile name (`users/{uid}.name`, set in the app), else null.
 */
export function useProfileName(user: User | null): string | null {
  const [name, setName] = useState<string | null>(null)
  useEffect(() => {
    if (!user) return
    if (user.displayName?.trim()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setName(user.displayName.trim())
      return
    }
    let cancelled = false
    const { firestore } = getFirebaseClient()
    getDoc(doc(firestore, 'users', user.uid))
      .then(snap => {
        const n = snap.exists() ? snap.data()?.name : null
        if (!cancelled && typeof n === 'string' && n.trim()) setName(n.trim().slice(0, 60))
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [user])
  return name
}
