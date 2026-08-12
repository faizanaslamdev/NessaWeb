'use client'

import { useCallback } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'

interface ChatHeaderProps {
  roomId: string
  participantCount: number
  /** Timer badge next to title (e.g. `10m`…`1m`, `45s`…; hidden until ≤10 min; `…` when ending). */
  sessionRemainingLabel?: string | null
  /** Header title — Instant defaults to “Chat Room”; Place passes place title. */
  title?: string
  /** Replaces the default “Room ID · N online” meta row when set. */
  metaLine?: string | null
  /** Hide online count (Place Chat has no Instant membership presence). */
  hideOnlineCount?: boolean
  /** Optional back control (e.g. Instant lobby). Place Chat uses titleHref instead. */
  backHref?: string
  backLabel?: string
  /** When set, the title navigates here (Place Chat → place landing). */
  titleHref?: string
  onShare?: () => void
  onSettings?: () => void
  /** Shown only below `lg` — opens full participant list (sidebar is desktop-only). */
  onOpenParticipants?: () => void
  /** After room ID copy attempt (`true` = success). Parent usually shows a toast. */
  onRoomIdCopied?: (ok: boolean) => void
  /** Hide Instant share/settings when irrelevant for Place. */
  hideShare?: boolean
  hideSettings?: boolean
}

async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // fall through
  }
  try {
    if (typeof document === 'undefined') return false
    const ta = document.createElement('textarea')
    ta.value = text
    ta.setAttribute('readonly', '')
    ta.style.position = 'fixed'
    ta.style.left = '-9999px'
    ta.style.top = '-9999px'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    return ok
  } catch {
    return false
  }
}

export default function ChatHeader({
  roomId,
  participantCount,
  sessionRemainingLabel,
  title = 'Chat Room',
  metaLine = null,
  hideOnlineCount = false,
  backHref,
  backLabel = 'Back',
  titleHref,
  onShare,
  onSettings,
  onOpenParticipants,
  onRoomIdCopied,
  hideShare = false,
  hideSettings = false,
}: ChatHeaderProps) {
  const handleCopyRoomId = useCallback(async () => {
    const ok = await copyTextToClipboard(roomId)
    onRoomIdCopied?.(ok)
  }, [roomId, onRoomIdCopied])

  const titleNode = titleHref ? (
    <a
      href={titleHref}
      className="min-w-0 truncate text-white no-underline hover:text-violet-200 hover:underline underline-offset-2"
      title="Open place"
    >
      {title}
    </a>
  ) : (
    <span className="min-w-0 truncate">{title}</span>
  )

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="border-b border-white/10 bg-black/50 backdrop-blur-sm sticky top-0 z-40"
    >
      <div className="px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-start gap-2">
          {backHref ? (
            <a
              href={backHref}
              className="mt-0.5 shrink-0 rounded-md border border-white/15 bg-white/5 px-2 py-1 text-xs font-medium text-gray-200 no-underline hover:bg-white/10"
            >
              {backLabel}
            </a>
          ) : null}
          <div className="min-w-0 flex-1">
            <h1 className="mb-1 flex min-w-0 flex-wrap items-center gap-2 text-lg font-bold text-white sm:text-xl">
              {titleNode}
              {sessionRemainingLabel ? (
                <span
                  className="inline-flex shrink-0 items-center gap-1 rounded border border-amber-500/35 bg-amber-500/10 px-1.5 py-0.5 font-mono text-xs font-semibold tabular-nums text-amber-200 sm:text-sm"
                  title="Time left before this room reaches its session limit."
                >
                  <TimerIcon className="size-3.5 shrink-0 opacity-90 sm:size-4" aria-hidden />
                  {sessionRemainingLabel}
                </span>
              ) : null}
            </h1>
            {metaLine ? (
              <p className="text-xs text-gray-400 sm:text-sm">{metaLine}</p>
            ) : (
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => void handleCopyRoomId()}
                  title="Copy room ID"
                  aria-label={`Copy room ID ${roomId}`}
                  className="group max-w-full cursor-pointer rounded-md px-1 py-0.5 text-left text-xs text-gray-400 -mx-1 transition-colors hover:bg-white/10 hover:text-gray-200 sm:text-sm"
                >
                  Room ID:{' '}
                  <span className="break-all font-mono text-purple-400 group-hover:text-purple-200">
                    {roomId}
                  </span>
                </button>
                {!hideOnlineCount ? (
                  <>
                    <span className="text-xs text-gray-500">•</span>
                    <p className="text-xs sm:text-sm text-gray-400">
                      <span className="text-green-400 font-semibold">{participantCount}</span>{' '}
                      online
                    </p>
                  </>
                ) : null}
              </div>
            )}
          </div>
        </div>

        <div className="flex shrink-0 gap-2">
          {onOpenParticipants && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onOpenParticipants}
              title="People in this room"
              className="border-white/20 px-2.5 text-white hover:bg-white/10 sm:px-3 lg:hidden"
              aria-label="View everyone in this room"
            >
              <UsersIcon className="size-4" />
            </Button>
          )}
          {!hideShare && onShare ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onShare}
              title="Share room"
              aria-label="Share room"
              className="border-white/20 px-2.5 text-white hover:bg-white/10 sm:px-3 lg:px-3"
            >
              <ShareIcon className="size-4 lg:hidden" aria-hidden />
              <span className="hidden text-xs sm:text-sm lg:inline">Share</span>
            </Button>
          ) : null}
          {!hideSettings && onSettings ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onSettings}
              title="Room settings"
              aria-label="Room settings"
              className="border-white/20 px-2.5 text-white hover:bg-white/10 sm:px-3"
            >
              <SettingsIcon className="size-4" />
            </Button>
          ) : null}
        </div>
      </div>
    </motion.div>
  )
}

function TimerIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
      <path d="M12 7v6l3 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
    </svg>
  )
}

function ShareIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <circle cx="18" cy="5" r="3" stroke="currentColor" strokeWidth="2" />
      <circle cx="6" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
      <circle cx="18" cy="19" r="3" stroke="currentColor" strokeWidth="2" />
      <path
        d="m8.59 13.51 6.83 3.98M15.41 6.51 8.59 10.49"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm12 10v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
