/**
 * Sender “How others see it” rows — Instant + Place Chat.
 * One unique translation per language/text (not per recipient).
 */

export type HowOthersSeeRow = {
  key: string
  languageLabel?: string
  text: string
}

export function normalizeHowOthersSeeLanguage(
  value: string | null | undefined,
): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim().toLowerCase()
  if (trimmed.length < 2) return undefined
  return trimmed.slice(0, 12)
}

export type HowOthersSeeInput = {
  originalText: string
  viewerUserId?: string | null
  translation?: string
  translationLanguage?: string
  translationsByUser?: Record<string, string>
  translationsByLanguage?: Record<string, string>
  /** Instant: uid → member language, used to label deduped user rows. */
  recipientLanguages?: Record<string, string>
}

/**
 * Prefer language-keyed cache (Place), else dedupe per-user translations
 * (Instant / Place fallback), else legacy single `translation`.
 */
export function buildHowOthersSeeRows(
  input: HowOthersSeeInput,
): HowOthersSeeRow[] {
  const original = input.originalText.trim()
  const seen = new Set<string>()
  const rows: HowOthersSeeRow[] = []

  const push = (key: string, raw: string, language?: string) => {
    const text = String(raw || '').trim()
    if (!text || text === original) return
    const dedupe = text.toLowerCase()
    if (seen.has(dedupe)) return
    seen.add(dedupe)
    const code = normalizeHowOthersSeeLanguage(language)
    rows.push({
      key,
      text,
      languageLabel: code ? code.toUpperCase() : undefined,
    })
  }

  const byLang = input.translationsByLanguage
  if (byLang && typeof byLang === 'object' && !Array.isArray(byLang)) {
    for (const [lang, raw] of Object.entries(byLang)) {
      push(normalizeHowOthersSeeLanguage(lang) || lang, String(raw || ''), lang)
    }
  }
  if (rows.length > 0) return rows

  const byUser = input.translationsByUser
  if (byUser && typeof byUser === 'object' && !Array.isArray(byUser)) {
    for (const [uid, raw] of Object.entries(byUser)) {
      if (input.viewerUserId && uid === input.viewerUserId) continue
      push(uid, String(raw || ''), input.recipientLanguages?.[uid])
    }
  }
  if (rows.length > 0) return rows

  if (input.translation?.trim()) {
    push('legacy', input.translation, input.translationLanguage)
  }

  return rows
}
