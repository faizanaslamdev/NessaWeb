'use client'

import { useCallback, useState } from 'react'

import type { PublicPlaceWifi } from '@/lib/place-landing'

type Props = {
  wifi: PublicPlaceWifi
  /** Compact banner for Place Chat shell. */
  compact?: boolean
  className?: string
}

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
 */
export function PlaceWifiCard({ wifi, compact = false, className = '' }: Props) {
  const [revealed, setRevealed] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  const flash = useCallback((msg: string) => {
    setNotice(msg)
    window.setTimeout(() => setNotice(null), 1600)
  }, [])

  const onCopyNetwork = useCallback(async () => {
    const ok = await copyText(wifi.networkName)
    flash(ok ? 'Network name copied' : 'Could not copy')
  }, [wifi.networkName, flash])

  const onCopyPassword = useCallback(async () => {
    const ok = await copyText(wifi.password)
    flash(ok ? 'Password copied' : 'Could not copy')
  }, [wifi.password, flash])

  return (
    <section
      className={[
        'w-full rounded-2xl border border-white/10 bg-white/[0.04] text-left',
        compact ? 'px-3.5 py-3' : 'px-4 py-4',
        className,
      ].join(' ')}
      aria-label={`Wi-Fi network ${wifi.networkName}`}
    >
      <div className="mb-3 flex items-center gap-2">
        <WifiIcon className="size-4 shrink-0 text-violet-300" />
        <h2 className="text-sm font-semibold text-white">Wi-Fi</h2>
        {notice ? (
          <span className="ml-auto text-[11px] font-medium text-emerald-300">
            {notice}
          </span>
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
          <button
            type="button"
            onClick={() => void onCopyNetwork()}
            className="shrink-0 rounded-lg px-2 py-1.5 text-xs font-medium text-violet-300 hover:bg-white/5"
            aria-label="Copy Wi-Fi network name"
          >
            Copy
          </button>
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
              className="rounded-lg px-2 py-1.5 text-xs font-medium text-gray-300 hover:bg-white/5"
              aria-label={
                revealed ? 'Hide Wi-Fi password' : 'Show Wi-Fi password'
              }
            >
              {revealed ? 'Hide' : 'Show'}
            </button>
            <button
              type="button"
              onClick={() => void onCopyPassword()}
              className="rounded-lg px-2 py-1.5 text-xs font-medium text-violet-300 hover:bg-white/5"
              aria-label="Copy Wi-Fi password"
            >
              Copy
            </button>
          </div>
        </div>

        {wifi.note ? (
          <p className="text-xs leading-relaxed text-gray-400">{wifi.note}</p>
        ) : null}
      </div>
    </section>
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
