'use client'

import { useEffect, useMemo, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import {
  confirmPasswordReset,
  verifyPasswordResetCode,
  type AuthError,
} from 'firebase/auth'

import { OpenAppFallback } from '@/components/open-app-fallback'
import { getFirebaseClient } from '@/lib/firebase'
import { siteConfig, siteRoutes } from '@/lib/constants'

type AsyncState =
  | { kind: 'loading' }
  | { kind: 'ready'; emailHint?: string }
  | { kind: 'success' }
  | { kind: 'invalid'; message: string }
  | { kind: 'expired'; message: string }

function mapAuthError(err: unknown): { kind: 'invalid' | 'expired'; message: string } {
  const code = (err as AuthError)?.code ?? ''
  if (code === 'auth/expired-action-code') {
    return {
      kind: 'expired',
      message: 'This link has expired. Request a new password reset from the app.',
    }
  }
  if (code === 'auth/invalid-action-code') {
    return {
      kind: 'invalid',
      message:
        'This link is invalid or has already been used. Request a new password reset from the app.',
    }
  }
  if (code === 'auth/weak-password') {
    return { kind: 'invalid', message: 'Choose a stronger password (at least 6 characters).' }
  }
  return {
    kind: 'invalid',
    message: 'Something went wrong. Try again or request a new reset link from the app.',
  }
}

function StatusBlock({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-center">
      <h2 className="mb-2 text-lg font-semibold text-white">{title}</h2>
      <p className="text-sm text-gray-400">{body}</p>
    </div>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black px-6 py-12 text-white">
      <div className="w-full max-w-md">
        <p className="mb-1 text-center text-xs font-medium uppercase tracking-wide text-violet-400">
          {siteConfig.name}
        </p>
        <h1 className="mb-6 text-center text-2xl font-semibold tracking-tight">Account</h1>
        {children}
        <div className="mt-8 flex flex-col items-center">
          <OpenAppFallback openLabel="Open NessaChat" />
          <p className="mt-4 text-center text-xs text-gray-600">
            <Link href={siteRoutes.requestDeletion} className="text-violet-400 hover:text-violet-300">
              Account deletion help
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

/**
 * Firebase Auth email action handler (custom).
 * Active today: password reset (`mode=resetPassword`).
 * Other modes are acknowledged but not implemented (app does not send those emails).
 */
export function AuthActionClient() {
  const searchParams = useSearchParams()
  const mode = (searchParams.get('mode') || '').trim()
  const oobCode = (searchParams.get('oobCode') || '').trim()

  const gate = useMemo(() => {
    if (!mode || !oobCode) return 'missing' as const
    if (mode !== 'resetPassword') return 'unsupported' as const
    return 'ok' as const
  }, [mode, oobCode])

  if (gate === 'missing') {
    return (
      <Shell>
        <StatusBlock
          title="Incomplete link"
          body="This page needs a valid action link from your email. Open the reset link from your inbox, or request a new one in the app (Settings → Account security)."
        />
      </Shell>
    )
  }

  if (gate === 'unsupported') {
    return (
      <Shell>
        <StatusBlock
          title="Unsupported action"
          body={`This email action (${mode || 'unknown'}) isn’t used by ${siteConfig.name} right now. If you were resetting your password, request a new reset from the app.`}
        />
      </Shell>
    )
  }

  return <PasswordResetForm oobCode={oobCode} />
}

function PasswordResetForm({ oobCode }: { oobCode: string }) {
  const [state, setState] = useState<AsyncState>({ kind: 'loading' })
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const { auth } = getFirebaseClient()
        // Validates oobCode via Firebase; never log or display the code.
        const email = await verifyPasswordResetCode(auth, oobCode)
        if (cancelled) return
        setState({ kind: 'ready', emailHint: email || undefined })
      } catch (err) {
        if (cancelled) return
        const mapped = mapAuthError(err)
        setState({ kind: mapped.kind, message: mapped.message })
      }
    })()
    return () => {
      cancelled = true
    }
  }, [oobCode])

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setFormError(null)
    if (password.length < 6) {
      setFormError('Use at least 6 characters.')
      return
    }
    if (password !== confirm) {
      setFormError('Passwords do not match.')
      return
    }
    setSubmitting(true)
    try {
      const { auth } = getFirebaseClient()
      await confirmPasswordReset(auth, oobCode, password)
      setState({ kind: 'success' })
      setPassword('')
      setConfirm('')
    } catch (err) {
      const mapped = mapAuthError(err)
      if (mapped.kind === 'expired' || mapped.kind === 'invalid') {
        setState({ kind: mapped.kind, message: mapped.message })
      } else {
        setFormError(mapped.message)
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Shell>
      {state.kind === 'loading' ? (
        <p className="text-center text-sm text-gray-400">Checking your link…</p>
      ) : null}

      {state.kind === 'invalid' || state.kind === 'expired' ? (
        <StatusBlock title={state.kind === 'expired' ? 'Link expired' : 'Invalid link'} body={state.message} />
      ) : null}

      {state.kind === 'success' ? (
        <StatusBlock
          title="Password updated"
          body="You can sign in to NessaChat with your new password."
        />
      ) : null}

      {state.kind === 'ready' ? (
        <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-5">
          <p className="text-sm text-gray-300">
            Choose a new password
            {state.emailHint ? (
              <>
                {' '}
                for <span className="text-white">{state.emailHint}</span>
              </>
            ) : null}
            .
          </p>
          <label className="block text-left text-xs text-gray-400">
            New password
            <input
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="mt-1 w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2.5 text-sm text-white outline-none focus:border-violet-500"
              minLength={6}
              required
            />
          </label>
          <label className="block text-left text-xs text-gray-400">
            Confirm password
            <input
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              className="mt-1 w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2.5 text-sm text-white outline-none focus:border-violet-500"
              minLength={6}
              required
            />
          </label>
          {formError ? <p className="text-sm text-red-400">{formError}</p> : null}
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-60"
          >
            {submitting ? 'Updating…' : 'Update password'}
          </button>
        </form>
      ) : null}
    </Shell>
  )
}
