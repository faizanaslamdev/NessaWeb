/**
 * Resolve viewer-specific Place Chat translation for display.
 * Prefers translationsByUser[viewer], then translationsByLanguage[lang],
 * then legacy translation when translationLanguage matches.
 * Never mutates canonical message text.
 */

export const PLACE_CHAT_BACKFILL_MAX_MESSAGES = 20

export type PlaceChatTranslationFields = {
  text: string
  translation?: string
  translationLanguage?: string
  translationStatus?: 'pending' | 'completed' | 'failed'
  sourceLanguage?: string
  translationsByUser?: Record<string, string>
  translationsByLanguage?: Record<string, string>
}

export function normalizePlaceChatLanguage(
  value: string | null | undefined,
): string {
  if (typeof value !== 'string') return 'en'
  const trimmed = value.trim().toLowerCase()
  if (trimmed.length < 2) return 'en'
  return trimmed.slice(0, 12)
}

export function resolvePlaceChatViewerTranslation(
  msg: PlaceChatTranslationFields,
  viewerUserId: string | null | undefined,
  preferredLanguage: string,
): string | undefined {
  const preferred = normalizePlaceChatLanguage(preferredLanguage)
  if (viewerUserId && msg.translationsByUser?.[viewerUserId]?.trim()) {
    return msg.translationsByUser[viewerUserId].trim()
  }
  const byLang = msg.translationsByLanguage?.[preferred]?.trim()
  if (byLang) return byLang
  if (
    msg.translation?.trim() &&
    normalizePlaceChatLanguage(msg.translationLanguage) === preferred
  ) {
    return msg.translation.trim()
  }
  return undefined
}

/**
 * Merge language-keyed cache into translationsByUser for MessageBubble group path
 * so late joiners with a matching language still see their translation.
 */
export function placeChatTranslationsByUserForBubble(
  msg: PlaceChatTranslationFields,
  viewerUserId: string,
  preferredLanguage: string,
): Record<string, string> | undefined {
  const base =
    msg.translationsByUser && typeof msg.translationsByUser === 'object'
      ? { ...msg.translationsByUser }
      : {}
  const resolved = resolvePlaceChatViewerTranslation(
    msg,
    viewerUserId,
    preferredLanguage,
  )
  if (resolved && !base[viewerUserId]) {
    base[viewerUserId] = resolved
  }
  return Object.keys(base).length > 0 ? base : undefined
}

export type PlaceChatBackfillCandidate = {
  id: string
  text?: string
  sourceLanguage?: string
  translationsByLanguage?: Record<string, string>
  translationStatus?: string
}

/** From already-loaded history, ids missing target language in the cache. */
export function selectPlaceChatMessagesNeedingBackfill(
  messages: PlaceChatBackfillCandidate[],
  targetLanguage: string,
  maxIds: number = PLACE_CHAT_BACKFILL_MAX_MESSAGES,
): string[] {
  const lang = normalizePlaceChatLanguage(targetLanguage)
  const out: string[] = []
  for (const m of messages) {
    if (out.length >= maxIds) break
    if (!m?.id || typeof m.text !== 'string' || !m.text.trim()) continue
    if (m.translationStatus === 'pending') continue
    if (
      m.sourceLanguage &&
      normalizePlaceChatLanguage(m.sourceLanguage) === lang
    ) {
      continue
    }
    const cached = m.translationsByLanguage?.[lang]
    if (typeof cached === 'string' && cached.trim()) continue
    out.push(m.id)
  }
  return out
}
