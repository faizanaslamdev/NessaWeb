'use client'

import { useState, type FormEvent } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

import {
  accountButtonClass,
  accountCardClass,
  accountFieldClass,
} from '@/components/account/account-shell'
import { useAccountAuth } from '@/hooks/use-account-auth'
import { describeAccountAuthError } from '@/lib/account/auth-errors'
import {
  safeNextPath,
  validateDisplayName,
  validateEmail,
  validatePassword,
} from '@/lib/account/validation'

export function SignUpForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = safeNextPath(searchParams.get('next'))
  const { signUp } = useAccountAuth()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const problem = validateDisplayName(name) ?? validateEmail(email) ?? validatePassword(password)
    if (problem) {
      setError(problem)
      return
    }
    setBusy(true)
    setError(null)
    try {
      await signUp(name, email, password)
      router.replace(next)
    } catch (e) {
      setError(describeAccountAuthError(e))
      setBusy(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className={accountCardClass} noValidate>
      <label className="block text-left text-xs text-gray-400">
        Your name
        <input
          type="text"
          autoComplete="name"
          value={name}
          onChange={event => setName(event.target.value)}
          className={accountFieldClass}
          maxLength={60}
          required
        />
      </label>
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
      <label className="block text-left text-xs text-gray-400">
        Password
        <input
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={event => setPassword(event.target.value)}
          className={accountFieldClass}
          minLength={8}
          required
        />
        <span className="mt-1 block text-[11px] text-gray-600">At least 8 characters.</span>
      </label>
      {error ? (
        <p role="alert" className="text-sm text-red-400">
          {error}
        </p>
      ) : null}
      <button type="submit" disabled={busy} className={accountButtonClass}>
        {busy ? 'Creating account…' : 'Create account'}
      </button>
      <p className="text-center text-[11px] leading-4 text-gray-600">
        This is the same account you use in the Nessa app. We’ll send a verification email.
      </p>
    </form>
  )
}
