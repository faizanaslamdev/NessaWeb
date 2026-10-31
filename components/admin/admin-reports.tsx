'use client'

/**
 * Admin console → Reports: abuse reports on business ↔ traveler
 * conversations. List (Open / Resolved / All, load more), a report's details
 * with the conversation, and Resolve: Dismiss, or Action with optional
 * "Block this conversation" / "Turn off messaging for this business" and a
 * note. Everything goes through the adminBusinessMessaging callable, which
 * checks the admin role.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'

import { useAdminHref } from '@/components/admin/admin-shell'
import { ShellTitle } from '@/components/dash/app-shell'
import { Icon } from '@/components/dash/icons'
import {
  Badge,
  Button,
  Dialog,
  EmptyState,
  LoadingBlock,
  Notice,
  PageHeader,
  Panel,
  PanelBody,
  PanelHeader,
  Segmented,
  cx,
  fieldClass,
} from '@/components/dash/ui'
import {
  EMPTY_RESOLVE_DRAFT,
  REPORT_FILTERS,
  REPORT_NOTE_MAX,
  applyResolvedReport,
  describeResolution,
  mergeReportPages,
  reportMatchesFilter,
  reportThreadStateLabel,
  reporterLabel,
  type AdminReport,
  type AdminThreadView,
  type ReportStatusFilter,
  type ResolveDraft,
} from '@/lib/admin-reports'
import { getReportThread, listReports, resolveReport } from '@/lib/admin-reports-api'
import { groupByDay, messageTime, shortRelativeTime } from '@/lib/business-messaging'

function when(ms: number | null): string {
  return ms === null ? '—' : new Date(ms).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

type ListState = { reports: AdminReport[]; nextCursor: string | null; loading: boolean; error: string | null; loaded: boolean }

const EMPTY_LIST: ListState = { reports: [], nextCursor: null, loading: true, error: null, loaded: false }

export function AdminReports() {
  const [filter, setFilter] = useState<ReportStatusFilter>('open')
  const [list, setList] = useState<ListState>(EMPTY_LIST)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const seq = useRef(0)

  const load = useCallback(async (status: ReportStatusFilter, cursor: string | null) => {
    const mine = ++seq.current
    setList(s => (cursor ? { ...s, loading: true, error: null } : { ...EMPTY_LIST }))
    try {
      const page = await listReports({ status, cursor })
      if (mine !== seq.current) return
      setList(s => ({
        reports: cursor ? mergeReportPages(s.reports, page.reports) : page.reports,
        nextCursor: page.nextCursor,
        loading: false,
        error: null,
        loaded: true,
      }))
    } catch (e) {
      if (mine !== seq.current) return
      setList(s => ({ ...s, loading: false, loaded: true, error: e instanceof Error ? e.message : 'Couldn’t load reports.' }))
    }
  }, [])

  useEffect(() => {
    void load(filter, null)
  }, [filter, load])

  const selected = useMemo(() => list.reports.find(r => r.id === selectedId) ?? null, [list.reports, selectedId])

  const onResolved = (report: AdminReport) => {
    setList(s => ({ ...s, reports: applyResolvedReport(s.reports, report, filter) }))
    setNotice(report.resolution === 'actioned' ? 'Report resolved — action taken.' : 'Report dismissed.')
    if (!reportMatchesFilter(report, filter)) setSelectedId(null)
  }

  return (
    <>
      <ShellTitle crumbs={[{ label: 'Reports' }]} />
      <PageHeader
        title="Reports"
        description="Conversations between travelers and businesses that someone reported. Read the conversation, then dismiss the report or act on it."
      />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Segmented
          label="Show reports"
          value={filter}
          onChange={f => {
            setFilter(f)
            setSelectedId(null)
            setNotice(null)
          }}
          options={REPORT_FILTERS}
        />
        <Button size="sm" variant="ghost" icon="refresh" onClick={() => void load(filter, null)} disabled={list.loading}>
          Refresh
        </Button>
      </div>
      {notice ? (
        <Notice tone="ok" className="mb-4">
          {notice}
        </Notice>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
        <Panel className={cx('overflow-hidden', selected ? 'max-lg:hidden' : '')} aria-label="Reports">
          {list.error ? (
            <div className="p-4">
              <Notice tone="danger">{list.error}</Notice>
            </div>
          ) : null}
          {!list.loaded ? (
            <LoadingBlock rows={6} label="Loading reports…" />
          ) : !list.reports.length && !list.error ? (
            <EmptyState icon="flag" title={filter === 'open' ? 'No open reports' : 'No reports here'}>
              {filter === 'open' ? 'Nothing waiting for review.' : 'Reports appear here once someone reports a conversation.'}
            </EmptyState>
          ) : (
            <ul className="divide-y divide-n-line-soft">
              {list.reports.map(r => (
                <li key={r.id}>
                  <ReportRow report={r} active={r.id === selectedId} onSelect={() => setSelectedId(r.id)} />
                </li>
              ))}
            </ul>
          )}
          {list.loaded && list.nextCursor ? (
            <div className="flex justify-center border-t border-n-line-soft p-3">
              <Button size="sm" loading={list.loading} onClick={() => void load(filter, list.nextCursor)}>
                Load more
              </Button>
            </div>
          ) : null}
        </Panel>

        {selected ? (
          <ReportDetail key={selected.id} report={selected} onBack={() => setSelectedId(null)} onResolved={onResolved} />
        ) : (
          <Panel className="max-lg:hidden">
            <EmptyState icon="flag" title="Pick a report">
              Choose a report to read the conversation and resolve it.
            </EmptyState>
          </Panel>
        )}
      </div>
    </>
  )
}

function ReportRow({ report, active, onSelect }: { report: AdminReport; active: boolean; onSelect: () => void }) {
  const state = reportThreadStateLabel(report.thread)
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={active ? 'true' : undefined}
      className={cx('block w-full px-4 py-3 text-left transition-colors', active ? 'bg-n-accent-soft' : 'hover:bg-n-hover')}
    >
      <span className="flex items-baseline gap-2">
        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-n-ink">
          {report.thread ? `${report.thread.businessName} · ${report.thread.customerName}` : report.threadId}
        </span>
        <span className="shrink-0 text-xs text-n-subtle tabular-nums">{shortRelativeTime(report.createdAtMs)}</span>
      </span>
      {report.thread?.placeName ? <span className="mt-0.5 block truncate text-xs text-n-subtle">{report.thread.placeName}</span> : null}
      <span className="mt-1 line-clamp-2 block text-[13px] text-n-muted">{report.reason || 'No reason given'}</span>
      <span className="mt-1.5 flex flex-wrap gap-1.5">
        <Badge tone={report.status === 'open' ? 'warn' : 'neutral'}>
          {report.status === 'open' ? 'Open' : report.resolution === 'actioned' ? 'Actioned' : 'Dismissed'}
        </Badge>
        <Badge>By {reporterLabel(report).toLowerCase()}</Badge>
        {state ? <Badge tone="danger">{state}</Badge> : null}
      </span>
    </button>
  )
}

function ReportDetail({
  report,
  onBack,
  onResolved,
}: {
  report: AdminReport
  onBack: () => void
  onResolved: (report: AdminReport) => void
}) {
  const adminHref = useAdminHref()
  const [view, setView] = useState<AdminThreadView | null>(null)
  const [viewError, setViewError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    getReportThread(report.threadId).then(
      v => !cancelled && setView(v),
      e => !cancelled && setViewError(e instanceof Error ? e.message : 'Couldn’t load the conversation.'),
    )
    return () => {
      cancelled = true
    }
  }, [report.threadId])

  const businessName = report.thread?.businessName ?? view?.thread?.businessName ?? 'Business'
  const customerName = report.thread?.customerName ?? view?.thread?.customerName ?? 'Traveler'

  return (
    <div className="min-w-0 space-y-4">
      <div className="lg:hidden">
        <Button size="sm" variant="ghost" icon="chevron-left" onClick={onBack}>
          All reports
        </Button>
      </div>
      <Panel>
        <PanelHeader
          icon="flag"
          title={`${businessName} · ${customerName}`}
          description={report.thread?.placeName || undefined}
          actions={
            report.placeId ? (
              <Link href={adminHref(`places/${encodeURIComponent(report.placeId)}`)} className="text-[13px] font-medium text-n-accent-strong no-underline hover:underline">
                Open Place
              </Link>
            ) : null
          }
        />
        <PanelBody>
          <dl className="grid gap-x-6 gap-y-2 text-[13px] sm:grid-cols-2">
            <Info label="Reported by">
              {reporterLabel(report)} <span className="text-n-subtle">({report.reporterRole === 'business' ? 'staff' : 'traveler'} uid {report.reporterUid || '—'})</span>
            </Info>
            <Info label="Reported">{when(report.createdAtMs)}</Info>
            <Info label="Status">
              {report.status === 'open' ? 'Open' : `Resolved — ${report.resolution === 'actioned' ? 'actioned' : 'dismissed'}`}
            </Info>
            <Info label="Conversation">{reportThreadStateLabel(report.thread) ?? 'Open'}</Info>
            {report.status === 'resolved' ? (
              <>
                <Info label="Resolved">{when(report.resolvedAtMs)}</Info>
                <Info label="Resolved by">{report.resolvedBy ?? '—'}</Info>
              </>
            ) : null}
          </dl>
          <div className="mt-3 rounded-[10px] bg-n-sunken px-3.5 py-2.5 text-[13px] leading-5 text-n-ink-2">
            <p className="font-semibold text-n-ink">Reason</p>
            <p className="mt-0.5 whitespace-pre-wrap">{report.reason || 'No reason given.'}</p>
          </div>
          {report.note ? (
            <div className="mt-2 rounded-[10px] border border-n-line px-3.5 py-2.5 text-[13px] leading-5 text-n-ink-2">
              <p className="font-semibold text-n-ink">Admin note</p>
              <p className="mt-0.5 whitespace-pre-wrap">{report.note}</p>
            </div>
          ) : null}
        </PanelBody>
      </Panel>

      <Panel>
        <PanelHeader icon="chat" title="Conversation" description="Read-only. Newest messages last." />
        <div className="max-h-[480px] overflow-y-auto border-t border-n-line-soft bg-n-surface-2 px-4 py-3">
          {viewError ? (
            <Notice tone="danger">{viewError}</Notice>
          ) : !view ? (
            <LoadingBlock rows={4} label="Loading conversation…" />
          ) : !view.messages.length ? (
            <EmptyState icon="chat" title="No messages" compact />
          ) : (
            <ConversationLog view={view} businessName={businessName} customerName={customerName} />
          )}
        </div>
      </Panel>

      {report.status === 'open' ? (
        <ResolvePanel report={report} businessName={businessName} customerName={customerName} onResolved={onResolved} />
      ) : null}
    </div>
  )
}

function Info({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-n-subtle">{label}</dt>
      <dd className="text-n-ink [overflow-wrap:anywhere]">{children}</dd>
    </div>
  )
}

function ConversationLog({ view, businessName, customerName }: { view: AdminThreadView; businessName: string; customerName: string }) {
  const days = groupByDay(view.messages.map(m => ({ ...m, atMs: m.createdAtMs })))
  return (
    <>
      {days.map(day => (
        <div key={day.key}>
          <div className="my-2 flex items-center gap-3" role="separator" aria-label={day.label}>
            <span className="h-px flex-1 bg-n-line" />
            <span className="text-xs font-medium text-n-subtle">{day.label}</span>
            <span className="h-px flex-1 bg-n-line" />
          </div>
          <ol className="space-y-2">
            {day.items.map(m => {
              const fromBusiness = m.senderRole === 'business'
              const translations = Object.entries(m.translations)
              return (
                <li key={m.id} className={cx('flex flex-col', fromBusiness ? 'items-end' : 'items-start')}>
                  <span className="mb-0.5 px-1 text-[11px] font-medium text-n-subtle">
                    {fromBusiness ? businessName : customerName} · {messageTime(m.createdAtMs)}
                  </span>
                  <div
                    className={cx(
                      'max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-5 whitespace-pre-wrap break-words',
                      fromBusiness ? 'rounded-br-md bg-n-accent text-white' : 'rounded-bl-md border border-n-line bg-n-surface text-n-ink',
                    )}
                  >
                    {m.text}
                  </div>
                  {translations.length ? (
                    <details className="mt-0.5 max-w-[85%] px-1 text-xs text-n-subtle">
                      <summary className="cursor-pointer">Translations</summary>
                      {translations.map(([lang, text]) => (
                        <p key={lang} className="mt-0.5 whitespace-pre-wrap">
                          <span className="font-semibold uppercase">{lang}</span> {text}
                        </p>
                      ))}
                    </details>
                  ) : null}
                </li>
              )
            })}
          </ol>
        </div>
      ))}
    </>
  )
}

function ResolvePanel({
  report,
  businessName,
  customerName,
  onResolved,
}: {
  report: AdminReport
  businessName: string
  customerName: string
  onResolved: (report: AdminReport) => void
}) {
  const [draft, setDraft] = useState<ResolveDraft>(EMPTY_RESOLVE_DRAFT)
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const summary = describeResolution(draft, { businessName, customerName })
  const actioned = draft.resolution === 'actioned'

  const submit = async () => {
    setBusy(true)
    setError(null)
    try {
      const updated = await resolveReport(report.id, draft)
      setConfirming(false)
      onResolved(
        updated ?? {
          ...report,
          status: 'resolved',
          resolution: draft.resolution,
          resolvedAtMs: Date.now(),
          note: draft.note.trim() || null,
        },
      )
    } catch (e) {
      setConfirming(false)
      setError(e instanceof Error ? e.message : 'Couldn’t resolve the report.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Panel>
      <PanelHeader icon="shield" title="Resolve" description="Dismiss when nothing is wrong. Take action to stop abuse." />
      <PanelBody className="space-y-4">
        {error ? <Notice tone="danger">{error}</Notice> : null}
        <Segmented
          label="Resolution"
          value={draft.resolution}
          onChange={resolution => setDraft(d => ({ ...d, resolution }))}
          options={[
            { value: 'dismissed', label: 'Dismiss' },
            { value: 'actioned', label: 'Take action' },
          ]}
        />
        {actioned ? (
          <fieldset className="space-y-2.5">
            <legend className="sr-only">Actions</legend>
            <Check
              checked={draft.blockThread}
              onChange={blockThread => setDraft(d => ({ ...d, blockThread }))}
              label="Block this conversation"
              hint={`No messages between ${businessName} and ${customerName} until the business unblocks it.`}
            />
            <Check
              checked={draft.disableBusinessMessaging}
              onChange={disableBusinessMessaging => setDraft(d => ({ ...d, disableBusinessMessaging }))}
              label="Turn off messaging for this business"
              hint={`Travelers can’t message ${businessName} until its owner turns messaging back on.`}
            />
          </fieldset>
        ) : null}
        <label className="block text-[13px] font-medium text-n-ink-2">
          Note <span className="font-normal text-n-subtle">(optional, for the admin team)</span>
          <textarea
            value={draft.note}
            onChange={e => setDraft(d => ({ ...d, note: e.target.value }))}
            rows={3}
            maxLength={REPORT_NOTE_MAX}
            className={cx(fieldClass, 'resize-y')}
          />
        </label>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button
            variant={summary.destructive ? 'danger' : 'primary'}
            loading={busy && !confirming}
            onClick={() => (summary.destructive ? setConfirming(true) : void submit())}
          >
            {actioned ? 'Resolve with action' : 'Dismiss report'}
          </Button>
        </div>
      </PanelBody>
      <Dialog
        open={confirming}
        onClose={() => !busy && setConfirming(false)}
        title={summary.title}
        description="This changes things for real users right away."
        footer={
          <>
            <Button onClick={() => setConfirming(false)} disabled={busy}>
              Cancel
            </Button>
            <Button variant="danger" loading={busy} onClick={() => void submit()}>
              Confirm
            </Button>
          </>
        }
      >
        <ul className="space-y-2 text-[13px] leading-5 text-n-ink-2">
          {summary.effects.map(effect => (
            <li key={effect} className="flex gap-2">
              <Icon name="alert" size={15} className="mt-0.5 shrink-0 text-n-danger" />
              <span>{effect}</span>
            </li>
          ))}
        </ul>
      </Dialog>
    </Panel>
  )
}

function Check({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean
  onChange: (value: boolean) => void
  label: string
  hint: string
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5 rounded-[10px] border border-n-line px-3 py-2.5 hover:bg-n-hover">
      <input
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        className="mt-0.5 size-4 shrink-0 accent-[#b42318]"
      />
      <span className="min-w-0">
        <span className="block text-[13px] font-medium text-n-ink">{label}</span>
        <span className="block text-xs text-n-subtle">{hint}</span>
      </span>
    </label>
  )
}
