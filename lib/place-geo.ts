/**
 * Destination hubs: indexable country and city pages built from the public
 * Place directory (no extra Firestore reads — the directory is already one
 * cached Cloud Function call shared with the home page, /places and the
 * sitemap).
 *
 * URLs: `/destinations/{country}` and `/destinations/{country}/{city}`,
 * lowercase ASCII words joined by hyphens (the Place slug style). They live
 * outside `/place*` on purpose: the Android app claims every `/place…` path
 * as an App Link, and `/places/{x}` is a Place slug.
 *
 * Only Places that are indexable themselves (a recommendation, a story or a
 * verified business — the Place page robots rule) count, and a hub needs at
 * least MIN_PLACES_PER_HUB of them, so no thin pages are generated.
 */

import { placeHref, type DirectoryPlace } from '@/lib/place-directory'
import { isValidPlaceSlug } from '@/lib/place-slug'

export const MIN_PLACES_PER_HUB = 3
export const DESTINATIONS_BASE_PATH = '/destinations'
const GEO_SLUG_MAX = 60

/** Letters NFD doesn't decompose into ASCII. */
const SPECIAL_LETTERS: Record<string, string> = {
  đ: 'd',
  ð: 'd',
  ß: 'ss',
  æ: 'ae',
  œ: 'oe',
  ø: 'o',
  ł: 'l',
  þ: 'th',
  ı: 'i',
}

/** "São Luís" → "sao-luis", "Ngũ Hành Sơn" → "ngu-hanh-son", "Đà Nẵng" → "da-nang". */
export function geoSlug(name: string): string {
  const folded = name
    .toLowerCase()
    .replace(/[đðßæœøłþı]/g, ch => SPECIAL_LETTERS[ch] ?? ch)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
  const slug = folded
    .replace(/['’`]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  if (slug.length <= GEO_SLUG_MAX) return slug
  return slug.slice(0, GEO_SLUG_MAX).replace(/-[^-]*$/, '') || slug.slice(0, GEO_SLUG_MAX)
}

export function isValidGeoSlug(value: string | null | undefined): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= GEO_SLUG_MAX && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)
}

export function countryHubPath(countrySlug: string): string {
  return `${DESTINATIONS_BASE_PATH}/${countrySlug}`
}

export function cityHubPath(countrySlug: string, citySlug: string): string {
  return `${DESTINATIONS_BASE_PATH}/${countrySlug}/${citySlug}`
}

/** Same rule as the Place page robots meta (lib/place-seo isPlaceIndexable). */
export function isDirectoryPlaceIndexable(place: Pick<DirectoryPlace, 'recommenderCount' | 'storyCount' | 'verified'>): boolean {
  return place.verified || place.recommenderCount + place.storyCount > 0
}

/** Hubs link to canonical Place URLs only. */
function isListable(place: DirectoryPlace): boolean {
  return isDirectoryPlaceIndexable(place) && isValidPlaceSlug(place.slug)
}

/** Most travellers' content first, then verified, then a photo, then name. */
export function rankHubPlaces(places: DirectoryPlace[]): DirectoryPlace[] {
  const score = (p: DirectoryPlace) => p.recommenderCount * 2 + p.storyCount + (p.verified ? 3 : 0)
  return [...places].sort(
    (a, b) =>
      score(b) - score(a) ||
      Number(Boolean(b.photoUrl)) - Number(Boolean(a.photoUrl)) ||
      a.name.localeCompare(b.name) ||
      a.placeId.localeCompare(b.placeId),
  )
}

export type CityHub = {
  countrySlug: string
  countryName: string
  citySlug: string
  cityName: string
  path: string
  places: DirectoryPlace[]
}

export type CountryHub = {
  slug: string
  name: string
  path: string
  places: DirectoryPlace[]
  /** Cities in this country with their own page. */
  cities: CityHub[]
}

export type PlaceHubs = {
  countries: CountryHub[]
  cities: CityHub[]
}

/** The spelling most Places use ("Bogotá" over "Bogota"); ties → first seen. */
function commonName(names: string[]): string {
  const counts = new Map<string, number>()
  for (const n of names) counts.set(n, (counts.get(n) ?? 0) + 1)
  let best = names[0] ?? ''
  for (const [name, count] of counts) if (count > (counts.get(best) ?? 0)) best = name
  return best
}

type Bucket = { names: string[]; places: DirectoryPlace[] }

function bucketPush(map: Map<string, Bucket>, key: string, name: string, place: DirectoryPlace) {
  const bucket = map.get(key)
  if (bucket) {
    bucket.names.push(name)
    bucket.places.push(place)
  } else {
    map.set(key, { names: [name], places: [place] })
  }
}

/**
 * Country and city hubs with at least `min` listable Places. Cities are keyed
 * by country + folded name, so "Cartagena" in Colombia and in Spain are
 * separate pages and "Bogota"/"Bogotá" are one.
 */
export function buildPlaceHubs(places: DirectoryPlace[], min = MIN_PLACES_PER_HUB): PlaceHubs {
  const byCountry = new Map<string, Bucket>()
  const byCity = new Map<string, Bucket & { countrySlug: string }>()
  for (const place of places) {
    if (!isListable(place)) continue
    const country = place.country?.trim() ?? ''
    const countrySlug = geoSlug(country)
    if (!countrySlug) continue
    bucketPush(byCountry, countrySlug, country, place)
    const city = place.city.trim()
    const citySlug = geoSlug(city)
    // A "city" that is just the country or a two-letter code isn't a town.
    if (!citySlug || citySlug === countrySlug || citySlug.replace(/-/g, '').length < 3) continue
    const key = `${countrySlug}/${citySlug}`
    const bucket = byCity.get(key)
    if (bucket) {
      bucket.names.push(city)
      bucket.places.push(place)
    } else {
      byCity.set(key, { names: [city], places: [place], countrySlug })
    }
  }

  const countryNames = new Map([...byCountry].map(([slug, b]) => [slug, commonName(b.names)]))
  const cities: CityHub[] = []
  for (const [key, bucket] of byCity) {
    if (bucket.places.length < min) continue
    const citySlug = key.slice(bucket.countrySlug.length + 1)
    cities.push({
      countrySlug: bucket.countrySlug,
      countryName: countryNames.get(bucket.countrySlug) ?? '',
      citySlug,
      cityName: commonName(bucket.names),
      path: cityHubPath(bucket.countrySlug, citySlug),
      places: rankHubPlaces(bucket.places),
    })
  }
  cities.sort((a, b) => b.places.length - a.places.length || a.cityName.localeCompare(b.cityName))

  const countries: CountryHub[] = []
  for (const [slug, bucket] of byCountry) {
    if (bucket.places.length < min) continue
    countries.push({
      slug,
      name: countryNames.get(slug) ?? '',
      path: countryHubPath(slug),
      places: rankHubPlaces(bucket.places),
      cities: cities.filter(c => c.countrySlug === slug),
    })
  }
  countries.sort((a, b) => b.places.length - a.places.length || a.name.localeCompare(b.name))
  return { countries, cities }
}

export function findCountryHub(hubs: PlaceHubs, countrySlug: string): CountryHub | null {
  return hubs.countries.find(c => c.slug === countrySlug) ?? null
}

export function findCityHub(hubs: PlaceHubs, countrySlug: string, citySlug: string): CityHub | null {
  return hubs.cities.find(c => c.countrySlug === countrySlug && c.citySlug === citySlug) ?? null
}

/** The hubs a Place belongs to (for breadcrumbs and "More in {city}"). */
export function hubsForPlace(
  hubs: PlaceHubs,
  place: { city?: string | null; country?: string | null },
): { country: CountryHub | null; city: CityHub | null } {
  const countrySlug = geoSlug(place.country ?? '')
  const citySlug = geoSlug(place.city ?? '')
  if (!countrySlug) return { country: null, city: null }
  return {
    country: findCountryHub(hubs, countrySlug),
    city: citySlug ? findCityHub(hubs, countrySlug, citySlug) : null,
  }
}

/**
 * Other Places in the same town as `placeId` (canonical, indexable ones),
 * best first. Works for any town, with or without a hub page.
 */
export function moreInCity(
  places: DirectoryPlace[],
  current: { placeId: string; city?: string | null; country?: string | null },
  limit = 6,
): DirectoryPlace[] {
  const countrySlug = geoSlug(current.country ?? '')
  const citySlug = geoSlug(current.city ?? '')
  if (!citySlug) return []
  const same = places.filter(
    p =>
      p.placeId !== current.placeId &&
      isListable(p) &&
      geoSlug(p.city) === citySlug &&
      (!countrySlug || geoSlug(p.country ?? '') === countrySlug),
  )
  return rankHubPlaces(same).slice(0, limit)
}

/* ───────────── Structured data ───────────── */

/** schema.org ItemList of a hub's Places (canonical URLs). */
export function buildHubItemListJsonLd(input: {
  name: string
  url: string
  places: DirectoryPlace[]
  origin: string
  max?: number
}): Record<string, unknown> {
  const listed = input.places.slice(0, input.max ?? 100)
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: input.name,
    url: input.url,
    numberOfItems: listed.length,
    itemListElement: listed.map((p, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `${input.origin}${placeHref(p)}`,
      name: p.name,
    })),
  }
}

/** Home → Places → {crumbs…}; the last crumb is the page itself. */
export function buildHubBreadcrumbJsonLd(origin: string, crumbs: { name: string; path: string }[]): Record<string, unknown> {
  const all = [{ name: 'Home', path: '/' }, { name: 'Places', path: '/places' }, ...crumbs]
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: all.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      item: `${origin}${c.path === '/' ? '/' : c.path}`,
    })),
  }
}

/** "12 places travellers recommend in São Luís, Brazil — …" (≤ 158 chars). */
export function buildHubDescription(input: { where: string; count: number; examples: string[] }): string {
  const lead = `${input.count} places travellers recommend in ${input.where}`
  const examples = input.examples.slice(0, 3)
  const withExamples = examples.length ? `${lead}, including ${examples.join(', ')}.` : `${lead}.`
  const full = `${withExamples} Read their notes and stories and join each place’s live chat on NessaChat.`
  if (full.length <= 158) return full
  if (withExamples.length <= 158) return withExamples
  return `${lead}.`
}
