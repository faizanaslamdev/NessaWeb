/** Consumer brand in Place share / helmet titles. */
export const PLACE_SHARE_BRAND = 'Nessa'

/** Browser tab + OG title for a public Place page. */
export function buildPlacePageTitle(placeName?: string | null): string {
  const name = placeName?.trim()
  return name ? `${name} | ${PLACE_SHARE_BRAND}` : `Place on ${PLACE_SHARE_BRAND}`
}
