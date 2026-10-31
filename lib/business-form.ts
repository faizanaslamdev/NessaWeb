/**
 * Business details form model (dashboard → `updateBusinessProfile`). Pure:
 * converts the stored profile to editable drafts and back, with light
 * client-side checks. The backend validates everything again and its
 * messages are shown as-is.
 *
 * `updateBusinessProfile` replaces the editable set (omitted optionals are
 * cleared), so `buildBusinessProfilePayload` always sends every field: text
 * as '' when blank and lists as [] when empty, like before; object / enum
 * fields (`openingHours`, `socials`, `priceRange`) are omitted when empty,
 * which clears them. The call carries `profileSchema: 2`
 * (BUSINESS_PROFILE_SCHEMA in business.ts): only then does the backend
 * replace the extended fields, so older dashboard tabs can't wipe them.
 */

import {
  BUSINESS_PROFILE_LIMITS,
  SOCIAL_LABELS,
  SOCIAL_NETWORKS,
  WEEK_DAYS,
  WEEK_DAY_LONG,
  isAllDayInterval,
  isPriceRange,
  isValidClosesTime,
  isValidOpensTime,
  sanitizeOpeningHours,
  type BusinessCategory,
  type BusinessSocials,
  type OpeningHours,
  type OpeningInterval,
  type PriceRange,
  type SocialNetwork,
  type WeekDay,
} from '@/lib/business-profile'
import type { BusinessProfileInput } from '@/lib/business'

export type DayMode = 'closed' | 'open' | 'all-day'

export type DayDraft = {
  mode: DayMode
  /** Ranges while `mode === 'open'` (kept when toggling so nothing is lost). */
  intervals: OpeningInterval[]
}

export type WeekDraft = Record<WeekDay, DayDraft>

export const DEFAULT_INTERVAL: OpeningInterval = { opens: '09:00', closes: '18:00' }

export function weekDraftFromHours(hours: unknown): WeekDraft {
  const clean = sanitizeOpeningHours(hours) ?? {}
  const draft = {} as WeekDraft
  for (const day of WEEK_DAYS) {
    const intervals = clean[day] ?? []
    if (!intervals.length) {
      draft[day] = { mode: 'closed', intervals: [{ ...DEFAULT_INTERVAL }] }
    } else if (intervals.some(isAllDayInterval)) {
      draft[day] = { mode: 'all-day', intervals: [{ ...DEFAULT_INTERVAL }] }
    } else {
      draft[day] = { mode: 'open', intervals: intervals.map(i => ({ ...i })) }
    }
  }
  return draft
}

export function copyDayToAll(draft: WeekDraft, from: WeekDay): WeekDraft {
  const source = draft[from]
  const next = {} as WeekDraft
  for (const day of WEEK_DAYS) {
    next[day] = { mode: source.mode, intervals: source.intervals.map(i => ({ ...i })) }
  }
  return next
}

export function setAllDays(draft: WeekDraft, mode: DayMode): WeekDraft {
  const next = {} as WeekDraft
  for (const day of WEEK_DAYS) {
    next[day] = { mode, intervals: draft[day].intervals.map(i => ({ ...i })) }
  }
  return next
}

/**
 * Draft → stored hours. No open day → `hours: undefined` (timetable hidden).
 * Errors name the day so the owner can find it.
 */
export function hoursFromWeekDraft(draft: WeekDraft): { hours?: OpeningHours; error?: string } {
  const hours: OpeningHours = {}
  for (const day of WEEK_DAYS) {
    const { mode, intervals } = draft[day]
    if (mode === 'closed') {
      continue
    }
    if (mode === 'all-day') {
      hours[day] = [{ opens: '00:00', closes: '24:00' }]
      continue
    }
    const label = WEEK_DAY_LONG[day]
    if (!intervals.length) {
      return { error: `${label}: add opening hours or mark it closed.` }
    }
    if (intervals.length > BUSINESS_PROFILE_LIMITS.INTERVALS_PER_DAY_MAX) {
      return { error: `${label}: up to ${BUSINESS_PROFILE_LIMITS.INTERVALS_PER_DAY_MAX} time ranges per day.` }
    }
    for (const interval of intervals) {
      if (!isValidOpensTime(interval.opens) || !isValidClosesTime(interval.closes)) {
        return { error: `${label}: enter both an opening and a closing time.` }
      }
      if (interval.opens === interval.closes) {
        return { error: `${label}: opening and closing times are the same — use “24 hours” instead.` }
      }
    }
    hours[day] = [...intervals]
      .map(i => ({ opens: i.opens, closes: i.closes }))
      .sort((a, b) => a.opens.localeCompare(b.opens))
  }
  return Object.keys(hours).length ? { hours } : {}
}

export type SocialDraft = Record<SocialNetwork, string>

export function socialDraftFromProfile(socials: BusinessSocials | undefined): SocialDraft {
  const draft = {} as SocialDraft
  for (const network of SOCIAL_NETWORKS) {
    const value = socials?.[network]
    draft[network] = typeof value === 'string' ? value : ''
  }
  return draft
}

/** Networks where the backend turns `@handle` into a profile URL. */
const HANDLE_NETWORKS: readonly SocialNetwork[] = ['instagram', 'tiktok', 'x']

/** Light check; the backend normalizes and validates the domain. */
export function socialInputError(network: SocialNetwork, value: string): string | null {
  const text = value.trim()
  if (!text) {
    return null
  }
  if (text.startsWith('@')) {
    if (!HANDLE_NETWORKS.includes(network)) {
      return `${SOCIAL_LABELS[network]}: paste the full link to your page.`
    }
    return /^@[A-Za-z0-9._-]{1,50}$/.test(text) ? null : `${SOCIAL_LABELS[network]}: that handle doesn’t look right.`
  }
  if (/\s/.test(text)) {
    return `${SOCIAL_LABELS[network]}: enter a link or @handle.`
  }
  return null
}

const SIMPLE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export type BusinessDetailsDraft = {
  name: string
  category: BusinessCategory | ''
  description: string
  website: string
  phone: string
  whatsapp: string
  email: string
  address: string
  bookingUrl: string
  menuUrl: string
  /** Free-text hours note. */
  hours: string
  week: WeekDraft
  checkIn: string
  checkOut: string
  amenities: string
  languages: string
  paymentMethods: string
  priceRange: PriceRange | ''
  socials: SocialDraft
}

/** "a, b, c" → ['a','b','c'] (trimmed, deduped). */
export function splitList(raw: string): string[] {
  const out: string[] = []
  for (const part of raw.split(/[,\n]/)) {
    const item = part.trim()
    if (item && !out.includes(item)) {
      out.push(item)
    }
  }
  return out
}

export function draftFromProfile(profile: Partial<BusinessProfileInput>): BusinessDetailsDraft {
  return {
    name: profile.name ?? '',
    category: profile.category ?? '',
    description: profile.description ?? '',
    website: profile.website ?? '',
    phone: profile.phone ?? '',
    whatsapp: profile.whatsapp ?? '',
    email: profile.email ?? '',
    address: profile.address ?? '',
    bookingUrl: profile.bookingUrl ?? '',
    menuUrl: profile.menuUrl ?? '',
    hours: profile.hours ?? '',
    week: weekDraftFromHours(profile.openingHours),
    checkIn: profile.checkIn ?? '',
    checkOut: profile.checkOut ?? '',
    amenities: (profile.amenities ?? []).join(', '),
    languages: (profile.languages ?? []).join(', '),
    paymentMethods: (profile.paymentMethods ?? []).join(', '),
    priceRange: isPriceRange(profile.priceRange) ? profile.priceRange : '',
    socials: socialDraftFromProfile(profile.socials),
  }
}

/** Every editable field, ready for `updateBusinessProfile` — or the first error. */
export function buildBusinessProfilePayload(
  draft: BusinessDetailsDraft,
): { profile: BusinessProfileInput; error?: undefined } | { profile?: undefined; error: string } {
  const L = BUSINESS_PROFILE_LIMITS
  const email = draft.email.trim()
  if (email && !SIMPLE_EMAIL.test(email)) {
    return { error: 'Email doesn’t look like an email address.' }
  }
  const { hours: openingHours, error: hoursError } = hoursFromWeekDraft(draft.week)
  if (hoursError) {
    return { error: hoursError }
  }
  const socials: BusinessSocials = {}
  for (const network of SOCIAL_NETWORKS) {
    const value = draft.socials[network].trim()
    const error = socialInputError(network, value)
    if (error) {
      return { error }
    }
    if (value) {
      socials[network] = value
    }
  }
  const paymentMethods = splitList(draft.paymentMethods)
  if (paymentMethods.length > L.PAYMENT_METHODS_MAX) {
    return { error: `Payment methods: up to ${L.PAYMENT_METHODS_MAX}.` }
  }
  const longPayment = paymentMethods.find(p => p.length > L.PAYMENT_METHOD_MAX)
  if (longPayment) {
    return { error: `Payment methods: “${longPayment.slice(0, 20)}…” is too long (max ${L.PAYMENT_METHOD_MAX} characters).` }
  }
  const amenities = splitList(draft.amenities)
  if (amenities.length > L.AMENITIES_MAX) {
    return { error: `Amenities: up to ${L.AMENITIES_MAX}.` }
  }
  const languages = splitList(draft.languages).map(l => l.toLowerCase())
  if (languages.length > L.LANGUAGES_MAX) {
    return { error: `Languages: up to ${L.LANGUAGES_MAX}.` }
  }

  const profile: BusinessProfileInput = {
    name: draft.name.trim(),
    category: draft.category,
    description: draft.description.trim(),
    website: draft.website.trim(),
    phone: draft.phone.trim(),
    whatsapp: draft.whatsapp.trim(),
    email: email.toLowerCase(),
    address: draft.address.replace(/\s+/g, ' ').trim(),
    bookingUrl: draft.bookingUrl.trim(),
    menuUrl: draft.menuUrl.trim(),
    hours: draft.hours.trim(),
    checkIn: draft.checkIn.trim(),
    checkOut: draft.checkOut.trim(),
    amenities,
    languages,
    paymentMethods,
    ...(openingHours ? { openingHours } : {}),
    ...(Object.keys(socials).length ? { socials } : {}),
    ...(draft.priceRange ? { priceRange: draft.priceRange } : {}),
  }
  return { profile }
}
