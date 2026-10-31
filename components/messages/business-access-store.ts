'use client'

/**
 * The signed-in user's business memberships (users/{uid}/private/businessAccess),
 * one live listener shared by every consumer on the page (the Place page's
 * Message button, /messages/new) and torn down when the last one unmounts.
 * A missing doc (accounts from before it existed) is created once per
 * session with syncMyBusinessAccess; the listener then picks it up.
 */

import { useCallback, useSyncExternalStore } from 'react'

import { businessAccessSnapshotAction, parseBusinessAccess, teamBusinessIds } from '@/lib/business-access'
import { subscribeBusinessAccess, syncMyBusinessAccess } from '@/lib/business-messaging-api'

export type BusinessAccessSummary = {
  /** Business ids the user is on the team of. */
  teamBusinessIds: string[]
  loaded: boolean
}

const EMPTY: BusinessAccessSummary = { teamBusinessIds: [], loaded: false }

type Entry = {
  snapshot: BusinessAccessSummary
  listeners: Set<() => void>
  stop: (() => void) | null
  timer: ReturnType<typeof setTimeout> | null
}

const entries = new Map<string, Entry>()
/** Uids we already asked the server to create the doc for (this page session). */
const syncRequested = new Set<string>()

function entryFor(uid: string): Entry {
  let entry = entries.get(uid)
  if (!entry) {
    entry = { snapshot: EMPTY, listeners: new Set(), stop: null, timer: null }
    entries.set(uid, entry)
  }
  return entry
}

function publish(entry: Entry, ids: string[]) {
  const same = entry.snapshot.loaded && entry.snapshot.teamBusinessIds.join('|') === ids.join('|')
  if (same) return
  entry.snapshot = { teamBusinessIds: ids, loaded: true }
  entry.listeners.forEach(l => l())
}

function subscribe(uid: string, listener: () => void): () => void {
  const entry = entryFor(uid)
  entry.listeners.add(listener)
  if (entry.timer) {
    clearTimeout(entry.timer)
    entry.timer = null
  }
  if (!entry.stop) {
    entry.stop = subscribeBusinessAccess(
      uid,
      snap => {
        const action = businessAccessSnapshotAction({ ...snap, syncRequested: syncRequested.has(uid) })
        if (action === 'wait') return
        if (action === 'use') {
          publish(entry, teamBusinessIds(parseBusinessAccess(snap.data)))
          return
        }
        publish(entry, [])
        if (action === 'sync') {
          syncRequested.add(uid)
          // Best effort: the server still refuses own-business messages.
          syncMyBusinessAccess().catch(() => {})
        }
      },
      // Fail open: the Message button behaves as before (the callable refuses own-business).
      () => publish(entry, []),
    )
  }
  return () => {
    entry.listeners.delete(listener)
    if (entry.listeners.size === 0 && !entry.timer) {
      entry.timer = setTimeout(() => {
        entry.timer = null
        if (entry.listeners.size > 0) return
        entry.stop?.()
        entries.delete(uid)
      }, 1000)
    }
  }
}

const noop = () => () => {}

/** The user's team business ids (EMPTY when signed out). */
export function useBusinessAccess(uid: string | null | undefined): BusinessAccessSummary {
  const sub = useCallback((l: () => void) => (uid ? subscribe(uid, l) : noop()), [uid])
  const get = useCallback(() => (uid ? entryFor(uid).snapshot : EMPTY), [uid])
  return useSyncExternalStore(sub, get, () => EMPTY)
}
