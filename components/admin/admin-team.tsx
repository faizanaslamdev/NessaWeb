'use client'

import { useCallback, useEffect, useState, type FormEvent } from 'react'

import {
  accountButtonClass,
  accountCardClass,
  accountFieldClass,
} from '@/components/account/account-shell'
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

  if (state.kind === 'loading') return <p className="text-center text-sm text-gray-400">Loading…</p>
  if (state.kind === 'denied' || state.kind === 'error') {
    return (
      <div className={`${accountCardClass} text-center`}>
        <p className={`text-sm ${state.kind === 'denied' ? 'text-gray-300' : 'text-red-300'}`}>{state.message}</p>
      </div>
    )
  }

  const superCount = state.admins.filter(a => a.role === 'super_admin').length

  return (
    <div className="space-y-4">
      {notice ? (
        <p role={notice.kind === 'error' ? 'alert' : 'status'} className={`text-center text-sm ${notice.kind === 'ok' ? 'text-emerald-300' : 'text-red-400'}`}>
          {notice.text}
        </p>
      ) : null}

      <section aria-label="Admin team" className={accountCardClass}>
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          Admin team ({state.admins.length})
        </p>
        <ul className="space-y-2">
          {state.admins.map(a => {
            const isMe = a.uid === state.me
            const lastSuper = a.role === 'super_admin' && superCount <= 1
            const busy = busyUid === a.uid
            return (
              <li key={a.uid} data-admin-email={a.email} className="space-y-2 rounded-xl border border-white/10 bg-black/30 px-3 py-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">
                      {a.email || a.uid}
                      {isMe ? <span className="ml-1.5 text-[11px] font-normal text-gray-500">(you)</span> : null}
                    </p>
                    <p className="text-[11px] text-gray-500">
                      Added {formatDate(a.addedAt)}
                      {a.addedBy === 'bootstrap-script' ? ' · initial setup' : a.addedByEmail ? ` by ${a.addedByEmail}` : ''}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                      a.role === 'super_admin' ? 'bg-violet-500/20 text-violet-200' : 'bg-white/10 text-gray-300'
                    }`}
                  >
                    {ADMIN_ROLE_LABELS[a.role]}
                  </span>
                </div>

                {isMe ? (
                  <p className="text-[11px] text-gray-600">Another Super Admin can change or remove your access.</p>
                ) : confirmUid === a.uid ? (
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="text-gray-300">Remove admin access for {a.email}?</span>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void run(a.uid, () => revokeAdmin(a.uid), `Removed ${a.email}.`)}
                      className="rounded-lg bg-red-600 px-3 py-1 font-semibold text-white hover:bg-red-500 disabled:opacity-50"
                    >
                      {busy ? 'Removing…' : 'Confirm remove'}
                    </button>
                    <button type="button" onClick={() => setConfirmUid(null)} className="text-gray-400 hover:text-gray-200">
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-3 text-xs">
                    <label className="flex items-center gap-1.5 text-gray-400">
                      Role
                      <select
                        aria-label={`Role for ${a.email}`}
                        value={a.role}
                        disabled={busy || lastSuper}
                        onChange={e => {
                          const role = e.target.value as AdminRole
                          void run(a.uid, () => changeAdminRole(a.uid, role), `${a.email} is now ${ADMIN_ROLE_LABELS[role]}.`)
                        }}
                        className="rounded-md border border-white/10 bg-black/40 px-2 py-1 text-xs text-white disabled:opacity-50"
                      >
                        <option value="admin">Admin</option>
                        <option value="super_admin">Super Admin</option>
                      </select>
                    </label>
                    <button
                      type="button"
                      disabled={busy || lastSuper}
                      onClick={() => setConfirmUid(a.uid)}
                      className="text-red-300 hover:text-red-200 disabled:opacity-40"
                    >
                      Remove
                    </button>
                    {lastSuper ? <span className="text-[11px] text-gray-600">Last Super Admin</span> : null}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      </section>

      <AddAdminForm onAdded={async email => {
        setNotice({ kind: 'ok', text: `Added ${email}.` })
        await load()
      }} />

      <section aria-label="Admin audit log" className={accountCardClass}>
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Recent changes</p>
        {state.audit.length === 0 ? (
          <p className="text-xs text-gray-500">No changes recorded yet.</p>
        ) : (
          <ul className="space-y-1.5">
            {state.audit.map(entry => (
              <li key={entry.id} className="text-xs leading-5 text-gray-300">
                <span className="text-gray-500">{formatDate(entry.at)} · </span>
                {describeAuditEntry(entry)}
                {entry.note ? <span className="text-gray-500"> — “{entry.note}”</span> : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function AddAdminForm({ onAdded }: { onAdded: (email: string) => Promise<void> }) {
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
    <form onSubmit={e => void onSubmit(e)} className={accountCardClass} noValidate aria-label="Add admin">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Add an admin</p>
      <p className="text-[11px] leading-4 text-gray-600">
        They need an existing Nessa account with a verified email. Access applies on their next action — no redeploy.
      </p>
      <label className="block text-left text-xs text-gray-400">
        Account email
        <input value={email} onChange={e => setEmail(e.target.value)} type="email" autoComplete="off" className={accountFieldClass} required />
      </label>
      <fieldset className="text-left">
        <legend className="text-xs text-gray-400">Role</legend>
        <div className="mt-1 grid gap-2">
          {(['admin', 'super_admin'] as const).map(r => (
            <label key={r} className={`flex cursor-pointer gap-2 rounded-lg border px-3 py-2 text-xs ${role === r ? 'border-violet-500 bg-violet-500/10' : 'border-white/10 bg-black/30'}`}>
              <input type="radio" name="admin-role" value={r} checked={role === r} onChange={() => setRole(r)} className="mt-0.5 accent-violet-500" />
              <span>
                <span className="block font-semibold text-white">{ADMIN_ROLE_LABELS[r]}</span>
                <span className="text-gray-400">{ADMIN_ROLE_DESCRIPTIONS[r]}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <label className="block text-left text-xs text-gray-400">
        Note (optional, kept in the audit log)
        <input value={note} onChange={e => setNote(e.target.value)} maxLength={300} className={accountFieldClass} />
      </label>
      {error ? <p role="alert" className="text-sm text-red-400">{error}</p> : null}
      <button type="submit" disabled={busy} className={accountButtonClass}>
        {busy ? 'Adding…' : 'Add admin'}
      </button>
    </form>
  )
}
