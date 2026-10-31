'use client'

/**
 * Inbox data for the Business dashboard: the shared "Needs reply" listener
 * (nav badge + the Inbox's default view) and a generic thread-list hook.
 * Reads go through firestore.rules — managers' queries are always scoped to
 * their Places (buildInboxQuery).
 */

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

import {
  INBOX_BADGE_LIMIT,
  buildInboxQuery,
  countUnreadThreads,
  describeListenError,
  inboxQueryKey,
  type InboxAccess,
  type InboxQuerySpec,
  type InboxThread,
} from '@/lib/business-inbox'
import { subscribeInboxThreads } from '@/lib/business-inbox-api'

export type ThreadListState = {
  threads: InboxThread[]
  /** Documents the query returned (before client-side filtering). */
  rawCount: number
  loading: boolean
  error: string | null
}

const EMPTY: ThreadListState = { threads: [], rawCount: 0, loading: true, error: null }

/**
 * Live thread list for `spec` (null = nothing to load). Growing only the
 * limit ("Load more") keeps the current rows on screen while it reloads.
 */
export function useThreadList(spec: InboxQuerySpec | null): ThreadListState {
  const key = inboxQueryKey(spec)
  const baseKey = spec ? JSON.stringify([spec.where, spec.orderBy]) : ''
  const [state, setState] = useState<ThreadListState & { baseKey: string }>({ ...EMPTY, baseKey })

  useEffect(() => {
    if (!key) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset when there is nothing to listen to
      setState({ threads: [], rawCount: 0, loading: false, error: null, baseKey: '' })
      return
    }
    const parsed = JSON.parse(key) as [InboxQuerySpec['where'], InboxQuerySpec['orderBy'], number]
    const current: InboxQuerySpec = { where: parsed[0], orderBy: parsed[1], limit: parsed[2], truncated: false }
    const nextBase = JSON.stringify([parsed[0], parsed[1]])
    setState(s => (s.baseKey === nextBase ? { ...s, loading: true, error: null } : { ...EMPTY, baseKey: nextBase }))
    return subscribeInboxThreads(
      current,
      (threads, rawCount) => setState({ threads, rawCount, loading: false, error: null, baseKey: nextBase }),
      err => setState(s => ({ ...s, loading: false, error: describeListenError(err) })),
    )
  }, [key])

  // While a new filter's first snapshot is on its way, don't show the old rows.
  if (state.baseKey !== baseKey) return key ? EMPTY : { ...EMPTY, loading: false }
  return state
}

type InboxCtx = {
  access: InboxAccess
  businessId: string
  /** Needs reply, every Place the member can see, newest first (≤ INBOX_BADGE_LIMIT). */
  needsReply: ThreadListState
  unreadCount: number
}

const InboxContext = createContext<InboxCtx | null>(null)

export function InboxProvider({
  businessId,
  access,
  children,
}: {
  businessId: string
  access: InboxAccess
  children: ReactNode
}) {
  const placeKey = access.placeIds.join(',')
  const spec = useMemo(
    () =>
      buildInboxQuery({
        businessId,
        access: { role: access.role, placeIds: placeKey ? placeKey.split(',') : [] },
        filter: 'needs_reply',
        placeId: null,
        limit: INBOX_BADGE_LIMIT,
      }),
    [businessId, access.role, placeKey],
  )
  const needsReply = useThreadList(spec)
  const value = useMemo<InboxCtx>(
    () => ({
      access: { role: access.role, placeIds: placeKey ? placeKey.split(',') : [] },
      businessId,
      needsReply,
      unreadCount: countUnreadThreads(needsReply.threads),
    }),
    [access.role, placeKey, businessId, needsReply],
  )
  return <InboxContext.Provider value={value}>{children}</InboxContext.Provider>
}

export function useInbox(): InboxCtx {
  const ctx = useContext(InboxContext)
  if (!ctx) throw new Error('useInbox outside InboxProvider')
  return ctx
}

/** Unread badge count without throwing outside the provider. */
export function useInboxUnreadCount(): number {
  return useContext(InboxContext)?.unreadCount ?? 0
}
