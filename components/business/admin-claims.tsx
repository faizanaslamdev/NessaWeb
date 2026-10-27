'use client'

import { useEffect, useState, type FormEvent } from 'react'

import {
  accountButtonClass,
  accountCardClass,
  accountFieldClass,
} from '@/components/account/account-shell'
import {
  BusinessActionError,
  adminAssignOwner,
  adminListClaims,
  adminReviewClaim,
  type AdminClaim,
} from '@/lib/business'

type State =
  | { kind: 'loading' }
  | { kind: 'ready'; claims: AdminClaim[] }
  | { kind: 'denied' }
  | { kind: 'error'; message: string }

/**
 * Nessa-admin review page: two forms in front of `runBusinessAdminOps`.
 * Authorization is server-side (Nessa admin roles) — a non-admin simply
 * gets "not authorized" from the first call and nothing else renders.
 */
export function AdminClaims() {
  const [state, setState] = useState<State>({ kind: 'loading' })
  const [notice, setNotice] = useState<string | null>(null)

  const load = () =>
    adminListClaims('pending')
      .then(claims => setState({ kind: 'ready', claims }))
      .catch((e: unknown) => {
        const code = e instanceof BusinessActionError ? e.code : ''
        setState(
          code.includes('permission-denied') || code.includes('unauthenticated')
            ? { kind: 'denied' }
            : { kind: 'error', message: e instanceof BusinessActionError ? e.message : 'Could not load claims.' },
        )
      })

  useEffect(() => {
    void load()
  }, [])

  const review = async (claim: AdminClaim, decision: 'approve' | 'reject') => {
    const note = decision === 'reject' ? window.prompt('Reason (shown to the requester, optional):') ?? '' : ''
    setNotice(null)
    try {
      await adminReviewClaim(claim.claimId, decision, note || undefined)
      setNotice(`${decision === 'approve' ? 'Approved' : 'Rejected'}: ${claim.businessName}`)
      await load()
    } catch (e) {
      setNotice(e instanceof BusinessActionError ? e.message : 'Action failed.')
    }
  }

  if (state.kind === 'loading') return <p className="text-center text-sm text-gray-400">Loading…</p>
  if (state.kind === 'denied') {
    return (
      <div className={`${accountCardClass} text-center`}>
        <p className="text-sm text-gray-300">This page is for Nessa admins.</p>
      </div>
    )
  }
  if (state.kind === 'error') {
    return (
      <div className={`${accountCardClass} text-center`}>
        <p className="text-sm text-red-300">{state.message}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {notice ? <p className="text-center text-xs text-gray-300">{notice}</p> : null}

      <div className={accountCardClass}>
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          Pending claims ({state.claims.length})
        </p>
        {state.claims.length === 0 ? (
          <p className="text-sm text-gray-400">Nothing waiting.</p>
        ) : (
          <ul className="space-y-3">
            {state.claims.map(c => (
              <li key={c.claimId} className="rounded-xl border border-white/10 bg-black/30 p-3 text-sm">
                <p className="font-semibold text-white">{c.businessName}</p>
                <p className="text-xs text-gray-400">
                  {c.role} · {c.email}
                  {c.contactPhone ? ` · ${c.contactPhone}` : ''}
                </p>
                <p className="break-all text-[11px] text-gray-500">Place {c.placeId}</p>
                {c.website ? <p className="break-all text-[11px] text-gray-500">{c.website}</p> : null}
                {c.message ? <p className="mt-1 whitespace-pre-line text-xs text-gray-300">{c.message}</p> : null}
                <div className="mt-2 flex gap-2">
                  <button type="button" onClick={() => void review(c, 'approve')} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500">
                    Approve
                  </button>
                  <button type="button" onClick={() => void review(c, 'reject')} className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold text-gray-200 hover:bg-white/15">
                    Reject
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <AssignForm onDone={() => void load()} />
    </div>
  )
}

function AssignForm({ onDone }: { onDone: () => void }) {
  const [placeId, setPlaceId] = useState('')
  const [ownerEmail, setOwnerEmail] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [businessId, setBusinessId] = useState('')
  const [note, setNote] = useState('')
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError(null)
    setResult(null)
    try {
      const r = await adminAssignOwner({
        placeId: placeId.trim(),
        ownerEmail: ownerEmail.trim(),
        businessName: businessName.trim(),
        ...(businessId.trim() ? { businessId: businessId.trim() } : {}),
        ...(note.trim() ? { note: note.trim() } : {}),
      })
      setResult(
        r.alreadyLinked
          ? `Already linked to business ${r.businessId}.`
          : `${r.created ? 'Created' : 'Updated'} business ${r.businessId} and linked the place.`,
      )
      setPlaceId('')
      onDone()
    } catch (e) {
      setError(e instanceof BusinessActionError ? e.message : 'Assignment failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className={accountCardClass} noValidate>
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Assign an owner directly</p>
      <p className="text-[11px] leading-4 text-gray-600">
        For businesses Nessa has already verified in person. The owner needs a Nessa account with a verified email.
      </p>
      <label className="block text-left text-xs text-gray-400">
        Google Place ID
        <input value={placeId} onChange={e => setPlaceId(e.target.value)} className={accountFieldClass} placeholder="ChIJ…" required />
      </label>
      <label className="block text-left text-xs text-gray-400">
        Owner account email
        <input value={ownerEmail} onChange={e => setOwnerEmail(e.target.value)} className={accountFieldClass} type="email" required />
      </label>
      <label className="block text-left text-xs text-gray-400">
        Business name
        <input value={businessName} onChange={e => setBusinessName(e.target.value)} className={accountFieldClass} maxLength={80} required />
      </label>
      <label className="block text-left text-xs text-gray-400">
        Existing business ID (optional — attach this place to it)
        <input value={businessId} onChange={e => setBusinessId(e.target.value)} className={accountFieldClass} />
      </label>
      <label className="block text-left text-xs text-gray-400">
        Note (optional, kept in the audit record)
        <input value={note} onChange={e => setNote(e.target.value)} className={accountFieldClass} maxLength={300} />
      </label>
      {error ? <p role="alert" className="text-sm text-red-400">{error}</p> : null}
      {result ? <p className="text-sm text-emerald-300">{result}</p> : null}
      <button type="submit" disabled={busy} className={accountButtonClass}>
        {busy ? 'Assigning…' : 'Assign owner'}
      </button>
    </form>
  )
}
