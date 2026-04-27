'use client'

import { useEffect, useRef, useState } from 'react'
import { FirebaseError } from 'firebase/app'
import { onSnapshot, type DocumentSnapshot } from 'firebase/firestore'
import { getFirebaseClient } from '@/lib/firebase'
import { deferredFirestoreSubscribe } from '@/lib/deferred-firestore-subscribe'
import { sessionDocRef } from '@/lib/chat/session'
import { INSTANT_SESSION_SERVER_READ_FALLBACK_MS } from '@/lib/chat/constants'
import type { ChatSession, ChatMember } from '@/lib/chat/types'
import type { Timestamp } from 'firebase/firestore'

function toSession(snap: DocumentSnapshot): ChatSession | null {
  if (!snap.exists()) return null
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

/**
 * Live session document + **when it is safe to run client-only expiry UI** (`isTimeBasedExpired`).
 *
 * Firestore can emit a **cache-first** snapshot (`metadata.fromCache`) or one that still includes
 * **local pending writes** (`metadata.hasPendingWrites`). Absolute `expiresAt` expiry uses
 * `Date.now()` and document timestamps; evaluating that on cache-only or mid-write data can flash
 * “Chat ended” incorrectly. We therefore expose `clientTimeBasedExpiryAllowed`, which becomes
 * true once we see a server-aligned snapshot, or after {@link INSTANT_SESSION_SERVER_READ_FALLBACK_MS}
 * if we never do (offline edge case). `status === 'expired'` remains authoritative regardless.
 *
 * @param firestoreEnabled When false, the snapshot listener is not started (keeps `loading` true).
 * Use while Auth is still initializing so reads do not run before `request.auth` is available.
 */
export function useInstantSession(sessionId: string | undefined, firestoreEnabled = true) {
  const [session, setSession] = useState<ChatSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [clientTimeBasedExpiryAllowed, setClientTimeBasedExpiryAllowed] = useState(false)
  /** Bumps to re-attach the listener after a one-shot `permission-denied` recovery (token / auth timing). */
  const [snapshotRetryEpoch, setSnapshotRetryEpoch] = useState(0)

  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const permissionDeniedRetryDoneRef = useRef(false)

  useEffect(() => {
    permissionDeniedRetryDoneRef.current = false
  }, [sessionId, firestoreEnabled])

  useEffect(() => {
    const clearFallbackTimer = () => {
      if (fallbackTimerRef.current !== null) {
        clearTimeout(fallbackTimerRef.current)
        fallbackTimerRef.current = null
      }
    }

    if (!sessionId) {
      setTimeout(() => {
        clearFallbackTimer()
        setSession(null)
        setLoading(false)
        setError(null)
        setClientTimeBasedExpiryAllowed(false)
      }, 0)
      return
    }

    if (!firestoreEnabled) {
      clearFallbackTimer()
      queueMicrotask(() => {
        setSession(null)
        setError(null)
        setClientTimeBasedExpiryAllowed(false)
        setLoading(true)
      })
      return () => {
        clearFallbackTimer()
      }
    }

    let cancelled = false
    clearFallbackTimer()
    queueMicrotask(() => {
      if (cancelled) return
      setClientTimeBasedExpiryAllowed(false)
      setError(null)
      setLoading(true)
    })

    const armFallbackOnce = () => {
      if (fallbackTimerRef.current !== null || cancelled) return
      fallbackTimerRef.current = setTimeout(() => {
        fallbackTimerRef.current = null
        if (!cancelled) setClientTimeBasedExpiryAllowed(true)
      }, INSTANT_SESSION_SERVER_READ_FALLBACK_MS)
    }

    const cleanupOuter = deferredFirestoreSubscribe(() => {
      if (cancelled) {
        return () => {}
      }
      const { firestore } = getFirebaseClient()
      const ref = sessionDocRef(firestore, sessionId)
      return onSnapshot(
        ref,
        { includeMetadataChanges: true },
        (snap) => {
          if (cancelled) return

          if (!snap.exists()) {
            clearFallbackTimer()
            setSession(null)
            setClientTimeBasedExpiryAllowed(false)
            setError(null)
            setLoading(false)
            return
          }

          setSession(toSession(snap))
          setError(null)
          setLoading(false)

          const { fromCache, hasPendingWrites } = snap.metadata
          const serverAligned = !fromCache && !hasPendingWrites

          if (serverAligned) {
            clearFallbackTimer()
            setClientTimeBasedExpiryAllowed(true)
          } else {
            armFallbackOnce()
          }
        },
        (e) => {
          if (cancelled) return
          clearFallbackTimer()
          setClientTimeBasedExpiryAllowed(false)

          const canRetryPermissionDenied =
            e instanceof FirebaseError &&
            e.code === 'permission-denied' &&
            !permissionDeniedRetryDoneRef.current

          if (canRetryPermissionDenied) {
            permissionDeniedRetryDoneRef.current = true
            void (async () => {
              try {
                const { auth } = getFirebaseClient()
                await auth.authStateReady()
                await auth.currentUser?.getIdToken(true)
              } catch {
                /* best-effort: re-subscribe anyway */
              }
              if (!cancelled) {
                setSnapshotRetryEpoch((n) => n + 1)
              }
            })()
            return
          }

          setError(e)
          setLoading(false)
        },
      )
    })

    return () => {
      cancelled = true
      clearFallbackTimer()
      cleanupOuter()
    }
  }, [sessionId, firestoreEnabled, snapshotRetryEpoch])

  return { session, loading, error, clientTimeBasedExpiryAllowed }
}
