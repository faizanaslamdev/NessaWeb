/**
 * Shared web UI / guest language preference for Place landing + Place Chat.
 * Reuses PLACE_CHAT_GUEST_LANGUAGE_KEY so EntryModal and chat stay aligned.
 */

import {
  APP_CHAT_LANGUAGES,
  DEFAULT_CHAT_LANGUAGE_CODE,
} from '@/lib/chat/languages'
import { PLACE_CHAT_GUEST_LANGUAGE_KEY } from '@/lib/place-chat/constants'

const APP_LANGUAGE_CODES = new Set(APP_CHAT_LANGUAGES.map(l => l.code))

/** Map any locale tag to a supported Nessa language code (else English). */
export function resolveAppLanguageCode(
  raw: string | null | undefined,
): string {
  if (!raw || typeof raw !== 'string') {
    return DEFAULT_CHAT_LANGUAGE_CODE
  }
  const normalized = raw.trim().toLowerCase().replace(/_/g, '-')
  if (!normalized) {
    return DEFAULT_CHAT_LANGUAGE_CODE
  }
  if (APP_LANGUAGE_CODES.has(normalized)) {
    return normalized
  }
  const primary = normalized.split('-')[0] ?? ''
  if (primary && APP_LANGUAGE_CODES.has(primary)) {
    return primary
  }
  return DEFAULT_CHAT_LANGUAGE_CODE
}

/** First supported language from a browser language list. */
export function detectBrowserAppLanguage(
  languages: readonly string[] | null | undefined = typeof navigator !==
  'undefined'
    ? navigator.languages?.length
      ? [...navigator.languages]
      : navigator.language
        ? [navigator.language]
        : []
    : [],
): string {
  for (const tag of languages ?? []) {
    const resolved = resolveAppLanguageCode(tag)
    const normalized = String(tag ?? '')
      .trim()
      .toLowerCase()
      .replace(/_/g, '-')
    if (!normalized) continue
    const primary = normalized.split('-')[0] ?? ''
    if (
      APP_LANGUAGE_CODES.has(normalized) ||
      (primary && APP_LANGUAGE_CODES.has(primary))
    ) {
      return resolved
    }
  }
  return DEFAULT_CHAT_LANGUAGE_CODE
}

export function readStoredWebUiLanguage(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(PLACE_CHAT_GUEST_LANGUAGE_KEY)
    if (!raw?.trim()) return null
    return resolveAppLanguageCode(raw)
  } catch {
    return null
  }
}

export function writeStoredWebUiLanguage(language: string): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(
      PLACE_CHAT_GUEST_LANGUAGE_KEY,
      resolveAppLanguageCode(language),
    )
  } catch {
    // ignore quota / private mode
  }
}

/**
 * Resolve UI language: stored guest preference → browser → English.
 * Call from client only.
 */
export function resolveInitialWebUiLanguage(args?: {
  stored?: string | null
  browserLanguages?: readonly string[] | null
}): string {
  const stored =
    args?.stored !== undefined ? args.stored : readStoredWebUiLanguage()
  if (stored) {
    return resolveAppLanguageCode(stored)
  }
  return detectBrowserAppLanguage(args?.browserLanguages)
}
