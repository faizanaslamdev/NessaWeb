'use client'

/**
 * /messages/new?place={placeId} — the first message to a Place's verified
 * business. If the traveler already has a conversation with it, they go
 * there instead. Sending calls startBusinessThread (idempotent on clientId,
 * so Retry reuses it) and then opens the new thread.
 */

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'

import { Icon } from '@/components/dash/icons'
import { EmptyState, LoadingBlock, cx } from '@/components/dash/ui'
import { MessagesFrame } from '@/components/messages/customer-messages'
import { Composer, ThreadAvatar } from '@/components/messaging/conversation'
import { useThreadList } from '@/components/messaging/use-thread-list'
import { VerifiedBadge } from '@/components/place/place-official-section'
import { useAccountAuth } from '@/hooks/use-account-auth'
import { describeMessagingError, newClientId } from '@/lib/business-messaging'
import { startBusinessThread } from '@/lib/business-messaging-api'
import type { PublicBusinessProfile } from '@/lib/business-profile'
import {
  CUSTOMER_THREADS_PAGE,
  MESSAGES_PATH,
  buildCustomerThreadsQuery,
  messageThreadHref,
  newMessageDecision,
} from '@/lib/customer-messages'
import { fetchPublicPlaceLanding, isPublicPlaceIdValid } from '@/lib/place-landing'

type PlaceState =
  | { state: 'loading' }
  | { state: 'error' }
  | { state: 'ready'; business: PublicBusinessProfile | null; placeName: string }

type Pending = { clientId: string; text: string; status: 'sending' | 'failed'; error?: string }

export function NewBusinessMessage() {
  const { user } = useAccountAuth()
  const uid = user?.uid ?? ''
  const router = useRouter()
  const placeId = (useSearchParams().get('place') ?? '').trim()
  const placeValid = isPublicPlaceIdValid(placeId)

  const [place, setPlace] = useState<PlaceState>({ state: 'loading' })
  const [pending, setPending] = useState<Pending | null>(null)

  useEffect(() => {
    if (!placeValid) return
    let cancelled = false
    fetchPublicPlaceLanding(placeId).then(
      landing => {
        if (!cancelled) setPlace({ state: 'ready', business: landing.business ?? null, placeName: landing.name })
      },
      () => {
        if (!cancelled) setPlace({ state: 'error' })
      },
    )
    return () => {
      cancelled = true
    }
  }, [placeId, placeValid])

  const spec = useMemo(() => buildCustomerThreadsQuery(uid, CUSTOMER_THREADS_PAGE), [uid])
  const list = useThreadList(spec)
  const decision = newMessageDecision({
    placeId,
    placeValid,
    place: place.state === 'ready' ? { state: 'ready', business: place.business } : place,
    uid,
    threads: list.threads,
    // A list error shouldn't block writing: startBusinessThread continues an existing thread anyway.
    threadsLoaded: !list.loading || Boolean(list.error),
  })

  // Already talking to this business about this Place: open that conversation.
  const existingHref = decision.kind === 'existing' && !pending ? decision.href : null
  useEffect(() => {
    if (existingHref) router.replace(existingHref)
  }, [existingHref, router])

  const deliver = async (clientId: string, text: string) => {
    setPending({ clientId, text, status: 'sending' })
    try {
      const res = await startBusinessThread({ placeId, text, clientId })
      router.replace(messageThreadHref(res.threadId, { started: true }))
    } catch (err) {
      const info = describeMessagingError(err, 'customer', 'Message not sent. Check your connection and try again.')
      setPending({ clientId, text, status: 'failed', error: info.message })
    }
  }

  const business = place.state === 'ready' ? place.business : null
  const placeName = place.state === 'ready' ? place.placeName : ''

  return (
    <MessagesFrame>
      <section aria-label="New message" className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-3 border-b border-n-line-soft px-3 py-2.5 md:px-5">
          <Link
            href={placeValid ? `/place/${encodeURIComponent(placeId)}` : MESSAGES_PATH}
            aria-label="Back"
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-n-muted no-underline hover:bg-n-hover hover:text-n-ink"
          >
            <Icon name="chevron-left" size={20} />
          </Link>
          {business ? (
            <>
              <ThreadAvatar name={business.name} url={business.logoUrl ?? null} size={36} square />
              <div className="min-w-0 flex-1">
                <p className="flex min-w-0 items-center gap-2">
                  <span className="truncate text-[15px] font-semibold text-n-ink">{business.name}</span>
                  <VerifiedBadge className="shrink-0" />
                </p>
                <p className="truncate text-xs text-n-subtle">{placeName}</p>
              </div>
            </>
          ) : (
            <p className="text-[15px] font-semibold text-n-ink">New message</p>
          )}
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-n-surface-2 px-3 py-4 md:px-5">
          {decision.kind === 'invalid' ? (
            <Centered title="This link isn’t valid" body="Open a Place page and press Message to write to its business." />
          ) : decision.kind === 'error' ? (
            <Centered title="Couldn’t load this place" body="Check your connection and refresh the page." />
          ) : decision.kind === 'loading' || decision.kind === 'existing' ? (
            <LoadingBlock label="Loading…" rows={3} />
          ) : decision.kind === 'no-business' ? (
            <Centered title="No business to message here" body="This place doesn’t have a verified business on NessaChat yet." />
          ) : decision.kind === 'disabled' ? (
            <Centered
              title={`${decision.businessName} isn’t taking messages`}
              body="They turned off messages for now. Their Place page lists other ways to reach them."
            />
          ) : (
            <div className="mt-auto space-y-3">
              {!pending ? (
                <div className="mx-auto max-w-md rounded-2xl border border-n-line bg-n-surface p-4 text-center text-[13px] leading-5 text-n-muted">
                  Ask {business?.name ?? 'the business'} anything about {placeName || 'this place'} — rooms, prices, opening
                  hours. Messages are translated automatically, and the team usually replies here.
                </div>
              ) : (
                <div className="flex flex-col items-end">
                  <div
                    className={cx(
                      'max-w-[85%] rounded-2xl rounded-br-md px-3.5 py-2 text-sm leading-5 whitespace-pre-wrap break-words md:max-w-[70%]',
                      pending.status === 'failed' ? 'border border-n-danger/40 bg-n-danger-soft text-n-ink' : 'bg-n-accent/70 text-white',
                    )}
                  >
                    {pending.text}
                  </div>
                  {pending.status === 'failed' ? (
                    <p role="alert" className="mt-1 flex flex-wrap items-center justify-end gap-x-2 text-xs text-n-danger">
                      <span>Not sent. {pending.error}</span>
                      <button
                        type="button"
                        onClick={() => void deliver(pending.clientId, pending.text)}
                        className="font-semibold underline-offset-2 hover:underline"
                      >
                        Retry
                      </button>
                      <button type="button" onClick={() => setPending(null)} className="text-n-muted hover:text-n-ink">
                        Discard
                      </button>
                    </p>
                  ) : (
                    <p className="mt-1 text-xs text-n-subtle">Sending…</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {decision.kind === 'compose' ? (
          <div className="border-t border-n-line-soft bg-n-surface px-3 py-3 pb-[max(12px,env(safe-area-inset-bottom))] md:px-5">
            {pending ? (
              <p className="text-center text-xs text-n-subtle">
                {pending.status === 'sending' ? 'Starting your conversation…' : 'Retry or discard the message above to continue.'}
              </p>
            ) : (
              <Composer
                label={`Message ${business?.name ?? 'the business'}`}
                placeholder={`Message ${business?.name ?? 'the business'}…`}
                hint={`Translated for ${business?.name ?? 'the business'}`}
                onSend={text => void deliver(newClientId(), text)}
                autoFocus
              />
            )}
          </div>
        ) : null}
      </section>
    </MessagesFrame>
  )
}

function Centered({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex flex-1 items-center justify-center">
      <EmptyState icon="chat" title={title} action={<Link href={MESSAGES_PATH} className="text-[13px] font-semibold text-n-accent-strong no-underline hover:underline">Your messages</Link>}>
        {body}
      </EmptyState>
    </div>
  )
}
