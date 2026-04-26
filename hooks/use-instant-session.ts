'use client'

import { useEffect, useState } from 'react'
import { onSnapshot, type DocumentSnapshot } from 'firebase/firestore'
import { getFirebaseClient } from '@/lib/firebase'
import { deferredFirestoreSubscribe } from '@/lib/deferred-firestore-subscribe'
import { sessionDocRef } from '@/lib/chat/session'
import type { ChatSession, ChatMember } from '@/lib/chat/types'
import type { Timestamp } from 'firebase/firestore'

function toSession(snap: DocumentSnapshot): ChatSession | null {
  if (!snap.exists) return null
  const d = snap.data()
  if (!d) return null
  const membersRaw = d.members
  const members: Record<string, ChatMember> = {}
  if (membersRaw && typeof membersRaw === 'object') {
    for (const [k, v] of Object.entries(membersRaw as Record<string, Record<string, unknown>>)) {
      if (v && typeof v === 'object' && typeof v.displayName === 'string' && typeof v.language === 'string') {
        members[k] = {
          displayName: v.displayName,
          language: v.language,
          joinedAt: v.joinedAt as Timestamp,
        }
      }
    }
  }
  return {
    sessionId: String(d.sessionId ?? snap.id),
    status: d.status === 'expired' ? 'expired' : 'active',
    createdAt: (d.createdAt as Timestamp) ?? null,
    expiresAt: (d.expiresAt as Timestamp) ?? null,
    lastActivityAt: (d.lastActivityAt as Timestamp) ?? null,
    members,
    createdById: d.createdById as string | undefined,
    updatedAt: (d.updatedAt as Timestamp) ?? null,
  }
}

export function useInstantSession(sessionId: string | undefined) {
  const [session, setSession] = useState<ChatSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!sessionId) {
      setTimeout(() => {
        setSession(null)
        setLoading(false)
      }, 0)
      return
    }

    let cancelled = false
    setTimeout(() => {
      setLoading(true)
    }, 0)

    const cleanupOuter = deferredFirestoreSubscribe(() => {
      if (cancelled) {
        return () => {}
      }
      const { firestore } = getFirebaseClient()
      const ref = sessionDocRef(firestore, sessionId)
      return onSnapshot(
        ref,
        (snap) => {
          if (cancelled) return
          setSession(toSession(snap))
          setError(null)
          setLoading(false)
        },
        (e) => {
          if (!cancelled) {
            setError(e)
            setLoading(false)
          }
        },
      )
    })

    return () => {
      cancelled = true
      cleanupOuter()
    }
  }, [sessionId])

  return { session, loading, error }
}
