/**
 * SEO helpers for public Place pages (`/places/{slug}`): unique titles and
 * descriptions from the Place's name/location, the indexability rule, and
 * schema.org JSON-LD.
 */

import {
  WEEK_DAY_LONG,
  closesAfterMidnight,
  groupOpeningHours,
  type OpeningHours,
  type PublicBusinessFields,
} from '@/lib/business-profile'
import { PLACE_SHARE_BRAND, buildPlacePageTitle } from '@/lib/place-title'

/** Verified business fields used for SEO (already sanitized). */
export type PlaceSeoBusiness = PublicBusinessFields

export type PlaceSeoInput = {
  name: string
  placeType?: string
  city?: string
  country?: string
  recommenderCount?: number
  storyCount?: number
  coverImageUrl?: string
  /** `google` covers are Google data: never in JSON-LD. */
  coverSource?: 'nessa' | 'google'
  /** Verified business (official layer), if the Place is claimed. */
  business?: PlaceSeoBusiness | null
}

const DESCRIPTION_MAX = 158
/** Business-written meta descriptions (Google shows ~155 characters). */
const BUSINESS_DESCRIPTION_MAX = 155

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

/** Cut at a word boundary to ≤ max characters (ellipsis included). */
function trimToWord(text: string, max: number): string {
  if (text.length <= max) {
    return text
  }
  const slice = text.slice(0, max - 1)
  const space = slice.lastIndexOf(' ')
  const cut = space >= max * 0.6 ? slice.slice(0, space) : slice
  return `${cut.replace(/[\s,.;:–—-]+$/, '')}…`
}

/**
 * Meta description from the business's own description, made to mention the
 * city: "KiteCabana in Cumbuco, Brazil. Beachfront pousada with…".
 */
export function buildBusinessSeoDescription(input: PlaceSeoInput): string | null {
  const description = clean(input.business?.description)
  if (!description) {
    return null
  }
  const city = clean(input.city)
  const location = formatPlaceLocation(input)
  const name = clean(input.name) || clean(input.business?.name)
  let text = description
  if (location && !(city ? includesWord(description, city) : includesWord(description, location))) {
    text = `${name ? `${name} in ` : 'In '}${location}. ${description}`
  }
  return trimToWord(text, BUSINESS_DESCRIPTION_MAX)
}

export function buildPlaceSeoDescription(input: PlaceSeoInput): string {
  const fromBusiness = buildBusinessSeoDescription(input)
  if (fromBusiness) {
    return fromBusiness
  }
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

/** robots for a Place page: the indexability rule; no data → noindex. */
export function placeRobots(
  share: Pick<PlaceSeoInput, 'recommenderCount' | 'storyCount' | 'business'> | null | undefined,
): { index: boolean; follow: boolean } {
  if (!share) {
    return { index: false, follow: true }
  }
  return { index: isPlaceIndexable(share), follow: true }
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

/**
 * schema.org type for a verified business by its category. All are
 * LocalBusiness subtypes, so telephone / priceRange / openingHours apply.
 * `tour` → TravelAgency: the business sells tours and activities (an
 * operator), while TouristAttraction is a Place, not a business.
 */
const BUSINESS_SCHEMA_TYPES: Record<string, string> = {
  hostel: 'Hostel',
  hotel: 'Hotel',
  restaurant: 'Restaurant',
  bar: 'BarOrPub',
  cafe: 'CafeOrCoffeeShop',
  kite_school: 'SportsActivityLocation',
  tour: 'TravelAgency',
  shop: 'Store',
  other: 'LocalBusiness',
}

export function schemaTypeForBusinessCategory(category?: string): string {
  return BUSINESS_SCHEMA_TYPES[clean(category)] ?? 'LocalBusiness'
}

const LODGING_TYPES = new Set(['Hostel', 'Hotel'])
const FOOD_TYPES = new Set(['Restaurant', 'BarOrPub', 'CafeOrCoffeeShop'])

/**
 * schema.org `openingHoursSpecification`: one entry per group of
 * consecutive days with the same hours (and per interval). Closed days are
 * omitted. Open all day → 00:00–23:59; `24:00` → 23:59; closing after
 * midnight keeps the earlier `closes` on the opening day's entry (Google's
 * documented form, e.g. Saturday 18:00–03:00).
 */
export function buildOpeningHoursSpecification(
  hours: OpeningHours | undefined,
): Record<string, unknown>[] {
  if (!hours) {
    return []
  }
  const out: Record<string, unknown>[] = []
  for (const group of groupOpeningHours(hours)) {
    const dayOfWeek = group.days.map(d => WEEK_DAY_LONG[d])
    for (const interval of group.intervals) {
      let { opens, closes } = interval
      if (group.allDay) {
        opens = '00:00'
        closes = '23:59'
      } else if (closes === '24:00') {
        closes = '23:59'
      } else if (closesAfterMidnight(interval) && closes === '00:00') {
        // Closing exactly at midnight is the end of the same day.
        closes = '23:59'
      }
      out.push({ '@type': 'OpeningHoursSpecification', dayOfWeek, opens, closes })
    }
  }
  return out
}

/** "14:00", "2:00", "14h", "14h30" → "14:00" / "14:30"; free text → null. */
export function parseCheckTime(value: string | undefined): string | null {
  const m = clean(value).toLowerCase().match(/^([01]?\d|2[0-3])(?:[:h.]([0-5]\d))?h?$/)
  if (!m) {
    return null
  }
  return `${m[1].padStart(2, '0')}:${m[2] ?? '00'}`
}

function uniq(values: (string | undefined)[]): string[] {
  return Array.from(new Set(values.filter((v): v is string => Boolean(v))))
}

/** schema.org JSON-LD object for the Place page. */
export function buildPlaceJsonLd(
  input: PlaceSeoInput,
  canonicalUrl: string,
): Record<string, unknown> {
  const business = input.business ?? null
  const type = business
    ? schemaTypeForBusinessCategory(business.category)
    : schemaTypeForPlaceType(input.placeType)
  const name = clean(input.name) || clean(business?.name) || 'Place'
  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': type,
    name,
    url: canonicalUrl,
    description: clean(business?.description) || buildPlaceSeoDescription(input),
  }
  const city = clean(input.city)
  const country = clean(input.country)
  // Business-entered street address only (never Google's formatted address).
  const street = clean(business?.address)
  if (street || city || country) {
    jsonLd.address = {
      '@type': 'PostalAddress',
      ...(street ? { streetAddress: street } : {}),
      ...(city ? { addressLocality: city } : {}),
      ...(country ? { addressCountry: country } : {}),
    }
  }
  // Never Google's photos: only NessaChat / business images.
  const cover =
    input.coverSource !== 'google' && input.coverImageUrl?.startsWith('https://')
      ? input.coverImageUrl
      : undefined
  const images = uniq([
    business?.coverUrl?.startsWith('https://') ? business.coverUrl : undefined,
    cover,
  ])
  if (images.length) {
    jsonLd.image = images.length === 1 ? images[0] : images
  }
  if (!business) {
    return jsonLd
  }

  const businessName = clean(business.name)
  if (businessName && businessName.toLowerCase() !== name.toLowerCase()) {
    jsonLd.alternateName = businessName
  }
  if (business.phone) jsonLd.telephone = business.phone
  if (business.email) jsonLd.email = business.email
  const sameAs = uniq([business.website, ...Object.values(business.socials ?? {})])
  if (sameAs.length) jsonLd.sameAs = sameAs
  if (business.logoUrl?.startsWith('https://')) jsonLd.logo = business.logoUrl
  if (business.priceRange) jsonLd.priceRange = business.priceRange
  if (business.paymentMethods?.length) jsonLd.paymentAccepted = business.paymentMethods.join(', ')
  const hoursSpec = buildOpeningHoursSpecification(business.openingHours)
  if (hoursSpec.length) jsonLd.openingHoursSpecification = hoursSpec
  if (business.amenities?.length) {
    jsonLd.amenityFeature = business.amenities.map(a => ({
      '@type': 'LocationFeatureSpecification',
      name: a,
      value: true,
    }))
  }
  if (business.languages?.length) jsonLd.knowsLanguage = business.languages
  if (LODGING_TYPES.has(type)) {
    const checkin = parseCheckTime(business.checkIn)
    const checkout = parseCheckTime(business.checkOut)
    if (checkin) jsonLd.checkinTime = checkin
    if (checkout) jsonLd.checkoutTime = checkout
  }
  if (FOOD_TYPES.has(type) && business.menuUrl) {
    jsonLd.hasMenu = business.menuUrl
  }
  if (business.bookingUrl) {
    jsonLd.potentialAction = {
      '@type': 'ReserveAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: business.bookingUrl,
        actionPlatform: [
          'https://schema.org/DesktopWebPlatform',
          'https://schema.org/MobileWebPlatform',
        ],
      },
    }
  }
  return jsonLd
}

/** Home → Places → this Place, for the canonical `/places/{slug}` page. */
export function buildPlaceBreadcrumbJsonLd(
  input: { name: string },
  canonicalUrl: string,
): Record<string, unknown> {
  const origin = new URL(canonicalUrl).origin
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${origin}/` },
      { '@type': 'ListItem', position: 2, name: 'Places', item: `${origin}/places` },
      { '@type': 'ListItem', position: 3, name: clean(input.name) || 'Place', item: canonicalUrl },
    ],
  }
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
