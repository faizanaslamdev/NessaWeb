'use client'

import { useEffect, useState } from 'react'
import { doc, onSnapshot, type DocumentSnapshot } from 'firebase/firestore'
import { getFirebaseClient } from '@/lib/firebase'
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
      setSession(null)
      setLoading(false)
      return
    }
    setLoading(true)
    const { firestore } = getFirebaseClient()
    const ref = sessionDocRef(firestore, sessionId)
    const unsub = onSnapshot(
      ref,
      (snap) => {
        setSession(toSession(snap))
        setError(null)
        setLoading(false)
      },
      (e) => {
        setError(e)
        setLoading(false)
      },
    )
    return () => unsub()
  }, [sessionId])

  return { session, loading, error }
}
