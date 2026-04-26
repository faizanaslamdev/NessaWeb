import type { Timestamp } from 'firebase/firestore'

/** Ignore bogus / sentinel timestamps so we never flash “ended” on bad first reads. */
const MIN_REASONABLE_MS = Date.UTC(2020, 0, 1)

/**
 * Client-side mirror of absolute `expiresAt` only (UI hint; Firestore `status` is source of truth).
 */
export function isTimeBasedExpired(args: { nowMs: number; expiresAt: Timestamp | null }): boolean {
  const { nowMs, expiresAt } = args
  if (!expiresAt) return false
  const expMs = expiresAt.toMillis()
  if (expMs < MIN_REASONABLE_MS) return false
  return nowMs >= expMs
}

/** Wall-clock ms when `expiresAt` fires. */
export function getSessionEndMillis(expiresAt: Timestamp | null): number | null {
  if (!expiresAt) return null
  const expMs = expiresAt.toMillis()
  if (expMs < MIN_REASONABLE_MS) return null
  return expMs
}
