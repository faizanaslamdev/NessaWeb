'use client'

/**
 * Business team: owners invite managers by email for some of their places,
 * change their places and remove them; managers see the team and can leave.
 * Everything goes through `manageBusinessTeam`, which checks the caller's
 * role on the backend — this component only renders.
 *
 * Nessa doesn't send the invitation email yet: the owner shares the link,
 * and the invitee accepts it signed in with the invited email.
 */

import { useCallback, useEffect, useState, type FormEvent } from 'react'

import { accountButtonClass, accountCardClass, accountFieldClass } from '@/components/account/account-shell'
import {
  BusinessActionError,
  getBusinessTeam,
  inviteManager,
  removeTeamMember,
  revokeInvite,
  updateManagerPlaces,
  type BusinessTeam,
  type TeamMember,
} from '@/lib/business'

const linkButton = 'text-[11px] text-violet-400 hover:text-violet-300 disabled:opacity-50'
const quietButton = 'text-[11px] text-gray-400 hover:text-gray-200 disabled:opacity-50'

function errorText(e: unknown, fallback: string): string {
  return e instanceof BusinessActionError ? e.message : fallback
}

function inviteUrl(path: string): string {
  try {
    return new URL(path, window.location.origin).toString()
  } catch {
    return path
  }
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

function formatDate(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}

export function TeamPanel({ businessId, onLeft }: { businessId: string; onLeft?: () => void }) {
  const [team, setTeam] = useState<BusinessTeam | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setTeam(await getBusinessTeam(businessId))
      setError(null)
    } catch (e) {
      setError(errorText(e, 'Could not load the team.'))
    }
  }, [businessId])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async load; state set after the call resolves
    void load()
  }, [load])

  const run = async (key: string, action: () => Promise<unknown>, done?: string) => {
    setBusy(key)
    setError(null)
    setNotice(null)
    try {
      await action()
      if (done) setNotice(done)
      await load()
      return true
    } catch (e) {
      setError(errorText(e, 'Could not save. Please try again.'))
      return false
    } finally {
      setBusy(null)
    }
  }

  if (!team) {
    return (
      <section aria-label="Team" className={accountCardClass}>
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Team</p>
        {error ? <p className="text-xs text-red-300">{error}</p> : <p className="text-xs text-gray-500">Loading team…</p>}
      </section>
    )
  }

  const placeName = (id: string) => team.places.find(p => p.placeId === id)?.name ?? 'Place'
  const placesLabel = (ids: string[]) =>
    team.canManage && ids.length === team.places.length ? 'All places' : ids.map(placeName).join(', ') || 'No places'

  return (
    <section aria-label="Team" className={accountCardClass}>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Team</p>
        {team.canManage ? null : <p className="text-[11px] text-gray-500">Only the owner manages the team.</p>}
      </div>

      <ul className="divide-y divide-white/5" aria-label="Team members">
        {team.members.map(m => (
          <MemberRow
            key={m.uid}
            member={m}
            team={team}
            isYou={m.uid === team.you.uid}
            busy={busy}
            placesLabel={placesLabel}
            onSavePlaces={ids =>
              run(`places:${m.uid}`, () => updateManagerPlaces(businessId, m.uid, ids), 'Places updated.')
            }
            onRemove={() =>
              run(`remove:${m.uid}`, () => removeTeamMember(businessId, m.uid), m.uid === team.you.uid ? undefined : 'Manager removed.').then(
                ok => {
                  if (ok && m.uid === team.you.uid) onLeft?.()
                },
              )
            }
          />
        ))}
      </ul>

      {team.canManage && team.invites.length > 0 ? (
        <div>
          <p className="text-[11px] font-semibold text-gray-400">Invitations</p>
          <ul className="mt-1 divide-y divide-white/5" aria-label="Invitations">
            {team.invites.map(i => (
              <li key={i.inviteId} className="flex flex-wrap items-center justify-between gap-2 py-2 text-xs">
                <span className="min-w-0">
                  <span className="block text-gray-200">{i.email}</span>
                  <span className={`block text-[11px] ${i.status === 'expired' ? 'text-amber-300' : 'text-gray-500'}`}>
                    Manager · {placesLabel(i.placeIds)} ·{' '}
                    {i.status === 'expired' ? 'expired — invite again to renew' : `expires ${formatDate(i.expiresAt)}`}
                  </span>
                </span>
                <span className="flex shrink-0 gap-3">
                  {i.status !== 'expired' ? (
                    <button
                      type="button"
                      className={linkButton}
                      onClick={() =>
                        void copyText(inviteUrl(`/business/invite/${i.inviteId}`)).then(ok =>
                          setNotice(ok ? `Invitation link for ${i.email} copied.` : 'Copy blocked by the browser.'),
                        )
                      }
                    >
                      Copy link
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className={quietButton}
                    disabled={busy !== null}
                    onClick={() => void run(`revoke:${i.inviteId}`, () => revokeInvite(businessId, i.inviteId), 'Invitation cancelled.')}
                  >
                    {busy === `revoke:${i.inviteId}` ? 'Cancelling…' : 'Cancel'}
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {team.canManage ? (
        <InviteForm
          businessId={businessId}
          places={team.places}
          inviteDays={team.limits.inviteDays}
          onInvited={async message => {
            setNotice(message)
            await load()
          }}
        />
      ) : null}

      <p className="text-[11px] leading-4 text-gray-600">
        Managers can edit the details, pin chat messages, print QR codes and see stats for the places you choose. Only owners manage the
        team. To change an owner, contact Nessa.
      </p>
      {error ? (
        <p role="alert" className="text-xs text-red-400">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p role="status" className="text-xs text-emerald-300">
          {notice}
        </p>
      ) : null}
    </section>
  )
}

function MemberRow({
  member,
  team,
  isYou,
  busy,
  placesLabel,
  onSavePlaces,
  onRemove,
}: {
  member: TeamMember
  team: BusinessTeam
  isYou: boolean
  busy: string | null
  placesLabel: (ids: string[]) => string
  onSavePlaces: (ids: string[]) => Promise<boolean>
  onRemove: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [picked, setPicked] = useState<string[]>(member.placeIds)
  const isManager = member.role === 'staff'

  return (
    <li className="py-2 text-xs" data-member={member.email ?? member.uid}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="min-w-0">
          <span className="block text-gray-200">
            {member.name || member.email || 'Team member'}
            {isYou ? <span className="text-gray-500"> (you)</span> : null}
          </span>
          <span className="block text-[11px] text-gray-500">
            {isManager ? 'Manager' : 'Owner'} · {isManager ? placesLabel(member.placeIds) : 'All places'}
            {member.name && member.email ? ` · ${member.email}` : ''}
          </span>
        </span>
        {isManager && team.canManage ? (
          <span className="flex shrink-0 gap-3">
            <button type="button" className={linkButton} onClick={() => setEditing(v => !v)} aria-expanded={editing}>
              {editing ? 'Close' : 'Edit places'}
            </button>
            {confirming ? (
              <button type="button" className="text-[11px] text-red-300 hover:text-red-200" disabled={busy !== null} onClick={onRemove}>
                {busy === `remove:${member.uid}` ? 'Removing…' : 'Confirm remove'}
              </button>
            ) : (
              <button type="button" className={quietButton} onClick={() => setConfirming(true)}>
                Remove
              </button>
            )}
          </span>
        ) : isManager && isYou ? (
          confirming ? (
            <button type="button" className="text-[11px] text-red-300 hover:text-red-200" disabled={busy !== null} onClick={onRemove}>
              {busy === `remove:${member.uid}` ? 'Leaving…' : 'Confirm leave'}
            </button>
          ) : (
            <button type="button" className={quietButton} onClick={() => setConfirming(true)}>
              Leave team
            </button>
          )
        ) : null}
      </div>
      {editing ? (
        <div className="mt-2 space-y-2 rounded-lg border border-white/10 p-2">
          <PlacePicker places={team.places} picked={picked} onChange={setPicked} name={`places-${member.uid}`} />
          <button
            type="button"
            disabled={busy !== null || picked.length === 0}
            onClick={() => void onSavePlaces(picked).then(ok => ok && setEditing(false))}
            className={`${accountButtonClass} !w-auto !px-4 !py-1.5 text-xs`}
          >
            {busy === `places:${member.uid}` ? 'Saving…' : 'Save places'}
          </button>
        </div>
      ) : null}
    </li>
  )
}

function PlacePicker({
  places,
  picked,
  onChange,
  name,
}: {
  places: { placeId: string; name: string }[]
  picked: string[]
  onChange: (ids: string[]) => void
  name: string
}) {
  return (
    <fieldset className="space-y-1">
      <legend className="text-[11px] text-gray-400">Places they can manage</legend>
      {places.map(p => (
        <label key={p.placeId} className="flex items-center gap-2 text-xs text-gray-200">
          <input
            type="checkbox"
            name={name}
            value={p.placeId}
            checked={picked.includes(p.placeId)}
            onChange={e =>
              onChange(e.target.checked ? [...picked, p.placeId] : picked.filter(id => id !== p.placeId))
            }
            className="accent-violet-500"
          />
          {p.name}
        </label>
      ))}
    </fieldset>
  )
}

function InviteForm({
  businessId,
  places,
  inviteDays,
  onInvited,
}: {
  businessId: string
  places: { placeId: string; name: string }[]
  inviteDays: number
  onInvited: (message: string) => Promise<void>
}) {
  const [email, setEmail] = useState('')
  const [picked, setPicked] = useState<string[]>(places.length === 1 ? [places[0].placeId] : [])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [link, setLink] = useState<{ email: string; url: string } | null>(null)

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const res = await inviteManager(businessId, email, picked)
      const url = inviteUrl(res.path)
      setLink({ email: email.trim(), url })
      setEmail('')
      await onInvited(res.refreshed ? 'Invitation updated and renewed.' : 'Invitation created.')
    } catch (e) {
      setError(errorText(e, 'Could not create the invitation.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-2 rounded-lg border border-white/10 p-3">
      <form onSubmit={e => void onSubmit(e)} className="space-y-2" noValidate aria-label="Invite a manager">
        <label className="block text-left text-xs text-gray-400">
          Invite a manager by email
          <input
            type="email"
            autoComplete="off"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="front.desk@yourplace.com"
            className={accountFieldClass}
          />
        </label>
        <PlacePicker places={places} picked={picked} onChange={setPicked} name="invite-places" />
        <button
          type="submit"
          disabled={busy || !email.trim() || picked.length === 0}
          className={`${accountButtonClass} !w-auto !px-4 !py-2 text-xs`}
        >
          {busy ? 'Creating…' : 'Create invitation'}
        </button>
      </form>
      {error ? (
        <p role="alert" className="text-xs text-red-400">
          {error}
        </p>
      ) : null}
      {link ? (
        <div className="space-y-1 rounded-lg bg-white/5 p-2 text-[11px] text-gray-300" data-testid="invite-link">
          <p>
            Send this link to <span className="text-white">{link.email}</span>. They sign in (or create an account) with that email to
            accept. It works for {inviteDays} days.
          </p>
          <p className="break-all font-mono text-gray-400">{link.url}</p>
          <button
            type="button"
            className={linkButton}
            onClick={() => void copyText(link.url)}
          >
            Copy link
          </button>
        </div>
      ) : null}
    </div>
  )
}
