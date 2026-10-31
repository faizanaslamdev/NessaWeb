'use client'

/**
 * Conversation building blocks shared by both sides of business messaging
 * (staff Inbox and the traveler's /messages): live messages with paging,
 * the optimistic outbox, mark-read once per incoming batch, the timeline
 * (day separators, bubbles, translations, receipts, retry), the composer and
 * the confirm / report dialogs.
 */

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react'

import { Icon } from '@/components/dash/icons'
import { Avatar, Button, Dialog, EmptyState, LoadingBlock, Notice, cx, fieldClass } from '@/components/dash/ui'
import {
  BUSINESS_MESSAGE_MAX,
  MESSAGES_PAGE,
  REPORT_REASON_MAX,
  cleanComposerText,
  cleanReportReason,
  groupByDay,
  incomingBatchKeyFor,
  mergeTimeline,
  messageTime,
  newClientId,
  outboxReducer,
  shouldMarkReadFor,
  type BusinessMessage,
  type BusinessThread,
  type OutboxItem,
  type SenderRole,
  type TimelineItem,
} from '@/lib/business-messaging'
import { markBusinessThreadRead, subscribeThreadMessages } from '@/lib/business-messaging-api'
import { APP_CHAT_LANGUAGES } from '@/lib/chat/languages'

/* ───────────── Small pieces ───────────── */

export function ThreadAvatar({
  name,
  url,
  size = 40,
  square = false,
}: {
  name: string
  url: string | null
  size?: number
  /** Business logos are rounded squares; people are circles. */
  square?: boolean
}) {
  if (url && /^https:\/\//i.test(url)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- avatar / logo (Firebase Storage / provider URL)
      <img
        src={url}
        alt=""
        width={size}
        height={size}
        style={{ width: size, height: size }}
        className={cx('shrink-0 bg-n-sunken object-cover', square ? 'rounded-[10px]' : 'rounded-full')}
        referrerPolicy="no-referrer"
      />
    )
  }
  return <Avatar name={name} size={size} />
}

export function languageName(code: string | null): string | null {
  if (!code) return null
  const base = code.toLowerCase().split(/[-_]/)[0]
  return APP_CHAT_LANGUAGES.find(l => l.code === base)?.name ?? code.toUpperCase()
}

export function useDocumentVisible(): boolean {
  const [visible, setVisible] = useState(true)
  useEffect(() => {
    const update = () => setVisible(document.visibilityState === 'visible')
    update()
    document.addEventListener('visibilitychange', update)
    return () => document.removeEventListener('visibilitychange', update)
  }, [])
  return visible
}

/* ───────────── Data hooks ───────────── */

export type Conversation = {
  messages: BusinessMessage[]
  loaded: boolean
  error: string | null
  hasEarlier: boolean
  loadEarlier: () => void
  outbox: OutboxItem[]
  timeline: TimelineItem[]
  /** Queue `text` with a new clientId and deliver it. */
  send: (text: string) => void
  /** Re-deliver a failed item with the same clientId (idempotent server-side). */
  retry: (item: OutboxItem) => void
  discard: (clientId: string) => void
}

/**
 * Live messages of a thread (newest page first, "Load earlier" grows the
 * window) plus the optimistic outbox. `deliver` performs the callable and
 * returns an error message, or null when it went through.
 */
export function useConversation(
  threadId: string,
  deliver: (input: { clientId: string; text: string }) => Promise<string | null>,
): Conversation {
  const [messages, setMessages] = useState<BusinessMessage[]>([])
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasEarlier, setHasEarlier] = useState(false)
  const [count, setCount] = useState(MESSAGES_PAGE)
  const [outbox, dispatch] = useReducer(outboxReducer, [] as OutboxItem[])

  useEffect(
    () =>
      subscribeThreadMessages(
        threadId,
        count,
        (list, more) => {
          setMessages(list)
          setHasEarlier(more)
          setLoaded(true)
          setError(null)
          dispatch({ type: 'reconcile', clientIds: list.map(m => m.clientId).filter((c): c is string => Boolean(c)) })
        },
        () => {
          setLoaded(true)
          setError('Couldn’t load the messages. Check your connection and refresh the page.')
        },
      ),
    [threadId, count],
  )

  const deliverRef = useRef(deliver)
  useEffect(() => {
    deliverRef.current = deliver
  }, [deliver])

  const run = useCallback(async (clientId: string, text: string) => {
    const failure = await deliverRef.current({ clientId, text })
    dispatch(failure ? { type: 'failed', clientId, error: failure } : { type: 'sent', clientId })
  }, [])

  const send = useCallback(
    (text: string) => {
      const clientId = newClientId()
      dispatch({ type: 'queued', clientId, text, at: Date.now() })
      void run(clientId, text)
    },
    [run],
  )
  const retry = useCallback(
    (item: OutboxItem) => {
      dispatch({ type: 'retry', clientId: item.clientId })
      void run(item.clientId, item.text)
    },
    [run],
  )
  const discard = useCallback((clientId: string) => dispatch({ type: 'discard', clientId }), [])
  const loadEarlier = useCallback(() => setCount(n => n + MESSAGES_PAGE), [])
  const timeline = useMemo(() => mergeTimeline(messages, outbox), [messages, outbox])

  return { messages, loaded, error, hasEarlier, loadEarlier, outbox, timeline, send, retry, discard }
}

/**
 * Marks the viewer's side read once per new batch of incoming messages,
 * while the tab is visible and the viewer has unread messages. Waits for the
 * messages so the batch key doesn't switch from the thread's to a message's.
 */
export function useMarkThreadRead(input: {
  threadId: string
  viewer: SenderRole
  thread: Pick<BusinessThread, 'lastMessage' | 'customerUnread' | 'businessUnread'> | null
  messages: BusinessMessage[]
  loaded: boolean
  onError?: (err: unknown) => void
}): void {
  const { threadId, viewer, thread, messages, loaded, onError } = input
  const visible = useDocumentVisible()
  const lastMarked = useRef<string | null>(null)
  const batchKey = loaded && thread ? incomingBatchKeyFor(threadId, messages, thread.lastMessage, viewer) : null
  const unread = thread ? (viewer === 'business' ? thread.businessUnread : thread.customerUnread) : 0
  const onErrorRef = useRef(onError)
  useEffect(() => {
    onErrorRef.current = onError
  }, [onError])
  useEffect(() => {
    if (!shouldMarkReadFor({ unread, visible, batchKey, lastMarkedKey: lastMarked.current })) return
    lastMarked.current = batchKey
    markBusinessThreadRead(threadId).catch(err => onErrorRef.current?.(err))
  }, [threadId, unread, visible, batchKey])
}

/* ───────────── Timeline ───────────── */

export type Translation = { text: string; from: string | null }

/**
 * The scrolling message list. Sticks to the bottom while the reader is
 * there (and whenever they send), keeps their place on "Load earlier".
 */
export function MessageTimeline({
  conversation,
  viewer,
  ownRunLabel,
  otherRunLabel,
  translate,
  receipt,
  empty,
}: {
  conversation: Conversation
  viewer: SenderRole
  /** Shown above a run of the viewer's own messages (e.g. the business name for staff). */
  ownRunLabel?: string
  /** Shown above a run of the other side's messages. */
  otherRunLabel?: string
  translate: (message: BusinessMessage) => Translation | null
  receipt: { messageId: string; label: 'Seen' | 'Sent' } | null
  empty?: ReactNode
}) {
  const { timeline, loaded, error, hasEarlier, loadEarlier, retry, discard } = conversation
  const days = useMemo(() => groupByDay(timeline), [timeline])
  const scroller = useRef<HTMLDivElement>(null)
  const stick = useRef(true)
  const prevHeight = useRef<number | null>(null)
  const lastKey = useRef<string | null>(null)

  useLayoutEffect(() => {
    const el = scroller.current
    if (!el) return
    const last = timeline[timeline.length - 1]
    // The reader just sent something: follow it down.
    if (last && last.key !== lastKey.current && last.kind === 'pending') stick.current = true
    lastKey.current = last?.key ?? null
    if (prevHeight.current !== null) {
      // "Load earlier": keep the reader where they were.
      el.scrollTop += el.scrollHeight - prevHeight.current
      prevHeight.current = null
    } else if (stick.current) {
      el.scrollTop = el.scrollHeight
    }
  }, [timeline, loaded])

  const onScroll = () => {
    const el = scroller.current
    if (el) stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80
  }

  return (
    <div
      ref={scroller}
      onScroll={onScroll}
      className="min-h-0 flex-1 overflow-y-auto bg-n-surface-2 px-3 py-4 md:px-5"
      aria-live="polite"
      aria-relevant="additions"
    >
      {hasEarlier ? (
        <div className="mb-3 flex justify-center">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              prevHeight.current = scroller.current?.scrollHeight ?? null
              loadEarlier()
            }}
          >
            Load earlier messages
          </Button>
        </div>
      ) : null}
      {error ? (
        <Notice tone="danger" className="mb-3">
          {error}
        </Notice>
      ) : null}
      {!loaded ? (
        <LoadingBlock label="Loading messages…" rows={4} />
      ) : !timeline.length ? (
        error ? null : (empty ?? <EmptyState icon="chat" title="No messages yet" compact />)
      ) : (
        days.map(day => (
          <div key={day.key}>
            <div className="my-3 flex items-center gap-3" role="separator" aria-label={day.label}>
              <span className="h-px flex-1 bg-n-line" />
              <span className="text-xs font-medium text-n-subtle">{day.label}</span>
              <span className="h-px flex-1 bg-n-line" />
            </div>
            <ol className="space-y-1.5">
              {day.items.map((item, i) => (
                <li key={item.key}>
                  <TimelineEntry
                    item={item}
                    previous={i > 0 ? day.items[i - 1] : null}
                    viewer={viewer}
                    ownRunLabel={ownRunLabel}
                    otherRunLabel={otherRunLabel}
                    translate={translate}
                    receipt={receipt?.messageId === item.key ? receipt.label : null}
                    onRetry={retry}
                    onDiscard={discard}
                  />
                </li>
              ))}
            </ol>
          </div>
        ))
      )}
    </div>
  )
}

function isOwn(item: TimelineItem, viewer: SenderRole): boolean {
  return item.kind === 'pending' || item.message.senderRole === viewer
}

const ownBubble = 'max-w-[85%] rounded-2xl rounded-br-md px-3.5 py-2 text-sm leading-5 whitespace-pre-wrap break-words md:max-w-[70%]'
const otherBubble =
  'max-w-[85%] rounded-2xl rounded-bl-md border border-n-line bg-n-surface px-3.5 py-2 text-sm leading-5 whitespace-pre-wrap break-words text-n-ink md:max-w-[70%]'

function TimelineEntry({
  item,
  previous,
  viewer,
  ownRunLabel,
  otherRunLabel,
  translate,
  receipt,
  onRetry,
  onDiscard,
}: {
  item: TimelineItem
  previous: TimelineItem | null
  viewer: SenderRole
  ownRunLabel?: string
  otherRunLabel?: string
  translate: (message: BusinessMessage) => Translation | null
  receipt: 'Seen' | 'Sent' | null
  onRetry: (item: OutboxItem) => void
  onDiscard: (clientId: string) => void
}) {
  const [showOriginal, setShowOriginal] = useState(false)
  const own = isOwn(item, viewer)
  const startsRun = previous === null || isOwn(previous, viewer) !== own
  const runLabel = startsRun ? (own ? ownRunLabel : otherRunLabel) : undefined

  if (item.kind === 'pending') {
    const p = item.item
    return (
      <div className="flex flex-col items-end">
        {runLabel ? <RunLabel align="right">{runLabel}</RunLabel> : null}
        <div
          className={cx(
            ownBubble,
            p.status === 'failed' ? 'border border-n-danger/40 bg-n-danger-soft text-n-ink' : 'bg-n-accent/70 text-white',
          )}
        >
          {p.text}
        </div>
        {p.status === 'failed' ? (
          <p role="alert" className="mt-1 flex flex-wrap items-center justify-end gap-x-2 text-xs text-n-danger">
            <span>Not sent. {p.error}</span>
            <button type="button" onClick={() => onRetry(p)} className="font-semibold underline-offset-2 hover:underline">
              Retry
            </button>
            <button type="button" onClick={() => onDiscard(p.clientId)} className="text-n-muted hover:text-n-ink">
              Discard
            </button>
          </p>
        ) : (
          <p className="mt-1 text-xs text-n-subtle">Sending…</p>
        )}
      </div>
    )
  }

  const m = item.message
  const time = messageTime(m.createdAtMs)

  if (own) {
    return (
      <div className="flex flex-col items-end">
        {runLabel ? <RunLabel align="right">{runLabel}</RunLabel> : null}
        <div className={cx(ownBubble, 'bg-n-accent text-white')}>{m.text}</div>
        <p className="mt-1 flex items-center gap-1 text-xs text-n-subtle">
          <span>{time}</span>
          {receipt ? (
            <>
              <span aria-hidden>·</span>
              <span className={cx('inline-flex items-center gap-0.5', receipt === 'Seen' ? 'text-n-accent-strong' : '')}>
                <Icon name="check" size={12} />
                {receipt}
              </span>
            </>
          ) : null}
        </p>
      </div>
    )
  }

  const translation = translate(m)
  const shown = translation && !showOriginal ? translation.text : m.text
  return (
    <div className="flex flex-col items-start">
      {runLabel ? <RunLabel align="left">{runLabel}</RunLabel> : null}
      <div className={otherBubble}>{shown}</div>
      <p className="mt-1 flex flex-wrap items-center gap-x-1 text-xs text-n-subtle">
        <span>{time}</span>
        {translation ? (
          <>
            <span aria-hidden>·</span>
            <span>
              {showOriginal ? 'Original' : translation.from ? `Translated from ${translation.from}` : 'Translated'}
            </span>
            <span aria-hidden>·</span>
            <button
              type="button"
              onClick={() => setShowOriginal(s => !s)}
              className="font-medium text-n-accent-strong hover:underline"
            >
              {showOriginal ? 'Show translation' : 'Show original'}
            </button>
          </>
        ) : null}
      </p>
    </div>
  )
}

function RunLabel({ children, align }: { children: string; align: 'left' | 'right' }) {
  return (
    <p className={cx('mt-2 mb-1 px-1 text-[11px] font-medium text-n-subtle', align === 'right' ? 'text-right' : '')}>
      {children}
    </p>
  )
}

/* ───────────── Composer ───────────── */

const composerFieldClass = fieldClass.replace('mt-1.5 ', '')

export function Composer({
  label,
  placeholder,
  hint,
  onSend,
  autoFocus,
  sendLabel = 'Send',
}: {
  /** Screen-reader label of the text box. */
  label: string
  placeholder: string
  /** Line under the box (desktop gets the keyboard tip in front of it). */
  hint: string
  onSend: (text: string) => void
  autoFocus?: boolean
  sendLabel?: string
}) {
  const [draft, setDraft] = useState('')
  const area = useRef<HTMLTextAreaElement>(null)
  const clean = cleanComposerText(draft)
  const length = clean.length
  const over = length > BUSINESS_MESSAGE_MAX
  const canSend = length > 0 && !over

  // Grow with the text, up to ~6 lines.
  useLayoutEffect(() => {
    const el = area.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`
  }, [draft])

  const submit = () => {
    if (!canSend) return
    onSend(clean)
    setDraft('')
    area.current?.focus()
  }

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      submit()
    }
  }

  return (
    <form
      onSubmit={e => {
        e.preventDefault()
        submit()
      }}
    >
      <div className="flex items-end gap-2">
        <label className="min-w-0 flex-1">
          <span className="sr-only">{label}</span>
          <textarea
            ref={area}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            rows={1}
            autoFocus={autoFocus}
            placeholder={placeholder}
            aria-invalid={over || undefined}
            className={cx(composerFieldClass, 'max-h-40 resize-none leading-5', over ? 'border-n-danger focus:border-n-danger' : '')}
          />
        </label>
        <Button type="submit" variant="primary" icon="send" disabled={!canSend} aria-label={sendLabel} className="max-md:h-11">
          <span className="max-sm:sr-only">{sendLabel}</span>
        </Button>
      </div>
      <div className="mt-1.5 flex items-center justify-between gap-3 text-xs text-n-subtle">
        <span className="max-md:hidden">Enter to send · Shift+Enter for a new line · {hint}</span>
        <span className="md:hidden">{hint}</span>
        <span className={cx('tabular-nums', over ? 'font-medium text-n-danger' : length > BUSINESS_MESSAGE_MAX - 200 ? '' : 'invisible')}>
          {over ? `${length - BUSINESS_MESSAGE_MAX} over · ` : ''}
          {length}/{BUSINESS_MESSAGE_MAX}
        </span>
      </div>
    </form>
  )
}

/* ───────────── Dialogs ───────────── */

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  danger,
  busy,
  onClose,
  onConfirm,
  children,
}: {
  open: boolean
  title: string
  description: ReactNode
  confirmLabel: string
  danger?: boolean
  busy: boolean
  onClose: () => void
  onConfirm: () => void
  children?: ReactNode
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant={danger ? 'danger' : 'primary'} loading={busy} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      {children}
    </Dialog>
  )
}

export function ReportDialog({
  open,
  name,
  description,
  busy,
  onClose,
  onSubmit,
}: {
  open: boolean
  name: string
  description: string
  busy: boolean
  onClose: () => void
  onSubmit: (reason: string) => void
}) {
  const [reason, setReason] = useState('')
  const clean = cleanReportReason(reason)
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={`Report ${name}`}
      description={description}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="danger" loading={busy} disabled={clean.length > REPORT_REASON_MAX} onClick={() => onSubmit(clean)}>
            Send report
          </Button>
        </>
      }
    >
      <label className="block text-[13px] font-medium text-n-ink-2">
        What happened? <span className="font-normal text-n-subtle">(optional)</span>
        <textarea
          value={reason}
          onChange={e => setReason(e.target.value)}
          rows={4}
          maxLength={REPORT_REASON_MAX}
          className={cx(fieldClass, 'resize-y')}
        />
        <span className="mt-1 block text-right text-xs font-normal text-n-subtle tabular-nums">
          {clean.length}/{REPORT_REASON_MAX}
        </span>
      </label>
    </Dialog>
  )
}
