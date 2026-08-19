import { APP_CHAT_LANGUAGES, DEFAULT_CHAT_LANGUAGE_CODE } from '@/lib/chat/languages'
import {
  PLACE_CHAT_GUEST_LANGUAGE_KEY,
  PLACE_CHAT_GUEST_NAME_KEY,
} from '@/lib/place-chat/constants'
import { normalizePlaceChatLanguage } from '@/lib/place-chat/translation'

export type PlaceChatGuestProfile = {
  displayName: string
  language: string
}

const KNOWN_LANGUAGE_CODES = new Set(
  APP_CHAT_LANGUAGES.map(language => language.code),
)

function normalizeGuestLanguage(language: string): string {
  const normalized = normalizePlaceChatLanguage(language)
  return KNOWN_LANGUAGE_CODES.has(normalized)
    ? normalized
    : DEFAULT_CHAT_LANGUAGE_CODE
}

export function readStoredGuestName(): string {
  if (typeof localStorage === 'undefined') return ''
  try {
    return localStorage.getItem(PLACE_CHAT_GUEST_NAME_KEY)?.trim() || ''
  } catch {
    return ''
  }
}

export function readStoredGuestLanguage(): string {
  if (typeof localStorage === 'undefined') return DEFAULT_CHAT_LANGUAGE_CODE
  try {
    return normalizeGuestLanguage(
      localStorage.getItem(PLACE_CHAT_GUEST_LANGUAGE_KEY) ||
        DEFAULT_CHAT_LANGUAGE_CODE,
    )
  } catch {
    return DEFAULT_CHAT_LANGUAGE_CODE
  }
}

/** Persist onboarding/profile edits to localStorage (same keys as initial setup). */
export function persistPlaceChatGuestProfile(
  name: string,
  language: string,
): PlaceChatGuestProfile | null {
  const displayName = name.trim()
  if (!displayName) {
    return null
  }
  const normalizedLanguage = normalizeGuestLanguage(
    language || DEFAULT_CHAT_LANGUAGE_CODE,
  )
  try {
    localStorage.setItem(PLACE_CHAT_GUEST_NAME_KEY, displayName)
    localStorage.setItem(PLACE_CHAT_GUEST_LANGUAGE_KEY, normalizedLanguage)
  } catch {
    // ignore quota / private mode
  }
  return { displayName, language: normalizedLanguage }
}
