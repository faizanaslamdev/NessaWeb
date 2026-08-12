'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import type { PublicPlaceWifi } from '@/lib/place-landing'

type Props = {
  wifi: PublicPlaceWifi
  className?: string
  /**
   * Subtle pilot Edit action (web Place page only).
   * TODO(business-profiles): keep card; swap auth for this callback later.
   */
  onEdit?: () => void
}

type CopyTarget = 'network' | 'password'

async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // fall through
  }
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.setAttribute('readonly', '')
    ta.style.position = 'fixed'
    ta.style.left = '-9999px'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    return ok
  } catch {
    return false
  }
}

/**
 * Public Place Wi-Fi card — password hidden by default.
 * Copy feedback stays on the Copy control so the header/Edit never reflows.
 */
export function PlaceWifiCard({
  wifi,
  className = '',
  onEdit,
}: Props) {
  const [revealed, setRevealed] = useState(false)
  const [copied, setCopied] = useState<CopyTarget | null>(null)
  const copiedTimerRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (copiedTimerRef.current !== null) {
        window.clearTimeout(copiedTimerRef.current)
      }
    }
  }, [])

  const flashCopied = useCallback((target: CopyTarget) => {
    setCopied(target)
    if (copiedTimerRef.current !== null) {
      window.clearTimeout(copiedTimerRef.current)
    }
    copiedTimerRef.current = window.setTimeout(() => {
      setCopied(null)
      copiedTimerRef.current = null
    }, 1400)
  }, [])

  const onCopyNetwork = useCallback(async () => {
    const ok = await copyText(wifi.networkName)
    if (ok) {
      flashCopied('network')
    }
  }, [wifi.networkName, flashCopied])

  const onCopyPassword = useCallback(async () => {
    const ok = await copyText(wifi.password)
    if (ok) {
      flashCopied('password')
    }
  }, [wifi.password, flashCopied])

  return (
    <section
      className={[
        'w-full rounded-2xl border border-violet-400/20 bg-linear-to-br from-violet-500/15 via-white/[0.04] to-purple-600/10 px-4 py-4 text-left shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]',
        className,
      ].join(' ')}
      aria-label={`Wi-Fi network ${wifi.networkName}`}
    >
      <div className="mb-3 flex items-center gap-2">
        <WifiIcon className="size-4 shrink-0 text-violet-300" />
        <h2 className="min-w-0 flex-1 text-sm font-semibold text-white">
          Wi-Fi
        </h2>
        {onEdit ? (
          <button
            type="button"
            onClick={onEdit}
            className="shrink-0 rounded-lg px-2 py-1 text-[11px] font-medium text-gray-500 hover:bg-white/5 hover:text-gray-300"
            aria-label="Edit Wi-Fi"
          >
            Edit
          </button>
        ) : null}
      </div>

      <div className="space-y-3">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
              Network
            </p>
            <p className="mt-0.5 break-all text-[15px] font-semibold text-white">
              {wifi.networkName}
            </p>
          </div>
          <CopyButton
            copied={copied === 'network'}
            onClick={() => void onCopyNetwork()}
            ariaLabel="Copy Wi-Fi network name"
          />
        </div>

        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
              Password
            </p>
            <p
              className="mt-0.5 break-all text-[15px] font-semibold text-white"
              aria-label={
                revealed ? `Password ${wifi.password}` : 'Password hidden'
              }
            >
              {revealed ? wifi.password : '••••••••'}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => setRevealed(v => !v)}
              className="inline-flex min-w-[3.25rem] items-center justify-center rounded-lg px-2 py-1.5 text-xs font-medium text-gray-300 hover:bg-white/5"
              aria-label={
                revealed ? 'Hide Wi-Fi password' : 'Show Wi-Fi password'
              }
            >
              {revealed ? 'Hide' : 'Show'}
            </button>
            <CopyButton
              copied={copied === 'password'}
              onClick={() => void onCopyPassword()}
              ariaLabel="Copy Wi-Fi password"
            />
          </div>
        </div>

        {wifi.note ? (
          <p className="text-xs leading-relaxed text-gray-400">{wifi.note}</p>
        ) : null}
      </div>
    </section>
  )
}

function CopyButton({
  copied,
  onClick,
  ariaLabel,
}: {
  copied: boolean
  onClick: () => void
  ariaLabel: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'inline-flex min-w-[3.5rem] shrink-0 items-center justify-center rounded-lg px-2 py-1.5 text-xs font-medium hover:bg-white/5',
        copied ? 'text-emerald-300' : 'text-violet-300',
      ].join(' ')}
      aria-label={copied ? 'Copied' : ariaLabel}
    >
      {/* Fixed slot: both labels occupy the same box so the card never reflows. */}
      <span className="relative inline-flex h-[1.125rem] w-[3.25rem] items-center justify-center">
        <span
          className={[
            'absolute inset-0 flex items-center justify-center transition-opacity duration-150',
            copied ? 'opacity-0' : 'opacity-100',
          ].join(' ')}
          aria-hidden={copied}
        >
          Copy
        </span>
        <span
          className={[
            'absolute inset-0 flex items-center justify-center transition-opacity duration-150',
            copied ? 'opacity-100' : 'opacity-0',
          ].join(' ')}
          aria-hidden={!copied}
        >
          Copied
        </span>
      </span>
    </button>
  )
}

function WifiIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M12 20h.01M2 8.82a15.93 15.93 0 0 1 20 0M5 12.86a10.94 10.94 0 0 1 14 0M8.5 16.43a5.94 5.94 0 0 1 7 0"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
