'use client'

/**
 * Inbox data for the Business dashboard: the shared "Needs reply" listener
 * (nav badge + the Inbox's default view) and a generic thread-list hook.
 * Reads go through firestore.rules — managers' queries are always scoped to
 * their Places (buildInboxQuery).
 */

import { createContext, useContext, useMemo, type ReactNode } from 'react'

import { useThreadList as useRawThreadList } from '@/components/messaging/use-thread-list'
import {
  INBOX_BADGE_LIMIT,
  buildInboxQuery,
  countUnreadThreads,
  describeListenError,
  type InboxAccess,
  type InboxQuerySpec,
  type InboxThread,
} from '@/lib/business-inbox'

export type ThreadListState = {
  threads: InboxThread[]
  /** Documents the query returned. */
  rawCount: number
  loading: boolean
  error: string | null
}

/** Live staff thread list for `spec` (null = nothing to load), errors in staff copy. */
export function useThreadList(spec: InboxQuerySpec | null): ThreadListState {
  const raw = useRawThreadList(spec)
  const error = raw.error ? describeListenError(raw.error) : null
  return useMemo(
    () => ({ threads: raw.threads, rawCount: raw.rawCount, loading: raw.loading, error }),
    [raw.threads, raw.rawCount, raw.loading, error],
  )
}

type InboxCtx = {
  access: InboxAccess
  businessId: string
  /** Open threads needing a reply (status == open, needsReply), every Place the member can see, newest first (≤ INBOX_BADGE_LIMIT). */
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
