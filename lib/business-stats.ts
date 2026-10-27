/**
 * Presentation helpers for the business Place stats (pure, unit-tested).
 * The numbers come from `getBusinessPlaceStats`; nothing here fetches.
 */

import type { PlaceStatsSummary } from '@/lib/business'

export const PLACE_SOURCE_LABELS: Record<string, string> = {
  qr: 'QR codes',
  prearrival: 'Pre-arrival links',
  instagram: 'Instagram',
  website: 'Your website',
  search: 'Google / search',
  nessa_app: 'Nessa app',
  nessa_web: 'nessachat.com',
  referral: 'Other sites',
  direct: 'Direct / typed',
}

export type StatRow = { key: string; label: string; count: number; share: number }

/** Sorted rows (largest first) with each row's share of the total (0–1). */
export function statRows(counts: Record<string, number>, labels: Record<string, string> = PLACE_SOURCE_LABELS): StatRow[] {
  const entries = Object.entries(counts).filter(([, n]) => Number.isFinite(n) && n > 0)
  const total = entries.reduce((sum, [, n]) => sum + n, 0)
  return entries
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([key, count]) => ({
      key,
      label: labels[key] ?? key,
      count,
      share: total > 0 ? count / total : 0,
    }))
}

/** "reception" → "Reception", "room-12" → "Room 12". */
export function qrPlacementLabel(qrId: string): string {
  const words = qrId.replace(/[-_]+/g, ' ').trim()
  return words ? words[0].toUpperCase() + words.slice(1) : qrId
}

/** Key of the placement row for QR scans with an unregistered `qr=` tag. */
export const UNLISTED_QR_ROW_KEY = '__unlisted'

/**
 * "QR placements" rows: registered placements (with their saved labels),
 * plus one row for QR scans whose tag isn't registered. Shares are of all
 * tagged QR visits.
 */
export function placementStatRows(
  summary: Pick<PlaceStatsSummary, 'qrCodes' | 'qrUnlisted'>,
  labels: Record<string, string> = {},
): StatRow[] {
  const counts: Record<string, number> = { ...summary.qrCodes }
  if ((summary.qrUnlisted ?? 0) > 0) counts[UNLISTED_QR_ROW_KEY] = summary.qrUnlisted ?? 0
  return statRows(counts, {}).map(r => ({
    ...r,
    label: r.key === UNLISTED_QR_ROW_KEY ? 'Unregistered tags' : labels[r.key] ?? qrPlacementLabel(r.key),
  }))
}

export function percentLabel(share: number): string {
  if (!Number.isFinite(share) || share <= 0) return '0%'
  const pct = share * 100
  return `${pct < 1 ? '<1' : Math.round(pct)}%`
}

/** One-line summary used for the headline tiles. */
export function summaryTiles(summary: PlaceStatsSummary): { label: string; value: number; hint?: string }[] {
  const qrVisits = summary.sources.qr ?? 0
  return [
    { label: 'Page visits', value: summary.visits, hint: summary.visitors.new > 0 || summary.visitors.returning > 0 ? `${summary.visitors.new} new · ${summary.visitors.returning} returning` : undefined },
    { label: 'Chat joins', value: summary.chatJoins.total },
    { label: 'From QR codes', value: qrVisits, hint: qrVisits > 0 && summary.visits > 0 ? percentLabel(qrVisits / summary.visits) + ' of visits' : undefined },
  ]
}
