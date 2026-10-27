'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'

import {
  accountButtonClass,
  accountCardClass,
  accountFieldClass,
} from '@/components/account/account-shell'
import { useAccountAuth } from '@/hooks/use-account-auth'
import { describeAccountAuthError } from '@/lib/account/auth-errors'
import { accountRoutes } from '@/lib/account/constants'
import { safeNextPath, validateEmail } from '@/lib/account/validation'

export function SignInForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = safeNextPath(searchParams.get('next'))
  const { signIn } = useAccountAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const emailError = validateEmail(email)
    if (emailError) {
      setError(emailError)
      return
    }
    if (!password) {
      setError('Enter your password.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await signIn(email, password)
      router.replace(next)
    } catch (e) {
      setError(describeAccountAuthError(e))
      setBusy(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className={accountCardClass} noValidate>
      <label className="block text-left text-xs text-n-muted">
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
      <label className="block text-left text-xs text-n-muted">
        Password
        <input
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={event => setPassword(event.target.value)}
          className={accountFieldClass}
          required
        />
      </label>
      {error ? (
        <p role="alert" className="text-sm text-n-danger">
          {error}
        </p>
      ) : null}
      <button type="submit" disabled={busy} className={accountButtonClass}>
        {busy ? 'Signing in…' : 'Sign in'}
      </button>
      <p className="text-center text-xs text-n-subtle">
        <Link href={accountRoutes.reset} className="text-n-accent-strong hover:text-n-accent">
          Forgot your password?
        </Link>
      </p>
    </form>
  )
}
