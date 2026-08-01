import type { Metadata } from 'next'

import { OpenAppFallback } from '@/components/open-app-fallback'
import { siteConfig } from '@/lib/constants'
import { ProfileOpenClient } from './profile-open-client'

type PageProps = {
  params: Promise<{ uid: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { uid } = await params
  return {
    title: `Profile – ${siteConfig.name}`,
    description: `Open this profile in the ${siteConfig.name} app.`,
    robots: { index: false, follow: false },
    openGraph: {
      title: `${siteConfig.name} profile`,
      description: `Open this profile in the ${siteConfig.name} app.`,
      url: `/u/${encodeURIComponent(uid)}`,
    },
  }
}

export default async function ProfileShareLandingPage({ params }: PageProps) {
  const { uid: raw } = await params
  const uid = decodeURIComponent(raw || '').trim()

  if (!uid) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-black px-6 py-12 text-center text-white">
        <h1 className="mb-2 text-2xl font-semibold">{siteConfig.name}</h1>
        <p className="mb-8 text-sm text-gray-400">Invalid profile link.</p>
        <OpenAppFallback />
      </div>
    )
  }

  return <ProfileOpenClient uid={uid} />
}
