'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  ref,
  onValue,
  set,
  onDisconnect,
  serverTimestamp,
  type DataSnapshot,
} from 'firebase/database'
import { getFirebaseClient } from '@/lib/firebase'
import { rtdbPresencePath } from '@/lib/chat/constants'

export type PresenceState = 'online' | 'offline'

export type PresenceRecord = {
  state: PresenceState
  lastChanged?: number
}

function payload(state: PresenceState) {
  return { state, lastChanged: serverTimestamp() }
}

function toLastChangedMs(raw: unknown): number | undefined {
  if (raw == null) return undefined
  const n = Number(raw)
  if (Number.isNaN(n)) return undefined
  return n > 0 && n < 1e12 ? n * 1000 : n
}

/**
 * Subscribe to RTDB presence for many uids (plan §7.1 — read path, mirrors mobile `usePresence`).
 */
export function usePresenceByUserIds(userIds: string[]) {
  const userIdsKey = userIds.join('|')
  const key = useMemo(
    () => Array.from(new Set(userIds.filter(Boolean))).sort().join('|'),
    // `userIdsKey` avoids unstable `userIds` array identity while tracking content changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: depend on serialized ids
    [userIdsKey],
  )
  const stable = useMemo(() => (key ? key.split('|').filter(Boolean) : []), [key])

  const [byUser, setByUser] = useState<Record<string, PresenceRecord>>({})

  useEffect(() => {
    if (!stable.length) {
      const t = window.setTimeout(() => setByUser({}), 0)
      return () => window.clearTimeout(t)
    }
    const { rtdb } = getFirebaseClient()
    const unsubs: Array<() => void> = []

    for (const uid of stable) {
      const r = ref(rtdb, rtdbPresencePath(uid))
      const unsub = onValue(r, (snap: DataSnapshot) => {
        const val = (snap.val() || {}) as Record<string, unknown>
        const state: PresenceState = val.state === 'online' ? 'online' : 'offline'
        const lastChanged = toLastChangedMs(val.lastChanged)
        setByUser((prev) => ({ ...prev, [uid]: { state, lastChanged } }))
      })
      unsubs.push(unsub)
    }

    return () => {
      for (const u of unsubs) u()
    }
  }, [stable])

  return byUser
}

/**
 * Write presence for the current user while `enabled` (plan §7.1).
 * — `onDisconnect` → offline is **primary** for abrupt tab close.
 * — `set(offline)` on cleanup is **graceful** only (may double-write; idempotent).
 */
export function useInstantPresenceTracking(uid: string | undefined, enabled: boolean) {
  useEffect(() => {
    if (!uid || !enabled) return

    const { rtdb } = getFirebaseClient()
    const statusRef = ref(rtdb, rtdbPresencePath(uid))
    const connectedRef = ref(rtdb, '.info/connected')

    const setOnline = () => set(statusRef, payload('online'))
    const setOffline = () => set(statusRef, payload('offline'))

    const onVis = () => {
      if (document.visibilityState === 'visible') void setOnline()
      else void setOffline()
    }

    const onConnected = (snap: DataSnapshot) => {
      if (snap.val() === true) {
        void onDisconnect(statusRef).set(payload('offline'))
        void setOnline()
      }
    }

    const unsubConnected = onValue(connectedRef, onConnected)
    document.addEventListener('visibilitychange', onVis)

    return () => {
      document.removeEventListener('visibilitychange', onVis)
      unsubConnected()
      void setOffline()
    }
  }, [uid, enabled])
}
