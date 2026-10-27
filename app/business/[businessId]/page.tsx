import type { Metadata } from 'next'
import Link from 'next/link'

import { AccountShell } from '@/components/account/account-shell'
import { RequireAccount } from '@/components/account/require-account'
import { BusinessDetail } from '@/components/business/business-detail'
import { accountRoutes } from '@/lib/account/constants'
import { siteConfig } from '@/lib/constants'

type PageProps = { params: Promise<{ businessId: string }> }

export const metadata: Metadata = {
  title: `Manage business | ${siteConfig.name}`,
  robots: { index: false, follow: false },
}

export default async function BusinessDetailPage({ params }: PageProps) {
  const { businessId } = await params
  return (
    <RequireAccount>
      <AccountShell
        title="Manage your business"
        footer={
          <Link href={accountRoutes.business} className="text-violet-400 hover:text-violet-300">
            All businesses
          </Link>
        }
      >
        <BusinessDetail businessId={businessId.trim()} />
      </AccountShell>
    </RequireAccount>
  )
}
