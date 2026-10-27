import type { Metadata } from 'next'

import { AccountShell } from '@/components/account/account-shell'
import { RequireAccount } from '@/components/account/require-account'
import { AdminChats } from '@/components/admin/admin-chats'
import { AdminNav } from '@/components/admin/admin-nav'
import { siteConfig } from '@/lib/constants'

export const metadata: Metadata = {
  title: `Chat settings | ${siteConfig.name}`,
  robots: { index: false, follow: false },
}

/**
 * Admins manage Place Chat settings (message retention) here. Authorization
 * is the `managePlaceChat` callable (Firestore `admin_users` roles), not
 * this page.
 */
export default function AdminChatsPage() {
  return (
    <RequireAccount>
      <AccountShell title="Chat settings" subtitle="Nessa admin">
        <AdminNav />
        <AdminChats />
      </AccountShell>
    </RequireAccount>
  )
}
