'use client'

/**
 * One customer conversation in the Business Inbox: live messages (with day
 * separators, translations and read receipts), the reply composer with
 * optimistic sends, and archive / block / report.
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
} from 'react'

import { sendEmailVerification } from 'firebase/auth'

import { useBusiness } from '@/components/business/dashboard/business-shell'
import { Icon } from '@/components/dash/icons'
import {
  Avatar,
  Button,
  Dialog,
  EmptyState,
  IconButton,
  LoadingBlock,
  Notice,
  cx,
  fieldClass,
  menuItemClass,
  menuPanelClass,
  usePopover,
} from '@/components/dash/ui'
import {
  BUSINESS_MESSAGE_MAX,
  INBOX_MESSAGES_PAGE,
  REPORT_REASON_MAX,
  businessSideTranslation,
  cleanComposerText,
  describeInboxError,
  groupByDay,
  incomingBatchKey,
  mergeTimeline,
  messageTime,
  newClientId,
  outboxReducer,
  readReceipt,
  shouldMarkRead,
  type InboxMessage,
  type InboxThread,
  type OutboxItem,
  type TimelineItem,
} from '@/lib/business-inbox'
import {
  manageBusinessThread,
  markBusinessThreadRead,
  sendBusinessMessage,
  subscribeInboxMessages,
  subscribeInboxThread,
  type StaffThreadAction,
} from '@/lib/business-inbox-api'
import { AUTH_EMAIL_ACTION_CODE_SETTINGS } from '@/lib/account/constants'
import { APP_CHAT_LANGUAGES } from '@/lib/chat/languages'
import { getFirebaseClient } from '@/lib/firebase'

export function ThreadAvatar({ name, url, size = 40 }: { name: string; url: string | null; size?: number }) {
  if (url && /^https:\/\//i.test(url)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- traveler avatar (Firebase Storage / provider URL)
      <img
        src={url}
        alt=""
        width={size}
        height={size}
        style={{ width: size, height: size }}
        className="shrink-0 rounded-full bg-n-sunken object-cover"
        referrerPolicy="no-referrer"
      />
    )
  }
  return <Avatar name={name} size={size} />
}

function languageName(code: string | null): string | null {
  if (!code) return null
  const base = code.toLowerCase().split(/[-_]/)[0]
  return APP_CHAT_LANGUAGES.find(l => l.code === base)?.name ?? code.toUpperCase()
}

function useDocumentVisible(): boolean {
  const [visible, setVisible] = useState(true)
  useEffect(() => {
    const update = () => setVisible(document.visibilityState === 'visible')
    update()
    document.addEventListener('visibilitychange', update)
    return () => document.removeEventListener('visibilitychange', update)
  }, [])
  return visible
}

type LoadState = 'loading' | 'ready' | 'missing' | 'error'
type Banner = { tone: 'ok' | 'danger' | 'neutral'; text: string } | null

const ACTION_DONE: Record<StaffThreadAction, (name: string) => string> = {
  archive: name => `Archived. It comes back to your inbox if ${name} writes again.`,
  unarchive: () => 'Moved back to your inbox.',
  block: name => `Blocked. ${name} can’t message you until you unblock them.`,
  unblock: () => 'Unblocked. You can message each other again.',
  report: () => 'Thanks — the NessaChat team will review this conversation.',
}

export function InboxThreadView({ threadId, onBack }: { threadId: string; onBack: () => void }) {
  const { business } = useBusiness()
  const visible = useDocumentVisible()

  const [thread, setThread] = useState<InboxThread | null>(null)
  const [threadState, setThreadState] = useState<LoadState>('loading')
  const [messages, setMessages] = useState<InboxMessage[]>([])
  const [messagesLoaded, setMessagesLoaded] = useState(false)
  const [messagesError, setMessagesError] = useState<string | null>(null)
  const [hasEarlier, setHasEarlier] = useState(false)
  const [messageCount, setMessageCount] = useState(INBOX_MESSAGES_PAGE)
  const [outbox, dispatch] = useReducer(outboxReducer, [] as OutboxItem[])
  const [banner, setBanner] = useState<Banner>(null)
  const [needsVerify, setNeedsVerify] = useState(false)
  const [busyAction, setBusyAction] = useState<StaffThreadAction | null>(null)
  const [dialog, setDialog] = useState<null | 'block' | 'unblock' | 'report'>(null)

  useEffect(
    () =>
      subscribeInboxThread(
        threadId,
        t => {
          setThread(t)
          setThreadState(t ? 'ready' : 'missing')
        },
        err => setThreadState((err as { code?: string })?.code === 'permission-denied' ? 'missing' : 'error'),
      ),
    [threadId],
  )

  useEffect(
    () =>
      subscribeInboxMessages(
        threadId,
        messageCount,
        (list, more) => {
          setMessages(list)
          setHasEarlier(more)
          setMessagesLoaded(true)
          setMessagesError(null)
          dispatch({ type: 'reconcile', clientIds: list.map(m => m.clientId).filter((c): c is string => Boolean(c)) })
        },
        () => {
          setMessagesLoaded(true)
          setMessagesError('Couldn’t load the messages. Check your connection and refresh the page.')
        },
      ),
    [threadId, messageCount],
  )

  // Mark read: once per new batch of customer messages, while the tab is visible.
  const lastMarked = useRef<string | null>(null)
  // Wait for the messages so the key doesn't change from the thread's to the message's.
  const batchKey = messagesLoaded ? incomingBatchKey(threadId, messages, thread) : null
  const unread = thread?.businessUnread ?? 0
  useEffect(() => {
    if (!shouldMarkRead({ thread: { businessUnread: unread }, visible, batchKey, lastMarkedKey: lastMarked.current })) return
    lastMarked.current = batchKey
    markBusinessThreadRead(threadId).catch(err => {
      if (describeInboxError(err).code === 'business/email-not-verified') setNeedsVerify(true)
    })
  }, [threadId, unread, visible, batchKey])

  /* ── sending ── */

  const deliver = useCallback(
    async (clientId: string, text: string) => {
      try {
        await sendBusinessMessage({ threadId, text, clientId })
        dispatch({ type: 'sent', clientId })
      } catch (err) {
        const info = describeInboxError(err, 'Message not sent. Check your connection and try again.')
        if (info.code === 'business/email-not-verified') setNeedsVerify(true)
        dispatch({ type: 'failed', clientId, error: info.message })
      }
    },
    [threadId],
  )

  const scroller = useRef<HTMLDivElement>(null)
  const stick = useRef(true)
  const send = useCallback(
    (text: string) => {
      const clientId = newClientId()
      dispatch({ type: 'queued', clientId, text, at: Date.now() })
      stick.current = true
      void deliver(clientId, text)
    },
    [deliver],
  )
  const retry = useCallback(
    (item: OutboxItem) => {
      dispatch({ type: 'retry', clientId: item.clientId })
      void deliver(item.clientId, item.text)
    },
    [deliver],
  )

  /* ── actions ── */

  const runAction = async (action: StaffThreadAction, reason?: string) => {
    setBusyAction(action)
    setBanner(null)
    try {
      await manageBusinessThread({ threadId, action, ...(reason ? { reason } : {}) })
      setBanner({ tone: 'ok', text: ACTION_DONE[action](thread?.customerName ?? 'The traveler') })
      setDialog(null)
    } catch (err) {
      const info = describeInboxError(err, 'That didn’t work. Please try again.')
      if (info.code === 'business/email-not-verified') setNeedsVerify(true)
      setBanner({ tone: 'danger', text: info.message })
      setDialog(null)
    } finally {
      setBusyAction(null)
    }
  }

  /* ── timeline + scrolling ── */

  const timeline = useMemo(() => mergeTimeline(messages, outbox), [messages, outbox])
  const days = useMemo(() => groupByDay(timeline), [timeline])
  const receipt = useMemo(
    () => readReceipt(messages, thread?.customerLastReadAtMs ?? null),
    [messages, thread?.customerLastReadAtMs],
  )
  const prevHeight = useRef<number | null>(null)

  useLayoutEffect(() => {
    const el = scroller.current
    if (!el) return
    if (prevHeight.current !== null) {
      // "Load earlier": keep the reader where they were.
      el.scrollTop += el.scrollHeight - prevHeight.current
      prevHeight.current = null
    } else if (stick.current) {
      el.scrollTop = el.scrollHeight
    }
  }, [timeline.length, messagesLoaded])

  const onScroll = () => {
    const el = scroller.current
    if (el) stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80
  }

  const loadEarlier = () => {
    prevHeight.current = scroller.current?.scrollHeight ?? null
    setMessageCount(n => n + INBOX_MESSAGES_PAGE)
  }

  if (threadState === 'loading') {
    return <LoadingBlock label="Loading conversation…" rows={5} />
  }
  if (threadState !== 'ready' || !thread) {
    return (
      <div className="flex flex-1 flex-col">
        <BackBar onBack={onBack} />
        <div className="flex flex-1 items-center justify-center">
          <EmptyState icon="alert" title={threadState === 'error' ? 'Couldn’t load this conversation' : 'Conversation not found'}>
            {threadState === 'error'
              ? 'Check your connection and refresh the page.'
              : 'It may belong to a Place you don’t manage, or the link is wrong.'}
          </EmptyState>
        </div>
      </div>
    )
  }

  const blocked = thread.status === 'blocked'
  const archived = thread.status === 'archived'
  const lang = languageName(thread.customerLanguage)
  const messagingOff = business.profile.messagingEnabled === false

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Header */}
      <header className="flex items-center gap-3 border-b border-n-line-soft px-3 py-2.5 md:px-5">
        <IconButton icon="chevron-left" label="Back to conversations" onClick={onBack} className="md:hidden" />
        <ThreadAvatar name={thread.customerName} url={thread.customerAvatar} size={36} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold text-n-ink">{thread.customerName}</p>
          <p className="truncate text-xs text-n-subtle">
            {thread.placeName}
            {lang ? ` · Writes in ${lang}` : ''}
          </p>
        </div>
        <ThreadActions
          status={thread.status}
          busy={busyAction}
          onArchive={() => void runAction(archived ? 'unarchive' : 'archive')}
          onBlock={() => setDialog(blocked ? 'unblock' : 'block')}
          onReport={() => setDialog('report')}
        />
      </header>

      {banner ? (
        <div className="px-3 pt-3 md:px-5">
          <Notice
            tone={banner.tone}
            action={<IconButton icon="x" label="Dismiss" size={28} onClick={() => setBanner(null)} />}
          >
            {banner.text}
          </Notice>
        </div>
      ) : null}
      {needsVerify ? (
        <div className="px-3 pt-3 md:px-5">
          <VerifyEmailNotice businessName={thread.businessName} onDone={() => setNeedsVerify(false)} />
        </div>
      ) : null}

      {/* Messages */}
      <div
        ref={scroller}
        onScroll={onScroll}
        className="min-h-0 flex-1 overflow-y-auto bg-n-surface-2 px-3 py-4 md:px-5"
        aria-live="polite"
        aria-relevant="additions"
      >
        {hasEarlier ? (
          <div className="mb-3 flex justify-center">
            <Button size="sm" variant="ghost" onClick={loadEarlier}>
              Load earlier messages
            </Button>
          </div>
        ) : null}
        {messagesError ? (
          <Notice tone="danger" className="mb-3">
            {messagesError}
          </Notice>
        ) : null}
        {!messagesLoaded ? (
          <LoadingBlock label="Loading messages…" rows={4} />
        ) : !timeline.length ? (
          messagesError ? null : (
            <EmptyState icon="chat" title="No messages yet" compact />
          )
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
                      thread={thread}
                      receipt={receipt?.messageId === item.key ? receipt.label : null}
                      onRetry={retry}
                      onDiscard={clientId => dispatch({ type: 'discard', clientId })}
                    />
                  </li>
                ))}
              </ol>
            </div>
          ))
        )}
      </div>

      {/* Composer */}
      <div className="border-t border-n-line-soft bg-n-surface px-3 py-3 pb-[max(12px,env(safe-area-inset-bottom))] md:px-5">
        {blocked ? (
          <Notice
            tone="warn"
            title="You blocked this conversation"
            action={
              <Button size="sm" onClick={() => setDialog('unblock')}>
                Unblock
              </Button>
            }
          >
            {thread.customerName} can’t message you, and replies are turned off. Unblock to talk again.
          </Notice>
        ) : (
          <>
            {archived ? (
              <p className="mb-2 text-xs text-n-subtle">Archived — replying moves this conversation back to your inbox.</p>
            ) : messagingOff ? (
              <p className="mb-2 text-xs text-n-subtle">
                Messaging is turned off for your business. {thread.customerName} can’t send new messages, but your replies still arrive.
              </p>
            ) : null}
            <Composer businessName={thread.businessName} onSend={send} />
          </>
        )}
      </div>

      <ConfirmStatusDialog
        open={dialog === 'block' || dialog === 'unblock'}
        mode={dialog === 'unblock' ? 'unblock' : 'block'}
        name={thread.customerName}
        busy={busyAction === 'block' || busyAction === 'unblock'}
        onClose={() => setDialog(null)}
        onConfirm={() => void runAction(dialog === 'unblock' ? 'unblock' : 'block')}
      />
      <ReportDialog
        open={dialog === 'report'}
        name={thread.customerName}
        busy={busyAction === 'report'}
        onClose={() => setDialog(null)}
        onSubmit={reason => void runAction('report', reason)}
      />
    </div>
  )
}

function BackBar({ onBack }: { onBack: () => void }) {
  return (
    <div className="border-b border-n-line-soft px-3 py-2 md:hidden">
      <Button size="sm" variant="ghost" icon="chevron-left" onClick={onBack}>
        Conversations
      </Button>
    </div>
  )
}

function ThreadActions({
  status,
  busy,
  onArchive,
  onBlock,
  onReport,
}: {
  status: InboxThread['status']
  busy: StaffThreadAction | null
  onArchive: () => void
  onBlock: () => void
  onReport: () => void
}) {
  const [open, setOpen, ref] = usePopover<HTMLDivElement>()
  const archived = status === 'archived'
  const blocked = status === 'blocked'
  return (
    <div className="flex shrink-0 items-center gap-1">
      {!blocked ? (
        <Button
          size="sm"
          variant="secondary"
          icon={archived ? 'inbox' : 'archive'}
          loading={busy === 'archive' || busy === 'unarchive'}
          onClick={onArchive}
          className="max-sm:hidden"
        >
          {archived ? 'Move to inbox' : 'Archive'}
        </Button>
      ) : null}
      <div ref={ref} className="relative">
        <IconButton
          icon="more"
          label="More actions"
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={() => setOpen(o => !o)}
        />
        {open ? (
          <div role="menu" className={cx(menuPanelClass, 'right-0')}>
            {!blocked ? (
              <button
                type="button"
                role="menuitem"
                className={cx(menuItemClass, 'sm:hidden')}
                onClick={() => {
                  setOpen(false)
                  onArchive()
                }}
              >
                <Icon name={archived ? 'inbox' : 'archive'} size={16} />
                {archived ? 'Move to inbox' : 'Archive'}
              </button>
            ) : null}
            <button
              type="button"
              role="menuitem"
              className={menuItemClass}
              onClick={() => {
                setOpen(false)
                onBlock()
              }}
            >
              <Icon name="ban" size={16} />
              {blocked ? 'Unblock' : 'Block'}
            </button>
            <button
              type="button"
              role="menuitem"
              className={cx(menuItemClass, 'text-n-danger hover:text-n-danger')}
              onClick={() => {
                setOpen(false)
                onReport()
              }}
            >
              <Icon name="flag" size={16} />
              Report
            </button>
          </div>
        ) : null}
      </div>
    </div>
  )
}

function TimelineEntry({
  item,
  previous,
  thread,
  receipt,
  onRetry,
  onDiscard,
}: {
  item: TimelineItem
  previous: TimelineItem | null
  thread: InboxThread
  receipt: 'Seen' | 'Sent' | null
  onRetry: (item: OutboxItem) => void
  onDiscard: (clientId: string) => void
}) {
  const [showOriginal, setShowOriginal] = useState(false)
  const fromBusiness = item.kind === 'pending' || item.message.senderRole === 'business'
  const prevFromBusiness = previous ? previous.kind === 'pending' || previous.message.senderRole === 'business' : null
  const startsRun = prevFromBusiness !== fromBusiness

  if (item.kind === 'pending') {
    const p = item.item
    return (
      <div className="flex flex-col items-end">
        {startsRun ? <RunLabel align="right">{thread.businessName}</RunLabel> : null}
        <div
          className={cx(
            'max-w-[85%] rounded-2xl rounded-br-md px-3.5 py-2 text-sm leading-5 whitespace-pre-wrap break-words md:max-w-[70%]',
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

  if (m.senderRole === 'business') {
    return (
      <div className="flex flex-col items-end">
        {startsRun ? <RunLabel align="right">{thread.businessName}</RunLabel> : null}
        <div className="max-w-[85%] rounded-2xl rounded-br-md bg-n-accent px-3.5 py-2 text-sm leading-5 whitespace-pre-wrap break-words text-white md:max-w-[70%]">
          {m.text}
        </div>
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

  const translation = businessSideTranslation(m, thread.businessLanguage)
  const shown = translation && !showOriginal ? translation.text : m.text
  return (
    <div className="flex flex-col items-start">
      <div className="max-w-[85%] rounded-2xl rounded-bl-md border border-n-line bg-n-surface px-3.5 py-2 text-sm leading-5 whitespace-pre-wrap break-words text-n-ink md:max-w-[70%]">
        {shown}
      </div>
      <p className="mt-1 flex flex-wrap items-center gap-x-1 text-xs text-n-subtle">
        <span>{time}</span>
        {translation ? (
          <>
            <span aria-hidden>·</span>
            <span>
              {showOriginal
                ? 'Original'
                : translation.from
                  ? `Translated from ${translation.from}`
                  : 'Translated'}
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

const composerFieldClass = fieldClass.replace('mt-1.5 ', '')

function Composer({ businessName, onSend }: { businessName: string; onSend: (text: string) => void }) {
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
          <span className="sr-only">Reply as {businessName}</span>
          <textarea
            ref={area}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            rows={1}
            placeholder={`Reply as ${businessName}…`}
            aria-invalid={over || undefined}
            className={cx(composerFieldClass, 'max-h-40 resize-none leading-5', over ? 'border-n-danger focus:border-n-danger' : '')}
          />
        </label>
        <Button type="submit" variant="primary" icon="send" disabled={!canSend} aria-label="Send" className="max-md:h-11">
          <span className="max-sm:sr-only">Send</span>
        </Button>
      </div>
      <div className="mt-1.5 flex items-center justify-between gap-3 text-xs text-n-subtle">
        <span className="max-md:hidden">Enter to send · Shift+Enter for a new line · Translated for the traveler</span>
        <span className="md:hidden">Translated for the traveler</span>
        <span className={cx('tabular-nums', over ? 'font-medium text-n-danger' : length > BUSINESS_MESSAGE_MAX - 200 ? '' : 'invisible')}>
          {over ? `${length - BUSINESS_MESSAGE_MAX} over · ` : ''}
          {length}/{BUSINESS_MESSAGE_MAX}
        </span>
      </div>
    </form>
  )
}

function ConfirmStatusDialog({
  open,
  mode,
  name,
  busy,
  onClose,
  onConfirm,
}: {
  open: boolean
  mode: 'block' | 'unblock'
  name: string
  busy: boolean
  onClose: () => void
  onConfirm: () => void
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={mode === 'block' ? `Block ${name}?` : `Unblock ${name}?`}
      description={
        mode === 'block'
          ? `${name} won’t be able to send you messages, and your team can’t reply until you unblock. They aren’t told they were blocked.`
          : `${name} will be able to message you again, and your team can reply.`
      }
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant={mode === 'block' ? 'danger' : 'primary'} loading={busy} onClick={onConfirm}>
            {mode === 'block' ? 'Block' : 'Unblock'}
          </Button>
        </>
      }
    />
  )
}

function ReportDialog({
  open,
  name,
  busy,
  onClose,
  onSubmit,
}: {
  open: boolean
  name: string
  busy: boolean
  onClose: () => void
  onSubmit: (reason: string) => void
}) {
  const [reason, setReason] = useState('')
  const clean = reason.replace(/\s+/g, ' ').trim()
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={`Report ${name}`}
      description="Tell us what’s wrong — spam, abuse, scams. The NessaChat team reviews every report. Reporting doesn’t block the conversation."
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

/**
 * The callables require a verified email for staff. The dashboard already
 * gates on one, so this is usually a stale sign-in token: refresh it.
 */
function VerifyEmailNotice({ businessName, onDone }: { businessName: string; onDone: () => void }) {
  const [state, setState] = useState<'idle' | 'busy' | 'sent' | 'still'>('idle')
  const check = async () => {
    setState('busy')
    try {
      const user = getFirebaseClient().auth.currentUser
      await user?.reload()
      if (user?.emailVerified) {
        await user.getIdToken(true)
        onDone()
        return
      }
      setState('still')
    } catch {
      setState('still')
    }
  }
  const resend = async () => {
    setState('busy')
    try {
      const user = getFirebaseClient().auth.currentUser
      if (user && !user.isAnonymous) await sendEmailVerification(user, AUTH_EMAIL_ACTION_CODE_SETTINGS)
      setState('sent')
    } catch {
      setState('still')
    }
  }
  return (
    <Notice tone="warn" title="Verify your email to reply">
      <p>
        To reply as {businessName}, your account’s email address must be verified.
        {state === 'sent' ? ' We sent you a new link — open it, then press “I’ve verified”.' : ''}
        {state === 'still' ? ' It isn’t verified yet — open the link in the email first.' : ''}
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        <Button size="sm" variant="primary" loading={state === 'busy'} onClick={() => void check()}>
          I’ve verified
        </Button>
        <Button size="sm" onClick={() => void resend()} disabled={state === 'busy'}>
          Send a new link
        </Button>
      </div>
    </Notice>
  )
}
