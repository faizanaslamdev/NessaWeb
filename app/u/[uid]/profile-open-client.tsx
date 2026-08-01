'use client'

import { useEffect, useState } from 'react'

import { OpenAppFallback } from '@/components/open-app-fallback'

type ProfileOpenClientProps = {
  uid: string
}

/**
 * Browser landing for profile share links: try `nessachat://profile/{uid}`,
 * then show open + store fallback if the app did not take over.
 */
export function ProfileOpenClient({ uid }: ProfileOpenClientProps) {
  const deepLink = `nessachat://profile/${encodeURIComponent(uid)}`
  const [hintVisible, setHintVisible] = useState(false)
  const [headline, setHeadline] = useState('Opening NessaChat…')

  useEffect(() => {
    // Attempt custom-scheme open; browsers that block it leave the user on this page.
    window.location.href = deepLink
    const t = window.setTimeout(() => {
      setHintVisible(true)
      setHeadline('Open this profile in NessaChat')
    }, 1400)
    return () => window.clearTimeout(t)
  }, [deepLink])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black px-6 py-12 text-center text-white">
      <h1 className="mb-2 text-2xl font-semibold tracking-tight">NessaChat</h1>
      <p className="mb-6 max-w-sm text-sm text-gray-400">{headline}</p>
      {hintVisible ? (
        <p className="mb-6 max-w-sm text-xs text-gray-500">
          If nothing happened, tap below — or install the app, then open this link again.
        </p>
      ) : null}
      <OpenAppFallback deepLink={deepLink} openLabel="Open NessaChat" />
    </div>
  )
}
