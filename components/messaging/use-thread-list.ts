'use client'

import { useEffect, useState } from 'react'

import { threadQueryKey, type BusinessThread, type ThreadQuerySpec } from '@/lib/business-messaging'
import { subscribeThreads } from '@/lib/business-messaging-api'

export type ThreadListState = {
  threads: BusinessThread[]
  /** Documents the query returned (before any client-side filtering). */
  rawCount: number
  loading: boolean
  /** The raw listener error (callers turn it into copy for their side). */
  error: unknown
}

const EMPTY: ThreadListState = { threads: [], rawCount: 0, loading: true, error: null }

/**
 * Live thread list for `spec` (null = nothing to load). Growing only the
 * limit ("Load more") keeps the current rows on screen while it reloads.
 */
export function useThreadList(spec: ThreadQuerySpec | null): ThreadListState {
  const key = threadQueryKey(spec)
  const baseKey = spec ? JSON.stringify([spec.where, spec.orderBy]) : ''
  const [state, setState] = useState<ThreadListState & { baseKey: string }>({ ...EMPTY, baseKey })

  useEffect(() => {
    if (!key) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset when there is nothing to listen to
      setState({ threads: [], rawCount: 0, loading: false, error: null, baseKey: '' })
      return
    }
    const parsed = JSON.parse(key) as [ThreadQuerySpec['where'], ThreadQuerySpec['orderBy'], number]
    const current: ThreadQuerySpec = { where: parsed[0], orderBy: parsed[1], limit: parsed[2], truncated: false }
    const nextBase = JSON.stringify([parsed[0], parsed[1]])
    setState(s => (s.baseKey === nextBase ? { ...s, loading: true, error: null } : { ...EMPTY, baseKey: nextBase }))
    return subscribeThreads(
      current,
      (threads, rawCount) => setState({ threads, rawCount, loading: false, error: null, baseKey: nextBase }),
      err => setState(s => ({ ...s, loading: false, error: err ?? new Error('listen failed') })),
    )
  }, [key])

  // While a new query's first snapshot is on its way, don't show the old rows.
  if (state.baseKey !== baseKey) return key ? EMPTY : { ...EMPTY, loading: false }
  return state
}
