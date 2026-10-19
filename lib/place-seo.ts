/**
 * SEO helpers for public Place pages (`/places/{slug}`): unique titles and
 * descriptions from the Place's name/location, the indexability rule, and
 * schema.org JSON-LD.
 */

import { PLACE_SHARE_BRAND, buildPlacePageTitle } from '@/lib/place-title'

export type PlaceSeoInput = {
  name: string
  placeType?: string
  city?: string
  country?: string
  recommenderCount?: number
  storyCount?: number
  coverImageUrl?: string
  /** Verified business (official layer), if the Place is claimed. */
  business?: {
    name: string
    website?: string
    phone?: string
    description?: string
    logoUrl?: string
  } | null
}

const DESCRIPTION_MAX = 158

function clean(value: string | undefined | null): string {
  return (value ?? '').replace(/\s+/g, ' ').trim()
}

function includesWord(haystack: string, needle: string): boolean {
  if (!needle) {
    return true
  }
  return haystack.toLowerCase().includes(needle.toLowerCase())
}

export function formatPlaceLocation(input: Pick<PlaceSeoInput, 'city' | 'country'>): string {
  return [clean(input.city), clean(input.country)].filter(Boolean).join(', ')
}

/** e.g. "KiteCabana, Cumbuco | Nessa" — city skipped if already in the name. */
export function buildPlaceSeoTitle(input: PlaceSeoInput): string {
  const name = clean(input.name)
  const city = clean(input.city)
  if (!name) {
    return buildPlacePageTitle()
  }
  if (city && !includesWord(name, city)) {
    return `${name}, ${city} | ${PLACE_SHARE_BRAND}`
  }
  return buildPlacePageTitle(name)
}

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`
}

export function buildPlaceSeoDescription(input: PlaceSeoInput): string {
  const name = clean(input.name) || 'This place'
  const location = formatPlaceLocation(input)
  const type = clean(input.placeType)
  const what =
    type && type.toLowerCase() !== 'place' && !includesWord(name, type)
      ? `${name} (${type.toLowerCase()})`
      : name
  const where = location ? ` in ${location}` : ''
  const recs = Math.max(0, Math.floor(input.recommenderCount ?? 0))
  const stories = Math.max(0, Math.floor(input.storyCount ?? 0))
  const proof: string[] = []
  if (recs > 0) {
    proof.push(plural(recs, 'traveler recommendation', 'traveler recommendations'))
  }
  if (stories > 0) {
    proof.push(plural(stories, 'story', 'stories'))
  }
  const body = proof.length
    ? `See ${proof.join(' and ')} on ${PLACE_SHARE_BRAND}.`
    : `See what travelers say on ${PLACE_SHARE_BRAND} and recommend it.`
  const full = `${what}${where}. ${body}`
  if (full.length <= DESCRIPTION_MAX) {
    return full
  }
  return `${full.slice(0, DESCRIPTION_MAX - 1).trimEnd()}…`
}

/**
 * Index Places with Nessa-native content (≥1 recommendation or story) OR a
 * verified business. Same rule as functions/src/places/shared/placeSlug.ts
 * → sitemap.
 */
export function isPlaceIndexable(
  input: Pick<PlaceSeoInput, 'recommenderCount' | 'storyCount' | 'business'>,
): boolean {
  if (input.business?.name) {
    return true
  }
  return (input.recommenderCount ?? 0) + (input.storyCount ?? 0) > 0
}

const SCHEMA_TYPES: Record<string, string> = {
  restaurant: 'Restaurant',
  'café': 'CafeOrCoffeeShop',
  cafe: 'CafeOrCoffeeShop',
  hotel: 'Hotel',
  beach: 'Beach',
  tour: 'TouristAttraction',
  attraction: 'TouristAttraction',
}

export function schemaTypeForPlaceType(placeType?: string): string {
  return SCHEMA_TYPES[clean(placeType).toLowerCase()] ?? 'Place'
}

/** schema.org JSON-LD object for the Place page. */
export function buildPlaceJsonLd(
  input: PlaceSeoInput,
  canonicalUrl: string,
): Record<string, unknown> {
  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': schemaTypeForPlaceType(input.placeType),
    name: clean(input.name) || 'Place',
    url: canonicalUrl,
    description: buildPlaceSeoDescription(input),
  }
  const city = clean(input.city)
  const country = clean(input.country)
  if (city || country) {
    jsonLd.address = {
      '@type': 'PostalAddress',
      ...(city ? { addressLocality: city } : {}),
      ...(country ? { addressCountry: country } : {}),
    }
  }
  if (input.coverImageUrl?.startsWith('https://')) {
    jsonLd.image = input.coverImageUrl
  }
  if (input.business) {
    if (input.business.phone) jsonLd.telephone = input.business.phone
    if (input.business.website) jsonLd.sameAs = [input.business.website]
    if (input.business.logoUrl?.startsWith('https://')) jsonLd.logo = input.business.logoUrl
    if (input.business.description) jsonLd.description = input.business.description
  }
  return jsonLd
}

/** Safe to inline in a <script type="application/ld+json"> tag. */
export function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029')
}
