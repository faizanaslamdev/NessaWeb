'use client'

/**
 * Business team: owners invite managers by email for some of their places,
 * change their places and remove them; managers see the team and can leave.
 * Everything goes through `manageBusinessTeam`, which checks the caller's
 * role on the backend (owners, managers, Nessa admins) — this only renders.
 *
 * Nessa doesn't send the invitation email yet: the owner shares the link,
 * and the invitee accepts it signed in with the invited email.
 */

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'

import {
  Avatar,
  Badge,
  Button,
  CopyButton,
  Dialog,
  EmptyState,
  Field,
  LoadingBlock,
  Notice,
  Panel,
  PanelHeader,
  cx,
  fieldClass,
  formatDate,
  labelClass,
} from '@/components/dash/ui'
import { ADMIN_HOSTNAME_PREFIX } from '@/lib/account/constants'
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
import { PLACE_PUBLIC_ORIGIN } from '@/lib/place-slug'

function errorText(e: unknown, fallback: string): string {
  return e instanceof BusinessActionError ? e.message : fallback
}

/** Invite links always point at the public site (never the admin host). */
export function inviteUrl(path: string): string {
  try {
    const origin =
      typeof window === 'undefined' || window.location.hostname.startsWith(ADMIN_HOSTNAME_PREFIX)
        ? PLACE_PUBLIC_ORIGIN
        : window.location.origin
    return new URL(path, origin).toString()
  } catch {
    return path
  }
}

export function TeamPanel({
  businessId,
  onLeft,
  onLoaded,
}: {
  businessId: string
  onLeft?: () => void
  onLoaded?: (team: BusinessTeam) => void
}) {
  const [team, setTeam] = useState<BusinessTeam | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [editing, setEditing] = useState<TeamMember | null>(null)
  const [removing, setRemoving] = useState<TeamMember | null>(null)
  const onLoadedRef = useRef(onLoaded)
  useEffect(() => {
    onLoadedRef.current = onLoaded
  }, [onLoaded])

  const load = useCallback(async () => {
    try {
      const t = await getBusinessTeam(businessId)
      setTeam(t)
      onLoadedRef.current?.(t)
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
      <Panel aria-label="Team">
        <PanelHeader title="Team" />
        {error ? (
          <div className="px-5 pb-5">
            <Notice tone="danger">{error}</Notice>
          </div>
        ) : (
          <LoadingBlock rows={3} label="Loading team…" />
        )}
      </Panel>
    )
  }

  const placeName = (id: string) => team.places.find(p => p.placeId === id)?.name ?? 'Place'
  const placesLabel = (ids: string[]) =>
    team.canManage && ids.length === team.places.length ? 'All places' : ids.map(placeName).join(', ') || 'No places'
  const me = team.members.find(m => m.uid === team.you.uid)

  return (
    <div className="space-y-6">
      <Panel aria-label="Team">
        <PanelHeader
          title="Team"
          description={
            team.canManage
              ? 'Owners manage everything. Managers handle the places you choose.'
              : 'Only an owner can invite or remove people.'
          }
          actions={
            team.canManage ? (
              <Button variant="primary" icon="plus" onClick={() => setInviteOpen(true)}>
                Invite manager
              </Button>
            ) : null
          }
        />
        {error || notice ? (
          <div className="px-5 pb-3 max-sm:px-4">
            {error ? <Notice tone="danger">{error}</Notice> : null}
            {notice ? <Notice tone="ok">{notice}</Notice> : null}
          </div>
        ) : null}
        <ul className="divide-y divide-n-line-soft border-t border-n-line-soft" aria-label="Team members">
          {team.members.map(m => {
            const isYou = m.uid === team.you.uid
            const isManager = m.role === 'staff'
            return (
              <li key={m.uid} data-member={m.email ?? m.uid} className="flex flex-wrap items-center gap-3 px-5 py-3 max-sm:px-4">
                <Avatar name={m.name || m.email || '?'} size={36} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-n-ink">
                    {m.name || m.email || 'Team member'}
                    {isYou ? <span className="font-normal text-n-muted"> (you)</span> : null}
                  </span>
                  <span className="block truncate text-[13px] text-n-muted">
                    {isManager ? placesLabel(m.placeIds) : 'All places'}
                    {m.name && m.email ? ` · ${m.email}` : ''}
                  </span>
                </span>
                <Badge tone={isManager ? 'neutral' : 'accent'}>{isManager ? 'Manager' : 'Owner'}</Badge>
                {isManager && team.canManage ? (
                  <span className="flex shrink-0 gap-1 max-sm:w-full max-sm:justify-end">
                    <Button size="sm" variant="ghost" onClick={() => setEditing(m)}>
                      Edit places
                    </Button>
                    <Button size="sm" variant="quiet-danger" onClick={() => setRemoving(m)}>
                      Remove
                    </Button>
                  </span>
                ) : isManager && isYou ? (
                  <Button size="sm" variant="quiet-danger" onClick={() => setRemoving(m)}>
                    Leave team
                  </Button>
                ) : null}
              </li>
            )
          })}
        </ul>
        {team.canManage && team.invites.length > 0 ? (
          <div className="border-t border-n-line-soft">
            <p className="px-5 pt-3 text-xs font-semibold tracking-[0.04em] text-n-muted uppercase max-sm:px-4">Invitations</p>
            <ul className="divide-y divide-n-line-soft" aria-label="Invitations">
              {team.invites.map(i => (
                <li key={i.inviteId} className="flex flex-wrap items-center gap-3 px-5 py-3 max-sm:px-4">
                  <span
                    aria-hidden
                    className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-dashed border-n-line-strong text-xs text-n-subtle"
                  >
                    @
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-n-ink">{i.email}</span>
                    <span className={cx('block truncate text-[13px]', i.status === 'expired' ? 'text-n-warn' : 'text-n-muted')}>
                      {placesLabel(i.placeIds)} ·{' '}
                      {i.status === 'expired' ? 'expired — invite again to renew' : `expires ${formatDate(i.expiresAt)}`}
                    </span>
                  </span>
                  <Badge tone={i.status === 'expired' ? 'warn' : 'neutral'}>{i.status === 'expired' ? 'Expired' : 'Invitation sent'}</Badge>
                  <span className="flex shrink-0 gap-1 max-sm:w-full max-sm:justify-end">
                    {i.status !== 'expired' ? (
                      <CopyButton text={inviteUrl(`/business/invite/${i.inviteId}`)} label="Copy link" variant="ghost" />
                    ) : null}
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={busy !== null}
                      loading={busy === `revoke:${i.inviteId}`}
                      onClick={() => void run(`revoke:${i.inviteId}`, () => revokeInvite(businessId, i.inviteId), 'Invitation cancelled.')}
                    >
                      Cancel
                    </Button>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {team.members.length === 1 && team.invites.length === 0 && team.canManage ? (
          <EmptyState icon="users" title="Add your front desk" compact>
            Invite a manager to pin chat messages, print QR codes and see stats for the places you choose.
          </EmptyState>
        ) : null}
        <p className="rounded-b-[14px] border-t border-n-line-soft bg-n-surface-2 px-5 py-3 text-xs leading-5 text-n-muted max-sm:px-4">
          Managers can edit details, pin chat messages, print QR codes and see stats for their places. Only owners manage the team. To
          change an owner, contact Nessa.
        </p>
      </Panel>

      {team.canManage ? (
        <InviteDialog
          open={inviteOpen}
          onClose={() => setInviteOpen(false)}
          businessId={businessId}
          places={team.places}
          inviteDays={team.limits.inviteDays}
          onInvited={async message => {
            setNotice(message)
            await load()
          }}
        />
      ) : null}

      {editing ? (
        <EditPlacesDialog
          member={editing}
          places={team.places}
          busy={busy === `places:${editing.uid}`}
          onClose={() => setEditing(null)}
          onSave={ids =>
            run(`places:${editing.uid}`, () => updateManagerPlaces(businessId, editing.uid, ids), 'Places updated.').then(ok => {
              if (ok) setEditing(null)
            })
          }
        />
      ) : null}

      <Dialog
        open={Boolean(removing)}
        onClose={() => setRemoving(null)}
        title={removing && removing.uid === me?.uid ? 'Leave this team?' : `Remove ${removing?.email ?? 'this manager'}?`}
        description={
          removing && removing.uid === me?.uid
            ? 'You’ll lose access to these places. An owner can invite you again.'
            : 'They lose access right away. You can invite them again later.'
        }
        footer={
          <>
            <Button variant="ghost" onClick={() => setRemoving(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={removing ? busy === `remove:${removing.uid}` : false}
              onClick={() => {
                if (!removing) return
                const leaving = removing.uid === team.you.uid
                void run(`remove:${removing.uid}`, () => removeTeamMember(businessId, removing.uid), leaving ? undefined : 'Manager removed.').then(
                  ok => {
                    setRemoving(null)
                    if (ok && leaving) onLeft?.()
                  },
                )
              }}
            >
              {removing && removing.uid === me?.uid ? 'Leave team' : 'Remove'}
            </Button>
          </>
        }
      />
    </div>
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
    <fieldset>
      <legend className={labelClass}>Places they can manage</legend>
      <div className="mt-1.5 space-y-1.5">
        {places.map(p => {
          const on = picked.includes(p.placeId)
          return (
            <label
              key={p.placeId}
              className={cx(
                'flex min-h-11 cursor-pointer items-center gap-3 rounded-[10px] border px-3 py-2 text-sm transition-colors',
                on ? 'border-n-accent bg-n-accent-soft text-n-ink' : 'border-n-line-strong text-n-ink-2 hover:border-n-faint',
              )}
            >
              <input
                type="checkbox"
                name={name}
                value={p.placeId}
                checked={on}
                onChange={e => onChange(e.target.checked ? [...picked, p.placeId] : picked.filter(id => id !== p.placeId))}
                className="h-4 w-4 accent-[#5b46e5]"
              />
              {p.name}
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}

function EditPlacesDialog({
  member,
  places,
  busy,
  onClose,
  onSave,
}: {
  member: TeamMember
  places: { placeId: string; name: string }[]
  busy: boolean
  onClose: () => void
  onSave: (ids: string[]) => void
}) {
  const [picked, setPicked] = useState<string[]>(member.placeIds)
  return (
    <Dialog
      open
      onClose={onClose}
      title="Edit places"
      description={member.email ?? undefined}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" loading={busy} disabled={picked.length === 0} onClick={() => onSave(picked)}>
            Save places
          </Button>
        </>
      }
    >
      <PlacePicker places={places} picked={picked} onChange={setPicked} name={`places-${member.uid}`} />
    </Dialog>
  )
}

function InviteDialog({
  open,
  onClose,
  businessId,
  places,
  inviteDays,
  onInvited,
}: {
  open: boolean
  onClose: () => void
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

  useEffect(() => {
    if (!open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLink(null)
      setError(null)
    }
  }, [open])

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const res = await inviteManager(businessId, email, picked)
      setLink({ email: email.trim(), url: inviteUrl(res.path) })
      setEmail('')
      await onInvited(res.refreshed ? 'Invitation updated and renewed.' : 'Invitation created.')
    } catch (e) {
      setError(errorText(e, 'Could not create the invitation.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={link ? 'Invitation ready' : 'Invite a manager'}
      description={
        link
          ? undefined
          : 'They’ll get access to the places you pick once they accept with this email. Nessa doesn’t email the link yet — you share it.'
      }
    >
      {link ? (
        <div className="space-y-3" data-testid="invite-link">
          <p className="text-sm leading-6 text-n-ink-2">
            Send this link to <span className="font-medium text-n-ink">{link.email}</span>. They sign in (or create an account) with
            that email to accept. It works for {inviteDays} days.
          </p>
          <p className="rounded-[10px] bg-n-surface-2 px-3 py-2.5 font-mono text-xs break-all text-n-ink-2 ring-1 ring-n-line-soft">
            {link.url}
          </p>
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="ghost" onClick={() => setLink(null)}>
              Invite someone else
            </Button>
            <CopyButton text={link.url} label="Copy link" variant="primary" size="md" />
          </div>
        </div>
      ) : (
        <form onSubmit={e => void onSubmit(e)} className="space-y-4" noValidate aria-label="Invite a manager">
          <Field label="Email">
            <input
              type="email"
              autoComplete="off"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="front.desk@yourplace.com"
              className={fieldClass}
            />
          </Field>
          <PlacePicker places={places} picked={picked} onChange={setPicked} name="invite-places" />
          {error ? <Notice tone="danger">{error}</Notice> : null}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={busy} disabled={!email.trim() || picked.length === 0}>
              Create invitation
            </Button>
          </div>
        </form>
      )}
    </Dialog>
  )
}
