/**
 * Place photo URLs on the web.
 *
 * - NessaChat photos (our Firebase Storage) are free to show anywhere: server
 *   HTML, cards, OG images.
 * - Google Places photos carry the public Maps key, are billed per request and
 *   must be shown with their attribution: Place page only, loaded in the
 *   browser. Display-only rewrite of maxWidthPx/maxHeightPx.
 */

/** True for images hosted by NessaChat (Firebase Storage, or its local emulator). */
export function isNessaPhotoUrl(url: string | null | undefined): boolean {
  if (!url) return false
  try {
    const u = new URL(url.trim())
    if (u.protocol === 'https:' && u.host === 'firebasestorage.googleapis.com') return u.pathname.startsWith('/v0/b/')
    return u.protocol === 'http:' && (u.hostname === '127.0.0.1' || u.hostname === 'localhost') && u.pathname.startsWith('/v0/b/')
  } catch {
    return false
  }
}

export type WebPlacePhotoVariant = 'landing' | 'lightbox';

/** Landing card is ~16:10 full-bleed; lightbox uses larger edge. */
export const WEB_PLACE_PHOTO_MAX_PX: Record<WebPlacePhotoVariant, number> = {
  landing: 480,
  lightbox: 800,
};

export function sizedGooglePlacePhotoUrl(
  uri: string,
  maxPx: number,
): string {
  const trimmed = uri.trim();
  if (!trimmed) {
    return trimmed;
  }
  try {
    const parsed = new URL(trimmed);
    const hasSizeParams =
      parsed.searchParams.has('maxWidthPx') ||
      parsed.searchParams.has('maxHeightPx');
    if (!hasSizeParams) {
      return trimmed;
    }
    const next = String(Math.max(1, Math.round(maxPx)));
    parsed.searchParams.set('maxWidthPx', next);
    parsed.searchParams.set('maxHeightPx', next);
    return parsed.toString();
  } catch {
    return trimmed;
  }
}

export function placePhotoUrlForWebVariant(
  uri: string | null | undefined,
  variant: WebPlacePhotoVariant,
): string | null {
  const trimmed = uri?.trim();
  if (!trimmed) {
    return null;
  }
  return sizedGooglePlacePhotoUrl(trimmed, WEB_PLACE_PHOTO_MAX_PX[variant]);
}

/**
 * The Place's NessaChat cover (small variant when `small`), or null when the
 * Place only has Google's photo. Dashboards, previews and claim pages use
 * this: they never load Google photos.
 */
export function nessaCoverUrl(
  landing: { coverImageUrl?: string; coverFeedUrl?: string; coverSource?: string } | null | undefined,
  small = false,
): string | null {
  if (!landing?.coverImageUrl) return null
  if (landing.coverSource !== 'nessa' && !isNessaPhotoUrl(landing.coverImageUrl)) return null
  return (small && landing.coverFeedUrl) || landing.coverImageUrl
}
