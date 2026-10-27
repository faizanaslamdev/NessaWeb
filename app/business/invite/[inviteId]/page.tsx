import type { Metadata } from 'next'

import { AccountShell } from '@/components/account/account-shell'
import { RequireAccount } from '@/components/account/require-account'
import { InviteResponse } from '@/components/business/invite-response'
import { siteConfig } from '@/lib/constants'

type PageProps = { params: Promise<{ inviteId: string }> }

export const metadata: Metadata = {
  title: `Team invitation | ${siteConfig.name}`,
  robots: { index: false, follow: false },
}

/**
 * Manager invitation link. Signed-out visitors go through sign-in / sign-up
 * first (RequireAccount keeps this URL as `next`); the backend only lets the
 * invited, verified email accept it.
 */
export default async function InvitePage({ params }: PageProps) {
  const { inviteId: raw } = await params
  let inviteId = ''
  try {
    inviteId = decodeURIComponent(raw || '').trim()
  } catch {
    inviteId = (raw || '').trim()
  }
  return (
    <RequireAccount>
      <AccountShell title="Team invitation" subtitle="Join a business on Nessa as a manager.">
        {/^[A-Za-z0-9_-]{1,64}$/.test(inviteId) ? (
          <InviteResponse inviteId={inviteId} />
        ) : (
          <p className="text-center text-sm text-gray-400">This invitation link isn’t valid.</p>
        )}
      </AccountShell>
    </RequireAccount>
  )
}
