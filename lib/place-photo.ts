/**
 * Client-side Google Places photo URL sizing for web.
 * Never persist key-bearing URLs. Display-only rewrite of maxWidthPx/maxHeightPx.
 */

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
