'use client'

import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'

import { buildHowOthersSeeRows } from '@/lib/chat/how-others-see'

export type TranslationStatus = 'pending' | 'completed' | 'failed'

export interface MessageBubbleTranslationProps {
  translation?: string
  translationStatus?: TranslationStatus
  translationLanguage?: string
  sourceLanguage?: string
  translationsByUser?: Record<string, string>
  translationsByLanguage?: Record<string, string>
  recipientLanguages?: Record<string, string>
}

interface MessageBubbleProps extends MessageBubbleTranslationProps {
  message: string
  isSent: boolean
  senderName: string
  timestamp?: string
  avatar?: string
  /** Current viewer id — used with translationsByUser in group-style previews */
  viewerUserId?: string
  /** From join modal; drives when incoming translation is shown (1:1 language match) */
  preferredLanguage?: string
  isGroupChat?: boolean
  /** Short label shown next to the sender's name (e.g. official business staff). */
  senderBadge?: string
}

function LanguagesIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden
    >
      <path
        d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      <path
        d="M3 12h18M12 3c2.6 3.6 2.6 14.4 0 18M12 3c-2.6 3.6-2.6 14.4 0 18"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  )
}

function ChevronIcon({ up, className }: { up: boolean; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden
    >
      <path
        d={up ? 'M6 15l6-6 6 6' : 'M6 9l6 6 6-6'}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** Violet pill for verified business / staff messages (server-set only). */
function SenderBadge({ label }: { label: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border border-n-accent-line bg-n-accent-soft px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide text-n-accent-strong"
      title="Verified business"
    >
      <svg viewBox="0 0 24 24" fill="none" className="size-2.5" aria-hidden>
        <path d="m5 12 5 5L20 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {label}
    </span>
  )
}

export default function MessageBubble({
  message,
  isSent,
  senderName,
  timestamp,
  avatar,
  senderBadge,
  translation,
  translationStatus,
  translationLanguage,
  translationsByUser,
  translationsByLanguage,
  recipientLanguages,
  viewerUserId = 'me',
  preferredLanguage = 'en',
  isGroupChat = false,
}: MessageBubbleProps) {
  const [ownTranslationOpen, setOwnTranslationOpen] = useState(false)

  const translationToShow =
    isGroupChat && translationsByUser?.[viewerUserId]
      ? translationsByUser[viewerUserId]
      : translation

  const showTranslation = useMemo(() => {
    if (
      isSent ||
      !translationToShow?.trim() ||
      translationStatus !== 'completed'
    ) {
      return false
    }
    const languageMatches =
      isGroupChat ||
      !translationLanguage ||
      !preferredLanguage ||
      translationLanguage === preferredLanguage
    return languageMatches
  }, [
    isSent,
    translationToShow,
    translationStatus,
    translationLanguage,
    preferredLanguage,
    isGroupChat,
  ])

  const showTranslationPending =
    !isSent && translationStatus === 'pending'

  const showOwnTranslationPending = isSent && translationStatus === 'pending'

  const howOthersSeeRows = useMemo(
    () =>
      buildHowOthersSeeRows({
        originalText: message,
        viewerUserId,
        translation,
        translationLanguage,
        translationsByUser,
        translationsByLanguage,
        recipientLanguages,
      }),
    [
      message,
      viewerUserId,
      translation,
      translationLanguage,
      translationsByUser,
      translationsByLanguage,
      recipientLanguages,
    ],
  )

  const hasOwnTranslationPreview =
    isSent &&
    translationStatus === 'completed' &&
    howOthersSeeRows.length > 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`mb-4 flex gap-2 ${isSent ? 'justify-end' : 'justify-start'}`}
    >
      {!isSent && avatar && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-n-accent-soft text-xs font-semibold text-n-accent-strong">
          {avatar}
        </div>
      )}

      <div
        className={`flex max-w-xs flex-col sm:max-w-md ${isSent ? 'items-end' : 'items-start'}`}
      >
        {!isSent && (
          <p className="mb-1 flex flex-wrap items-center gap-1.5 px-2 text-xs text-n-muted">
            <span>{senderName}</span>
            {senderBadge ? <SenderBadge label={senderBadge} /> : null}
          </p>
        )}
        {isSent && senderBadge ? (
          <p className="mb-1 px-2 text-xs">
            <SenderBadge label={senderBadge} />
          </p>
        ) : null}
        <div
          className={`wrap-break-word rounded-2xl px-4 py-2.5 ${
            isSent
              ? 'rounded-br-md bg-n-accent text-white'
              : 'rounded-bl-md border border-n-line bg-n-surface text-n-ink shadow-n-card'
          }`}
        >
          <p className="whitespace-pre-wrap wrap-break-word text-sm">{message}</p>

          {!isSent && showTranslationPending && (
            <div className="mt-2 flex items-center gap-2 border-t border-n-line-soft pt-2">
              <span
                className="inline-block size-3.5 animate-spin rounded-full border-2 border-n-faint border-t-transparent"
                aria-hidden
              />
              <p className="text-[13px] italic text-n-muted">Translating...</p>
            </div>
          )}

          {!isSent && showTranslation && translationToShow?.trim() && (
            <div className="mt-2 border-t border-n-line-soft pt-2">
              <p className="whitespace-pre-wrap wrap-break-word text-[13px] italic text-n-muted">
                {translationToShow}
              </p>
            </div>
          )}

          {isSent && showOwnTranslationPending && (
            <div className="mt-2 flex items-center gap-2 border-t border-white/20 pt-2">
              <span
                className="inline-block size-3.5 animate-spin rounded-full border-2 border-white/70 border-t-transparent"
                aria-hidden
              />
              <p className="text-xs italic text-white/85">
                Translating for others...
              </p>
            </div>
          )}

          {isSent && hasOwnTranslationPreview && (
            <>
              <button
                type="button"
                onClick={() => setOwnTranslationOpen((o) => !o)}
                className="mt-2 flex items-center gap-1.5 self-start rounded-md py-1 text-left text-xs font-semibold text-white/90 hover:text-white"
              >
                <LanguagesIcon className="size-3.5 shrink-0 opacity-90" />
                <span>How others see it</span>
                <ChevronIcon
                  up={ownTranslationOpen}
                  className="size-4 shrink-0 opacity-85"
                />
              </button>
              {ownTranslationOpen && (
                <div className="mt-1.5 self-stretch border-t border-white/20 pt-2">
                  <div className="space-y-2.5">
                    {howOthersSeeRows.map(row => (
                      <div key={row.key}>
                        {row.languageLabel ? (
                          <p className="mb-1 text-[11px] font-semibold text-white/75">
                            {row.languageLabel}
                          </p>
                        ) : null}
                        <p className="whitespace-pre-wrap wrap-break-word text-[13px] leading-snug italic text-white/95">
                          {row.text}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
        {timestamp && (
          <p className="mt-1 px-2 text-xs text-n-subtle">{timestamp}</p>
        )}
      </div>
    </motion.div>
  )
}
