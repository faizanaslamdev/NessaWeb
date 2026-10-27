/** Place QR filename + share copy. URL itself comes from placeShareUrl. */

export function slugPlaceQrName(placeName: string): string {
  const slug = placeName
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
  return slug || 'place'
}

export function placeQrFilename(placeName: string, placement?: string | null): string {
  const suffix = placement ? `-${slugPlaceQrName(placement)}` : ''
  return `nessa-${slugPlaceQrName(placeName)}${suffix}-qr.png`
}

export function buildPlaceShareMessage(placeName: string): string {
  const name = placeName.trim() || 'this place'
  return `Check out ${name} on Nessa`
}

export function buildPlaceShareText(placeName: string, shareUrl: string): string {
  return `${buildPlaceShareMessage(placeName)}\n${shareUrl}`
}

/**
 * Same rule as the backend (`qrPlacementIdFromLabel`): the `qr=` tag a new
 * placement gets. "Reception desk" → "reception-desk"; null when invalid.
 */
export function qrPlacementIdFromLabel(label: string): string | null {
  const slug = label
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32)
    .replace(/-+$/g, '')
  return /^[a-z0-9][a-z0-9_-]{0,31}$/.test(slug) ? slug : null
}

export const QR_PLACEMENT_LABEL_MAX = 40
