'use client'

/**
 * Admin: business claims (pending / approved / not approved) and direct
 * owner assignment. Every action goes through `runBusinessAdminOps`, which
 * checks the admin role. A manager claim never becomes an owner unless the
 * admin explicitly chooses "Approve as owner…" (confirmed, audited).
 */

import { useCallback, useEffect, useState, type FormEvent } from 'react'
import Link from 'next/link'

import { useAdminHref } from '@/components/admin/admin-shell'
import { ShellTitle } from '@/components/dash/app-shell'
import { Icon } from '@/components/dash/icons'
import {
  Badge,
  Button,
  Dialog,
  EmptyState,
  Field,
  LoadingBlock,
  Notice,
  PageHeader,
  Panel,
  Tabs,
  fieldClass,
  formatDateTime,
  timeAgo,
} from '@/components/dash/ui'
import { BusinessActionError, adminAssignOwner, adminListClaims, adminReviewClaim, type AdminClaim } from '@/lib/business'

type Status = 'pending' | 'approved' | 'rejected'

type ListState = { kind: 'loading' } | { kind: 'ready'; claims: AdminClaim[] } | { kind: 'error'; message: string }

type Review = { claim: AdminClaim; decision: 'approve' | 'reject'; grantRole?: 'owner' | 'staff' }

function errorText(e: unknown, fallback: string) {
  return e instanceof BusinessActionError ? e.message : fallback
}

export function AdminClaims() {
  const adminHref = useAdminHref()
  const [status, setStatus] = useState<Status>('pending')
  const [state, setState] = useState<ListState>({ kind: 'loading' })
  const [pendingCount, setPendingCount] = useState<number | null>(null)
  const [notice, setNotice] = useState<{ tone: 'ok' | 'danger'; text: string } | null>(null)
  const [review, setReview] = useState<Review | null>(null)
  const [assignOpen, setAssignOpen] = useState(false)
  const [assignPlaceId, setAssignPlaceId] = useState('')

  const load = useCallback(async (s: Status) => {
    setState({ kind: 'loading' })
    try {
      const claims = await adminListClaims(s)
      setState({ kind: 'ready', claims })
      if (s === 'pending') setPendingCount(claims.length)
    } catch (e) {
      setState({ kind: 'error', message: errorText(e, 'Could not load claims.') })
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(status)
  }, [status, load])

  // ?assign=<placeId> opens the assign dialog prefilled (from a Place page).
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('assign')
    if (id) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAssignPlaceId(id)
      setAssignOpen(true)
    }
  }, [])

  return (
    <>
      <ShellTitle crumbs={[{ label: 'Business claims' }]} />
      <PageHeader
        title="Business claims"
        description="People asking to manage a place. Check each one by hand — a call, the business email or a visit — before approving."
        actions={
          <Button icon="plus" onClick={() => setAssignOpen(true)}>
            Assign an owner
          </Button>
        }
      />

      {notice ? (
        <Notice tone={notice.tone} className="mb-4">
          {notice.text}
        </Notice>
      ) : null}

      <Tabs
        label="Claim status"
        value={status}
        onChange={setStatus}
        tabs={[
          { value: 'pending', label: 'Waiting', count: pendingCount },
          { value: 'approved', label: 'Approved' },
          { value: 'rejected', label: 'Not approved' },
        ]}
      />

      <div className="mt-4">
        {state.kind === 'loading' ? (
          <Panel>
            <LoadingBlock rows={4} label="Loading claims…" />
          </Panel>
        ) : state.kind === 'error' ? (
          <Notice tone="danger">{state.message}</Notice>
        ) : state.claims.length === 0 ? (
          <Panel>
            <EmptyState icon={status === 'pending' ? 'check' : 'inbox'} title={status === 'pending' ? 'Nothing waiting' : 'No claims here yet'}>
              {status === 'pending' ? 'New claims from place pages will appear here.' : null}
            </EmptyState>
          </Panel>
        ) : (
          <ul className="space-y-3">
            {state.claims.map(c => (
              <li key={c.claimId} id={`claim-${c.claimId}`}>
                <ClaimCard claim={c} placeHref={adminHref(`places/${encodeURIComponent(c.placeId)}`)} onReview={setReview} />
              </li>
            ))}
          </ul>
        )}
      </div>

      <ReviewDialog
        review={review}
        onClose={() => setReview(null)}
        onDone={text => {
          setReview(null)
          setNotice({ tone: 'ok', text })
          void load(status)
          if (status !== 'pending') void adminListClaims('pending').then(l => setPendingCount(l.length)).catch(() => undefined)
        }}
      />

      <AssignDialog
        open={assignOpen}
        initialPlaceId={assignPlaceId}
        onClose={() => setAssignOpen(false)}
        onDone={text => {
          setAssignOpen(false)
          setNotice({ tone: 'ok', text })
        }}
      />
    </>
  )
}

function ClaimCard({
  claim: c,
  placeHref,
  onReview,
}: {
  claim: AdminClaim
  placeHref: string
  onReview: (r: Review) => void
}) {
  const pending = c.status === 'pending'
  return (
    <Panel as="article" className="p-5 max-sm:p-4" aria-label={`Claim for ${c.businessName}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold text-n-ink">{c.businessName}</h2>
            <Badge tone={c.role === 'owner' ? 'accent' : 'neutral'}>{c.role === 'owner' ? 'Owner request' : 'Manager request'}</Badge>
            {c.status === 'approved' ? (
              <Badge tone="ok" dot>
                Approved as {c.grantedRole === 'staff' ? 'manager' : 'owner'}
              </Badge>
            ) : c.status === 'rejected' ? (
              <Badge tone="danger" dot>
                Not approved
              </Badge>
            ) : null}
          </div>
          <p className="mt-1 text-[13px] text-n-muted">
            {c.email}
            {c.contactPhone ? ` · ${c.contactPhone}` : ''} · <span title={formatDateTime(c.createdAt)}>{timeAgo(c.createdAt)}</span>
          </p>
        </div>
        <Link href={placeHref} className="inline-flex items-center gap-1 text-[13px] font-medium text-n-accent-strong hover:underline">
          Open place <Icon name="arrow-right" size={14} />
        </Link>
      </div>

      {c.website || c.message ? (
        <div className="mt-3 space-y-2 rounded-[10px] bg-n-surface-2 px-3.5 py-3 text-[13px] ring-1 ring-n-line-soft">
          {c.website ? (
            <p className="break-all">
              <span className="text-n-muted">Website </span>
              <a href={/^https?:\/\//.test(c.website) ? c.website : `https://${c.website}`} target="_blank" rel="noreferrer" className="text-n-accent-strong hover:underline">
                {c.website}
              </a>
            </p>
          ) : null}
          {c.message ? <p className="whitespace-pre-line text-n-ink-2">{c.message}</p> : null}
        </div>
      ) : null}

      {c.reviewNote ? <p className="mt-3 text-[13px] text-n-muted">Note: {c.reviewNote}</p> : null}

      {pending && c.role === 'manager' && !c.placeBusinessId ? (
        <Notice tone="warn" className="mt-3">
          No owner manages this place yet, so a manager can’t be added. Ask the owner to claim it and invite this person —
          or approve as owner only if the real owner asked for that.
        </Notice>
      ) : null}

      {pending ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {c.role === 'owner' ? (
            <Button variant="primary" icon="check" onClick={() => onReview({ claim: c, decision: 'approve' })}>
              Approve as owner
            </Button>
          ) : c.placeBusinessId ? (
            <Button variant="primary" icon="check" onClick={() => onReview({ claim: c, decision: 'approve', grantRole: 'staff' })}>
              Approve as manager
            </Button>
          ) : (
            <Button onClick={() => onReview({ claim: c, decision: 'approve', grantRole: 'owner' })}>Approve as owner…</Button>
          )}
          <Button variant="ghost" onClick={() => onReview({ claim: c, decision: 'reject' })}>
            Reject
          </Button>
        </div>
      ) : null}
    </Panel>
  )
}

function ReviewDialog({ review, onClose, onDone }: { review: Review | null; onClose: () => void; onDone: (text: string) => void }) {
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNote('')
    setError(null)
  }, [review])

  if (!review) return null
  const { claim, decision, grantRole } = review
  const forcedOwner = decision === 'approve' && grantRole === 'owner' && claim.role === 'manager'
  const becomesOwner = grantRole === 'owner' || (!grantRole && claim.role === 'owner')

  const submit = async () => {
    setBusy(true)
    setError(null)
    try {
      await adminReviewClaim(claim.claimId, decision, note.trim() || undefined, grantRole)
      onDone(
        decision === 'reject'
          ? `Not approved: ${claim.businessName}.`
          : `Approved: ${claim.email} is now ${becomesOwner ? 'the owner' : 'a manager'} of ${claim.businessName}.`,
      )
    } catch (e) {
      setError(errorText(e, 'Action failed.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title={decision === 'reject' ? `Reject ${claim.businessName}?` : forcedOwner ? 'Make them the owner?' : `Approve ${claim.businessName}?`}
      description={
        decision === 'reject'
          ? 'They will see that the claim was not approved, with your note if you add one.'
          : forcedOwner
            ? `${claim.email} asked to be a manager, not the owner. Only do this if the real owner asked for it.`
            : `${claim.email} becomes ${becomesOwner ? 'the owner' : 'a manager'} and can manage the place right away.`
      }
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant={decision === 'reject' ? 'danger' : 'primary'} onClick={() => void submit()} loading={busy}>
            {decision === 'reject' ? 'Reject claim' : forcedOwner ? 'Approve as owner' : 'Approve'}
          </Button>
        </>
      }
    >
      <Field label={decision === 'reject' ? 'Reason (optional, shown to them)' : 'Note (optional, kept in the record)'}>
        <textarea value={note} onChange={e => setNote(e.target.value)} rows={3} maxLength={300} className={fieldClass} />
      </Field>
      {error ? (
        <Notice tone="danger" className="mt-3">
          {error}
        </Notice>
      ) : null}
    </Dialog>
  )
}

function AssignDialog({
  open,
  initialPlaceId,
  onClose,
  onDone,
}: {
  open: boolean
  initialPlaceId: string
  onClose: () => void
  onDone: (text: string) => void
}) {
  const [placeId, setPlaceId] = useState(initialPlaceId)
  const [ownerEmail, setOwnerEmail] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [businessId, setBusinessId] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (open) setPlaceId(initialPlaceId)
  }, [open, initialPlaceId])

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const r = await adminAssignOwner({
        placeId: placeId.trim(),
        ownerEmail: ownerEmail.trim(),
        businessName: businessName.trim(),
        ...(businessId.trim() ? { businessId: businessId.trim() } : {}),
        ...(note.trim() ? { note: note.trim() } : {}),
      })
      onDone(
        r.alreadyLinked
          ? `Already linked to business ${r.businessId}.`
          : `${r.created ? 'Created' : 'Updated'} business ${r.businessId} and linked the place.`,
      )
      setOwnerEmail('')
      setBusinessName('')
      setBusinessId('')
      setNote('')
    } catch (e) {
      setError(errorText(e, 'Assignment failed.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Assign an owner"
      description="For businesses Nessa has already verified in person. The owner needs a Nessa account with a verified email."
    >
      <form id="assign-owner" onSubmit={e => void onSubmit(e)} noValidate className="space-y-3">
        <Field label="Google Place ID">
          <input value={placeId} onChange={e => setPlaceId(e.target.value)} className={fieldClass} placeholder="ChIJ…" required />
        </Field>
        <Field label="Owner account email">
          <input value={ownerEmail} onChange={e => setOwnerEmail(e.target.value)} className={fieldClass} type="email" required />
        </Field>
        <Field label="Business name">
          <input value={businessName} onChange={e => setBusinessName(e.target.value)} className={fieldClass} maxLength={80} required />
        </Field>
        <Field label="Existing business ID" hint="Optional — attach this place to a business that already exists.">
          <input value={businessId} onChange={e => setBusinessId(e.target.value)} className={fieldClass} />
        </Field>
        <Field label="Note" hint="Optional, kept in the audit record.">
          <input value={note} onChange={e => setNote(e.target.value)} className={fieldClass} maxLength={300} />
        </Field>
        {error ? <Notice tone="danger">{error}</Notice> : null}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={busy}>
            Assign owner
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
