/**
 * Verified business profile: shared types, limits and pure sanitizers for the
 * public projection (`getPublicPlaceLanding().business`) and the dashboard
 * form. No Firebase / Next imports, so it is safe on the server, the client
 * and in unit tests.
 *
 * The backend validates on write (`updateBusinessProfile`); everything here
 * re-validates on read so a malformed or hostile value never reaches HTML,
 * `href`s or JSON-LD.
 */

export const BUSINESS_CATEGORIES = [
  'hostel',
  'hotel',
  'restaurant',
  'bar',
  'cafe',
  'kite_school',
  'tour',
  'shop',
  'other',
] as const
export type BusinessCategory = (typeof BUSINESS_CATEGORIES)[number]

export const WEEK_DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const
export type WeekDay = (typeof WEEK_DAYS)[number]

export const WEEK_DAY_SHORT: Record<WeekDay, string> = {
  mon: 'Mon',
  tue: 'Tue',
  wed: 'Wed',
  thu: 'Thu',
  fri: 'Fri',
  sat: 'Sat',
  sun: 'Sun',
}

export const WEEK_DAY_LONG: Record<WeekDay, string> = {
  mon: 'Monday',
  tue: 'Tuesday',
  wed: 'Wednesday',
  thu: 'Thursday',
  fri: 'Friday',
  sat: 'Saturday',
  sun: 'Sunday',
}

/**
 * 24h `HH:MM`. `opens` 00:00–23:59; `closes` 00:00–23:59 or `24:00`.
 * `closes <= opens` means it closes after midnight (next day);
 * `00:00`–`24:00` means open all day.
 */
export type OpeningInterval = { opens: string; closes: string }

/**
 * Weekly hours. Present object: a missing day = closed. Absent object =
 * hours unknown.
 */
export type OpeningHours = Partial<Record<WeekDay, OpeningInterval[]>>

export const SOCIAL_NETWORKS = ['instagram', 'facebook', 'tiktok', 'youtube', 'x'] as const
export type SocialNetwork = (typeof SOCIAL_NETWORKS)[number]
export type BusinessSocials = Partial<Record<SocialNetwork, string>>

export const SOCIAL_LABELS: Record<SocialNetwork, string> = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  tiktok: 'TikTok',
  youtube: 'YouTube',
  x: 'X',
}

/** Hostnames each network's links may use (subdomains allowed). */
const SOCIAL_DOMAINS: Record<SocialNetwork, readonly string[]> = {
  instagram: ['instagram.com', 'instagr.am'],
  facebook: ['facebook.com', 'fb.com', 'fb.me'],
  tiktok: ['tiktok.com'],
  youtube: ['youtube.com', 'youtu.be'],
  x: ['x.com', 'twitter.com'],
}

export const PRICE_RANGES = ['$', '$$', '$$$', '$$$$'] as const
export type PriceRange = (typeof PRICE_RANGES)[number]

export const BUSINESS_PROFILE_LIMITS = {
  NAME_MAX: 80,
  DESCRIPTION_MAX: 600,
  HOURS_NOTE_MAX: 200,
  CHECK_TIME_MAX: 20,
  URL_MAX: 300,
  PHONE_MAX: 32,
  AMENITIES_MAX: 20,
  AMENITY_MAX: 40,
  LANGUAGES_MAX: 10,
  ADDRESS_MAX: 200,
  EMAIL_MAX: 120,
  PAYMENT_METHODS_MAX: 10,
  PAYMENT_METHOD_MAX: 30,
  INTERVALS_PER_DAY_MAX: 3,
} as const

export type PublicBusinessProfile = {
  businessId: string
  verified: true
  name: string
  category?: BusinessCategory
  description?: string
  website?: string
  phone?: string
  whatsapp?: string
  /** Free-text hours note ("Kitchen closes at 21:00"). */
  hours?: string
  checkIn?: string
  checkOut?: string
  amenities?: string[]
  languages?: string[]
  logoUrl?: string
  coverUrl?: string
  openingHours?: OpeningHours
  address?: string
  email?: string
  bookingUrl?: string
  menuUrl?: string
  socials?: BusinessSocials
  priceRange?: PriceRange
  paymentMethods?: string[]
}

/** The profile without its identity fields (share / SEO metadata). */
export type PublicBusinessFields = Omit<PublicBusinessProfile, 'businessId' | 'verified'>

/* ───────────── Primitive sanitizers ───────────── */

const CONTROL_CHARS = /[\u0000-\u001F\u007F\u2028\u2029]/g
const CONTROL_CHARS_KEEP_NEWLINE = /[\u0000-\u0009\u000B-\u001F\u007F\u2028\u2029]/g

function truncate(value: string, max: number): string {
  return value.length <= max ? value : `${value.slice(0, max - 1).trimEnd()}…`
}

/** Single line of text (whitespace collapsed), or undefined. */
export function cleanLine(value: unknown, max: number): string | undefined {
  if (typeof value !== 'string') {
    return undefined
  }
  const cleaned = value.replace(CONTROL_CHARS, ' ').replace(/\s+/g, ' ').trim()
  return cleaned ? truncate(cleaned, max) : undefined
}

/** Text that keeps line breaks (descriptions, hours note). */
export function cleanMultiline(value: unknown, max: number): string | undefined {
  if (typeof value !== 'string') {
    return undefined
  }
  const cleaned = value
    .replace(/\r\n?/g, '\n')
    .replace(CONTROL_CHARS_KEEP_NEWLINE, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  return cleaned ? truncate(cleaned, max) : undefined
}

function cleanList(value: unknown, maxItems: number, maxItem: number): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined
  }
  const out: string[] = []
  for (const item of value) {
    const cleaned = cleanLine(item, maxItem)
    if (cleaned && !out.includes(cleaned)) {
      out.push(cleaned)
    }
    if (out.length >= maxItems) {
      break
    }
  }
  return out.length ? out : undefined
}

/**
 * Absolute web URL safe for an `href` / JSON-LD: https only (http too when
 * `allowHttp`), no credentials, a dotted hostname. Anything else
 * (`javascript:`, `data:`, relative paths, junk) → undefined.
 */
export function safeWebUrl(
  value: unknown,
  opts: { allowHttp?: boolean; max?: number } = {},
): string | undefined {
  if (typeof value !== 'string') {
    return undefined
  }
  const trimmed = value.trim()
  const max = opts.max ?? 2048
  if (!trimmed || trimmed.length > max || /[\s<>"'`\\]/.test(trimmed)) {
    return undefined
  }
  const scheme = opts.allowHttp ? /^https?:\/\//i : /^https:\/\//i
  if (!scheme.test(trimmed)) {
    return undefined
  }
  let url: URL
  try {
    url = new URL(trimmed)
  } catch {
    return undefined
  }
  if (url.protocol !== 'https:' && !(opts.allowHttp && url.protocol === 'http:')) {
    return undefined
  }
  if (url.username || url.password) {
    return undefined
  }
  if (!url.hostname.includes('.') || url.hostname.endsWith('.')) {
    return undefined
  }
  return url.toString()
}

function hostMatches(hostname: string, domains: readonly string[]): boolean {
  const host = hostname.toLowerCase()
  return domains.some(d => host === d || host.endsWith(`.${d}`))
}

/** A full https link on the network's own domain, or undefined. */
export function safeSocialUrl(network: SocialNetwork, value: unknown): string | undefined {
  const url = safeWebUrl(value, { max: BUSINESS_PROFILE_LIMITS.URL_MAX })
  if (!url) {
    return undefined
  }
  return hostMatches(new URL(url).hostname, SOCIAL_DOMAINS[network]) ? url : undefined
}

const EMAIL_PATTERN = /^[^\s@<>()[\]\\,;:"']+@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)*\.[a-z]{2,}$/i

export function cleanEmail(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined
  }
  const email = value.trim().toLowerCase()
  if (!email || email.length > BUSINESS_PROFILE_LIMITS.EMAIL_MAX || !EMAIL_PATTERN.test(email)) {
    return undefined
  }
  return email
}

export function cleanPhone(value: unknown): string | undefined {
  const text = cleanLine(value, BUSINESS_PROFILE_LIMITS.PHONE_MAX)
  if (!text || text.replace(/\D/g, '').length < 6) {
    return undefined
  }
  return text
}

const LANGUAGE_CODE = /^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/

function cleanLanguages(value: unknown): string[] | undefined {
  const list = cleanList(value, BUSINESS_PROFILE_LIMITS.LANGUAGES_MAX, 12)
  const out = (list ?? []).map(l => l.toLowerCase()).filter(l => LANGUAGE_CODE.test(l))
  return out.length ? Array.from(new Set(out)) : undefined
}

export function isBusinessCategory(value: unknown): value is BusinessCategory {
  return typeof value === 'string' && (BUSINESS_CATEGORIES as readonly string[]).includes(value)
}

export function isPriceRange(value: unknown): value is PriceRange {
  return typeof value === 'string' && (PRICE_RANGES as readonly string[]).includes(value)
}

/* ───────────── Opening hours ───────────── */

const OPENS_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/

export function isValidOpensTime(value: unknown): value is string {
  return typeof value === 'string' && OPENS_PATTERN.test(value)
}

export function isValidClosesTime(value: unknown): value is string {
  return typeof value === 'string' && (OPENS_PATTERN.test(value) || value === '24:00')
}

/** `HH:MM` → minutes since midnight (`24:00` → 1440). */
export function timeToMinutes(value: string): number {
  const [h, m] = value.split(':').map(Number)
  return h * 60 + m
}

/** `00:00`–`24:00` (or `00:00`–`00:00`, i.e. closing at the next midnight). */
export function isAllDayInterval(interval: OpeningInterval): boolean {
  return interval.opens === '00:00' && (interval.closes === '24:00' || interval.closes === '00:00')
}

/** Closes on the next calendar day (`22:00`–`02:00`). `24:00` doesn't count. */
export function closesAfterMidnight(interval: OpeningInterval): boolean {
  return interval.closes !== '24:00' && timeToMinutes(interval.closes) <= timeToMinutes(interval.opens)
}

function sanitizeIntervals(value: unknown): OpeningInterval[] {
  if (!Array.isArray(value)) {
    return []
  }
  const out: OpeningInterval[] = []
  for (const item of value) {
    if (!item || typeof item !== 'object') {
      continue
    }
    const { opens, closes } = item as Record<string, unknown>
    if (!isValidOpensTime(opens) || !isValidClosesTime(closes)) {
      continue
    }
    if (out.some(i => i.opens === opens && i.closes === closes)) {
      continue
    }
    out.push({ opens, closes })
  }
  out.sort((a, b) => timeToMinutes(a.opens) - timeToMinutes(b.opens))
  return out.slice(0, BUSINESS_PROFILE_LIMITS.INTERVALS_PER_DAY_MAX)
}

/**
 * Valid days only; days with no valid interval are dropped (= closed).
 * Not an object, or nothing valid at all → undefined (hours unknown): an
 * empty or garbage timetable must never claim "closed all week".
 */
export function sanitizeOpeningHours(value: unknown): OpeningHours | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined
  }
  const raw = value as Record<string, unknown>
  const out: OpeningHours = {}
  for (const day of WEEK_DAYS) {
    const intervals = sanitizeIntervals(raw[day])
    if (intervals.length) {
      out[day] = intervals
    }
  }
  return Object.keys(out).length ? out : undefined
}

export type OpeningHoursGroup = {
  /** Consecutive days (Mon→Sun order) sharing the same hours. */
  days: WeekDay[]
  /** Empty = closed. */
  intervals: OpeningInterval[]
  allDay: boolean
}

function intervalsKey(intervals: OpeningInterval[]): string {
  if (!intervals.length) {
    return 'closed'
  }
  if (intervals.some(isAllDayInterval)) {
    return 'all-day'
  }
  return intervals.map(i => `${i.opens}-${i.closes}`).join(',')
}

/** Collapse consecutive identical days: Mon–Fri 08:00–22:00, Sat, Sun closed. */
export function groupOpeningHours(hours: OpeningHours): OpeningHoursGroup[] {
  const groups: OpeningHoursGroup[] = []
  const keys: string[] = []
  for (const day of WEEK_DAYS) {
    const intervals = hours[day] ?? []
    const key = intervalsKey(intervals)
    if (groups.length && keys[keys.length - 1] === key) {
      groups[groups.length - 1].days.push(day)
      continue
    }
    const allDay = key === 'all-day'
    keys.push(key)
    groups.push({
      days: [day],
      allDay,
      intervals: allDay ? [{ opens: '00:00', closes: '24:00' }] : intervals,
    })
  }
  return groups
}

/** "Mon", "Sat–Sun", "Mon–Fri". */
export function formatDayRange(days: WeekDay[]): string {
  if (!days.length) {
    return ''
  }
  const first = WEEK_DAY_SHORT[days[0]]
  if (days.length === 1) {
    return first
  }
  return `${first}–${WEEK_DAY_SHORT[days[days.length - 1]]}`
}

/** "08:00–22:00", "22:00–02:00 (next day)"; all day → "Open 24 hours". */
export function formatInterval(interval: OpeningInterval): string {
  if (isAllDayInterval(interval)) {
    return 'Open 24 hours'
  }
  const closes = interval.closes === '24:00' ? '24:00' : interval.closes
  return `${interval.opens}–${closes}`
}

/** JS `Date#getDay()` (0 = Sunday) → WeekDay. */
export function weekDayFromJsDay(jsDay: number): WeekDay {
  return WEEK_DAYS[(jsDay + 6) % 7]
}

/* ───────────── Whole profile ───────────── */

function cleanSocials(value: unknown): BusinessSocials | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined
  }
  const raw = value as Record<string, unknown>
  const out: BusinessSocials = {}
  for (const network of SOCIAL_NETWORKS) {
    const url = safeSocialUrl(network, raw[network])
    if (url) {
      out[network] = url
    }
  }
  return Object.keys(out).length ? out : undefined
}

/** https image URL that can't carry an API key. */
function safeImageUrl(value: unknown): string | undefined {
  const url = safeWebUrl(value)
  if (!url || /[?&]key=/i.test(url)) {
    return undefined
  }
  return url
}

/**
 * Validates a public business projection from the backend. Returns undefined
 * unless it is a verified business with a name; every optional field is
 * type-checked, bounded and dropped when malformed.
 */
export function sanitizePublicBusiness(raw: unknown): PublicBusinessProfile | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return undefined
  }
  const data = raw as Record<string, unknown>
  const name = cleanLine(data.name, BUSINESS_PROFILE_LIMITS.NAME_MAX)
  const businessId = cleanLine(data.businessId, 128)
  if (data.verified !== true || !name || !businessId) {
    return undefined
  }
  const L = BUSINESS_PROFILE_LIMITS
  const out: PublicBusinessProfile = { businessId, verified: true, name }
  const set = <K extends keyof PublicBusinessProfile>(key: K, value: PublicBusinessProfile[K] | undefined) => {
    if (value !== undefined) {
      out[key] = value
    }
  }
  set('category', isBusinessCategory(data.category) ? data.category : undefined)
  set('description', cleanMultiline(data.description, L.DESCRIPTION_MAX))
  // Websites saved before https-only stay usable (backend accepted http).
  set('website', safeWebUrl(data.website, { allowHttp: true, max: L.URL_MAX }))
  set('phone', cleanPhone(data.phone))
  set('whatsapp', cleanPhone(data.whatsapp))
  set('hours', cleanMultiline(data.hours, L.HOURS_NOTE_MAX))
  set('checkIn', cleanLine(data.checkIn, L.CHECK_TIME_MAX))
  set('checkOut', cleanLine(data.checkOut, L.CHECK_TIME_MAX))
  set('amenities', cleanList(data.amenities, L.AMENITIES_MAX, L.AMENITY_MAX))
  set('languages', cleanLanguages(data.languages))
  set('logoUrl', safeImageUrl(data.logoUrl))
  set('coverUrl', safeImageUrl(data.coverUrl))
  set('openingHours', sanitizeOpeningHours(data.openingHours))
  set('address', cleanLine(data.address, L.ADDRESS_MAX))
  set('email', cleanEmail(data.email))
  set('bookingUrl', safeWebUrl(data.bookingUrl, { max: L.URL_MAX }))
  set('menuUrl', safeWebUrl(data.menuUrl, { max: L.URL_MAX }))
  set('socials', cleanSocials(data.socials))
  set('priceRange', isPriceRange(data.priceRange) ? data.priceRange : undefined)
  set('paymentMethods', cleanList(data.paymentMethods, L.PAYMENT_METHODS_MAX, L.PAYMENT_METHOD_MAX))
  return out
}
