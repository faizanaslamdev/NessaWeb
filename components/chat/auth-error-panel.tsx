'use client'

type Props = { authError: Error }

export default function AuthErrorPanel({ authError }: Props) {
  const [headline, ...rest] = authError.message.split(/\n\n+/)
  const detail = rest.join('\n\n').trim() || authError.message
  const showEnvHint =
    authError.message.includes('Missing Firebase env') ||
    authError.message.includes('NEXT_PUBLIC_FIREBASE') ||
    authError.message.includes('.env.local')

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-6 text-center">
      <div className="max-w-lg rounded-2xl border border-red-500/30 bg-red-950/30 p-8 text-red-100">
        <p className="font-semibold">{headline.trim()}</p>
        <p className="mt-3 text-left text-sm text-red-200/90 whitespace-pre-line">{detail}</p>
        {showEnvHint && (
          <p className="mt-4 text-xs text-red-300/80">
            Copy <code className="rounded bg-black/40 px-1">.env.example</code> to{' '}
            <code className="rounded bg-black/40 px-1">.env.local</code> with your project keys, then restart{' '}
            <code className="rounded bg-black/40 px-1">npm run dev</code>.
          </p>
        )}
      </div>
    </div>
  )
}
