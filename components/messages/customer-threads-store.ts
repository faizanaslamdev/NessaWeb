'use client'

/**
 * One small live listener on the signed-in traveler's newest business
 * threads (CUSTOMER_BADGE_LIMIT), shared by every consumer on the page —
 * the account menu badge, the mobile menu and the Place page's Message
 * button — and torn down when the last one unmounts or the user signs out.
 */

import { useCallback, useSyncExternalStore } from 'react'

import type { BusinessThread } from '@/lib/business-messaging'
import { subscribeThreads } from '@/lib/business-messaging-api'
import { CUSTOMER_BADGE_LIMIT, buildCustomerThreadsQuery, countCustomerUnread } from '@/lib/customer-messages'

export type CustomerThreadsSummary = {
  threads: BusinessThread[]
  loaded: boolean
  unread: number
}

const EMPTY: CustomerThreadsSummary = { threads: [], loaded: false, unread: 0 }

type Entry = {
  snapshot: CustomerThreadsSummary
  listeners: Set<() => void>
  stop: (() => void) | null
  /** Pending teardown (lets a quick remount keep the listener). */
  timer: ReturnType<typeof setTimeout> | null
}

const entries = new Map<string, Entry>()

function entryFor(uid: string): Entry {
  let entry = entries.get(uid)
  if (!entry) {
    entry = { snapshot: EMPTY, listeners: new Set(), stop: null, timer: null }
    entries.set(uid, entry)
  }
  return entry
}

function publish(entry: Entry, snapshot: CustomerThreadsSummary) {
  entry.snapshot = snapshot
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
    const spec = buildCustomerThreadsQuery(uid, CUSTOMER_BADGE_LIMIT)
    if (spec) {
      entry.stop = subscribeThreads(
        spec,
        threads => publish(entry, { threads, loaded: true, unread: countCustomerUnread(threads) }),
        // A badge is a nice-to-have: on error just show nothing.
        () => publish(entry, { threads: [], loaded: true, unread: 0 }),
      )
    }
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

/** The traveler's newest threads and unread count (EMPTY when signed out). */
export function useCustomerThreadsSummary(uid: string | null | undefined): CustomerThreadsSummary {
  const sub = useCallback((l: () => void) => (uid ? subscribe(uid, l) : noop()), [uid])
  const get = useCallback(() => (uid ? entryFor(uid).snapshot : EMPTY), [uid])
  return useSyncExternalStore(sub, get, () => EMPTY)
}
