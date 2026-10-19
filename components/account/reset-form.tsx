'use client'

import { useState, type FormEvent } from 'react'

import {
  accountButtonClass,
  accountCardClass,
  accountFieldClass,
} from '@/components/account/account-shell'
import { useAccountAuth } from '@/hooks/use-account-auth'
import { describeAccountAuthError } from '@/lib/account/auth-errors'
import { validateEmail } from '@/lib/account/validation'

export function ResetForm() {
  const { requestPasswordReset } = useAccountAuth()
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const emailError = validateEmail(email)
    if (emailError) {
      setError(emailError)
      return
    }
    setBusy(true)
    setError(null)
    try {
      await requestPasswordReset(email)
      setSent(true)
    } catch (e) {
      // Don't reveal whether an email is registered.
      if ((e as { code?: string })?.code === 'auth/user-not-found') {
        setSent(true)
      } else {
        setError(describeAccountAuthError(e))
      }
    } finally {
      setBusy(false)
    }
  }

  if (sent) {
    return (
      <div className={`${accountCardClass} text-center`}>
        <p className="text-sm text-gray-200">
          If an account exists for <span className="text-white">{email.trim()}</span>, we’ve
          sent a link to reset your password.
        </p>
        <p className="text-xs text-gray-500">Check your spam folder if it doesn’t arrive.</p>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} className={accountCardClass} noValidate>
      <label className="block text-left text-xs text-gray-400">
        Email
        <input
          type="email"
          autoComplete="email"
          inputMode="email"
          value={email}
          onChange={event => setEmail(event.target.value)}
          className={accountFieldClass}
          required
        />
      </label>
      {error ? (
        <p role="alert" className="text-sm text-red-400">
          {error}
        </p>
      ) : null}
      <button type="submit" disabled={busy} className={accountButtonClass}>
        {busy ? 'Sending…' : 'Send reset link'}
      </button>
    </form>
  )
}
