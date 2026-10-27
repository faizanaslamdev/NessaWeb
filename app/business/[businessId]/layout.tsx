import type { Metadata } from 'next'
import { Suspense, type ReactNode } from 'react'

import { FullPageLoading } from '@/components/account/require-account'
import { BusinessShell } from '@/components/business/dashboard/business-shell'

type LayoutProps = { children: ReactNode; params: Promise<{ businessId: string }> }

export const metadata: Metadata = {
  title: { default: 'Business · NessaChat', template: '%s · NessaChat Business' },
  robots: { index: false, follow: false, nocache: true },
}

/**
 * Business dashboard. Account gate + business access are client-side UX;
 * every action is authorized by its Cloud Function (membership checks).
 */
export default async function BusinessDashboardLayout({ children, params }: LayoutProps) {
  const { businessId } = await params
  return (
    <Suspense fallback={<FullPageLoading />}>
      <BusinessShell businessId={decodeURIComponent(businessId).trim()}>{children}</BusinessShell>
    </Suspense>
  )
}
