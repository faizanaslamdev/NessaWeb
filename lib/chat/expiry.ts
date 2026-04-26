import type { Timestamp } from 'firebase/firestore'
import { SESSION_INACTIVITY_MS } from '@/lib/chat/constants'

/** Ignore bogus / sentinel timestamps so we never flash “ended” on bad first reads. */
const MIN_REASONABLE_MS = Date.UTC(2020, 0, 1)

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
  const expMs = expiresAt.toMillis()
  const actMs = lastActivityAt.toMillis()
  if (expMs < MIN_REASONABLE_MS || actMs < MIN_REASONABLE_MS) return false
  if (expMs < actMs) return false
  if (nowMs >= expMs) return true
  if (nowMs - actMs > SESSION_INACTIVITY_MS) return true
  return false
}
