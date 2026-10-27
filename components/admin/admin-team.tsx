'use client'

import { useCallback, useEffect, useState, type FormEvent } from 'react'

import { ShellTitle } from '@/components/dash/app-shell'
import {
  Avatar,
  Badge,
  Button,
  Dialog,
  EmptyState,
  Field,
  LoadingBlock,
  Notice,
  PageHeader,
  Panel,
  PanelHeader,
  cx,
  fieldClass,
  timeAgo,
} from '@/components/dash/ui'
import {
  ADMIN_ROLE_DESCRIPTIONS,
  ADMIN_ROLE_LABELS,
  AdminActionError,
  changeAdminRole,
  describeAuditEntry,
  grantAdmin,
  isValidAdminEmail,
  listAdminAudit,
  listAdmins,
  revokeAdmin,
  type AdminAuditEntry,
  type AdminEntry,
  type AdminRole,
} from '@/lib/admin'

type State =
  | { kind: 'loading' }
  | { kind: 'ready'; admins: AdminEntry[]; me: string; audit: AdminAuditEntry[] }
  | { kind: 'denied'; message: string }
  | { kind: 'error'; message: string }

type Notice = { kind: 'ok' | 'error'; text: string }

function formatDate(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function errorText(e: unknown, fallback: string): string {
  return e instanceof AdminActionError ? e.message : fallback
}

/**
 * Super Admin page: the admin team, adding admins by account email, role
 * changes, removal and the audit log. Every action goes through the
 * `manageAdmins` callable, which re-checks Super Admin rights, refuses to
 * remove the last Super Admin and writes the audit entry.
 */
export function AdminTeam() {
  const [state, setState] = useState<State>({ kind: 'loading' })
  const [notice, setNotice] = useState<Notice | null>(null)
  const [busyUid, setBusyUid] = useState<string | null>(null)
  const [confirmUid, setConfirmUid] = useState<string | null>(null)
  const [addOpen, setAddOpen] = useState(false)

  const load = useCallback(async () => {
    try {
      const [{ admins, me }, audit] = await Promise.all([listAdmins(), listAdminAudit(50)])
      setState({ kind: 'ready', admins, me, audit })
    } catch (e) {
      const code = e instanceof AdminActionError ? e.code : ''
      setState(
        code.includes('permission-denied') || code.includes('unauthenticated') || code.includes('email-not-verified')
          ? { kind: 'denied', message: errorText(e, 'Only Super Admins can manage the admin team.') }
          : { kind: 'error', message: errorText(e, 'Could not load the admin team.') },
      )
    }
  }, [])

  useEffect(() => {
    // Initial load; setState happens after the async calls resolve.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load()
  }, [load])

  const run = async (uid: string, action: () => Promise<void>, success: string) => {
    setBusyUid(uid)
    setNotice(null)
    try {
      await action()
      setNotice({ kind: 'ok', text: success })
      setConfirmUid(null)
      await load()
    } catch (e) {
      setNotice({ kind: 'error', text: errorText(e, 'That did not work. Please try again.') })
    } finally {
      setBusyUid(null)
    }
  }

  const header = (
    <>
      <ShellTitle crumbs={[{ label: 'Admin team' }]} />
      <PageHeader
        title="Admin team"
        description="People who can open this console. Admins review claims and manage places; Super Admins also manage the team."
        actions={
          state.kind === 'ready' ? (
            <Button variant="primary" icon="plus" onClick={() => setAddOpen(true)}>
              Add admin
            </Button>
          ) : null
        }
      />
    </>
  )

  if (state.kind === 'loading')
    return (
      <>
        {header}
        <Panel>
          <LoadingBlock rows={4} label="Loading the admin team…" />
        </Panel>
      </>
    )
  if (state.kind === 'denied' || state.kind === 'error') {
    return (
      <>
        {header}
        <Notice tone={state.kind === 'denied' ? 'warn' : 'danger'}>{state.message}</Notice>
      </>
    )
  }

  const superCount = state.admins.filter(a => a.role === 'super_admin').length
  const confirming = state.admins.find(a => a.uid === confirmUid) ?? null

  return (
    <>
      {header}
      {notice ? (
        <Notice tone={notice.kind === 'ok' ? 'ok' : 'danger'} className="mb-4">
          {notice.text}
        </Notice>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <Panel aria-label="Admin team">
          <PanelHeader title={`Members (${state.admins.length})`} />
          <ul className="divide-y divide-n-line-soft border-t border-n-line-soft">
            {state.admins.map(a => {
              const isMe = a.uid === state.me
              const lastSuper = a.role === 'super_admin' && superCount <= 1
              const busy = busyUid === a.uid
              return (
                <li key={a.uid} data-admin-email={a.email} className="flex flex-wrap items-center gap-3 px-5 py-3.5 max-sm:px-4">
                  <Avatar name={a.email || a.uid} size={36} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-n-ink">
                      {a.email || a.uid}
                      {isMe ? <span className="font-normal text-n-muted"> (you)</span> : null}
                    </p>
                    <p className="truncate text-[13px] text-n-muted">
                      Added {formatDate(a.addedAt)}
                      {a.addedBy === 'bootstrap-script' ? ' · initial setup' : a.addedByEmail ? ` by ${a.addedByEmail}` : ''}
                    </p>
                  </div>
                  {isMe ? (
                    <Badge tone={a.role === 'super_admin' ? 'accent' : 'neutral'}>{ADMIN_ROLE_LABELS[a.role]}</Badge>
                  ) : (
                    <div className="flex items-center gap-2 max-sm:w-full max-sm:justify-end">
                      <select
                        aria-label={`Role for ${a.email}`}
                        value={a.role}
                        disabled={busy || lastSuper}
                        onChange={e => {
                          const role = e.target.value as AdminRole
                          void run(a.uid, () => changeAdminRole(a.uid, role), `${a.email} is now ${ADMIN_ROLE_LABELS[role]}.`)
                        }}
                        className={cx(fieldClass, 'mt-0 w-auto py-1.5')}
                      >
                        <option value="admin">Admin</option>
                        <option value="super_admin">Super Admin</option>
                      </select>
                      <Button size="sm" variant="quiet-danger" disabled={busy || lastSuper} onClick={() => setConfirmUid(a.uid)}>
                        Remove
                      </Button>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
          <p className="rounded-b-[14px] border-t border-n-line-soft bg-n-surface-2 px-5 py-3 text-xs text-n-muted max-sm:px-4">
            There is always at least one Super Admin. Another Super Admin can change or remove your own access.
          </p>
        </Panel>

        <Panel aria-label="Admin audit log" className="self-start">
          <PanelHeader title="Recent changes" description="Changes to the admin team." />
          {state.audit.length === 0 ? (
            <EmptyState icon="log" title="No changes recorded yet" compact />
          ) : (
            <ol className="divide-y divide-n-line-soft border-t border-n-line-soft">
              {state.audit.map(entry => (
                <li key={entry.id} className="px-5 py-3 text-sm leading-5 text-n-ink-2 max-sm:px-4">
                  {describeAuditEntry(entry)}
                  <span className="mt-0.5 block text-xs text-n-subtle">
                    {timeAgo(entry.at)}
                    {entry.note ? ` · “${entry.note}”` : ''}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </Panel>
      </div>

      <Dialog
        open={Boolean(confirming)}
        onClose={() => setConfirmUid(null)}
        title={`Remove ${confirming?.email ?? 'this admin'}?`}
        description="They lose access to the admin console right away."
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmUid(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={confirming ? busyUid === confirming.uid : false}
              onClick={() => confirming && void run(confirming.uid, () => revokeAdmin(confirming.uid), `Removed ${confirming.email}.`)}
            >
              Remove access
            </Button>
          </>
        }
      />

      <Dialog open={addOpen} onClose={() => setAddOpen(false)} title="Add an admin" description="They need an existing Nessa account with a verified email. Access applies on their next action.">
        <AddAdminForm
          onCancel={() => setAddOpen(false)}
          onAdded={async email => {
            setAddOpen(false)
            setNotice({ kind: 'ok', text: `Added ${email}.` })
            await load()
          }}
        />
      </Dialog>
    </>
  )
}

function AddAdminForm({ onAdded, onCancel }: { onAdded: (email: string) => Promise<void>; onCancel: () => void }) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<AdminRole>('admin')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    if (!isValidAdminEmail(email)) {
      setError('Enter the email address of an existing Nessa account.')
      return
    }
    setBusy(true)
    try {
      await grantAdmin(email, role, note)
      const added = email.trim().toLowerCase()
      setEmail('')
      setNote('')
      setRole('admin')
      await onAdded(added)
    } catch (e) {
      setError(errorText(e, 'Could not add this admin.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={e => void onSubmit(e)} className="space-y-4" noValidate aria-label="Add admin">
      <Field label="Account email">
        <input value={email} onChange={e => setEmail(e.target.value)} type="email" autoComplete="off" className={fieldClass} required />
      </Field>
      <fieldset>
        <legend className="text-[13px] font-medium text-n-ink-2">Role</legend>
        <div className="mt-1.5 grid gap-2">
          {(['admin', 'super_admin'] as const).map(r => (
            <label
              key={r}
              className={cx(
                'flex cursor-pointer gap-3 rounded-[10px] border px-3 py-2.5 text-sm',
                role === r ? 'border-n-accent bg-n-accent-soft ring-1 ring-n-accent' : 'border-n-line-strong hover:border-n-faint',
              )}
            >
              <input type="radio" name="admin-role" value={r} checked={role === r} onChange={() => setRole(r)} className="mt-1 accent-[#5b46e5]" />
              <span>
                <span className="block font-semibold text-n-ink">{ADMIN_ROLE_LABELS[r]}</span>
                <span className="text-[13px] text-n-muted">{ADMIN_ROLE_DESCRIPTIONS[r]}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <Field label="Note" hint="Optional, kept in the audit log.">
        <input value={note} onChange={e => setNote(e.target.value)} maxLength={300} className={fieldClass} />
      </Field>
      {error ? <Notice tone="danger">{error}</Notice> : null}
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" loading={busy}>
          Add admin
        </Button>
      </div>
    </form>
  )
}
