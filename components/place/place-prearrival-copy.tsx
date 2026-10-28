'use client'

import { useState } from 'react'

import { PlaceSheet } from '@/components/place/place-sheet'
import { buildPrearrivalCopy } from '@/lib/place-prearrival'
import { placeChatOutboundUrl, placeOutboundUrl } from '@/lib/place-slug'

async function copyText(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // fall through
  }
  return false
}

/**
 * Pre-arrival sharing (roadmap item 11): ready-to-paste messages a hostel /
 * hotel can add to Booking.com, WhatsApp or email, linking guests who are
 * about to arrive into the Place and its live chat. Links carry `?ref=pre`.
 */
export function PlacePrearrivalCopy({
  placeId,
  slug,
  placeName,
  triggerLabel = 'Pre-arrival message for guests',
  triggerClassName = 'text-[13px] font-medium text-n-accent-strong underline-offset-2 hover:underline',
}: {
  placeId: string
  slug?: string | null
  placeName: string
  /** Button text / style — the business tools page shows it as a regular link. */
  triggerLabel?: string
  triggerClassName?: string
}) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)

  const placeUrl = placeOutboundUrl({ placeId, slug }, { ref: 'pre' })
  const chatUrl = placeChatOutboundUrl({ placeId, slug }, { ref: 'pre' })
  const items = buildPrearrivalCopy({ placeName, placeUrl, chatUrl })

  const onCopy = async (channel: string, text: string) => {
    const ok = await copyText(text)
    setCopied(ok ? channel : null)
    window.setTimeout(() => setCopied(current => (current === channel ? null : current)), 2000)
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={triggerClassName}>
        {triggerLabel}
      </button>

      <PlaceSheet open={open} title="Share before guests arrive" onClose={() => setOpen(false)}>
        <div className="space-y-4 py-1 text-left">
          <p className="text-[13px] leading-5 text-n-muted">
            Paste one of these into your booking confirmation, WhatsApp or welcome email.
            Guests join the chat in their browser — no app needed — and visits are counted
            as “pre-arrival” in this place’s stats.
          </p>
          {items.map(item => (
            <div key={item.channel} className="rounded-xl border border-n-line bg-n-surface-2 p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-[13px] font-semibold text-n-ink">{item.label}</p>
                <button
                  type="button"
                  onClick={() => {
                    void onCopy(item.channel, item.text)
                  }}
                  className="rounded-lg border border-n-line-strong bg-n-surface px-2.5 py-1 text-[12px] font-semibold text-n-ink hover:bg-n-hover"
                >
                  {copied === item.channel ? 'Copied' : 'Copy'}
                </button>
              </div>
              <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-words font-sans text-[13px] leading-5 text-n-ink-2">
                {item.text}
              </pre>
            </div>
          ))}
        </div>
      </PlaceSheet>
    </>
  )
}
