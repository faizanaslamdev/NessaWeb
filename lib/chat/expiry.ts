import type { Timestamp } from 'firebase/firestore'
import { SESSION_INACTIVITY_MS } from '@/lib/chat/constants'

/**
 * Client-side mirror of plan §4.2 (UI only; Firestore `status` is source of truth).
 */
export function isTimeBasedExpired(args: {
  nowMs: number
  expiresAt: Timestamp | null
  lastActivityAt: Timestamp | null
}): boolean {
  const { nowMs, expiresAt, lastActivityAt } = args
  if (!expiresAt || !lastActivityAt) return false
  if (nowMs >= expiresAt.toMillis()) return true
  if (nowMs - lastActivityAt.toMillis() > SESSION_INACTIVITY_MS) return true
  return false
}
