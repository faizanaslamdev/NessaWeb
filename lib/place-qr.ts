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

export function placeQrFilename(placeName: string): string {
  return `nessa-${slugPlaceQrName(placeName)}-qr.png`
}

export function buildPlaceShareMessage(placeName: string): string {
  const name = placeName.trim() || 'this place'
  return `Check out ${name} on Nessa`
}

export function buildPlaceShareText(placeName: string, shareUrl: string): string {
  return `${buildPlaceShareMessage(placeName)}\n${shareUrl}`
}
