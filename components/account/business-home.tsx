'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { accountCardClass } from '@/components/account/account-shell'
import { useAccountAuth } from '@/hooks/use-account-auth'
import { accountRoutes } from '@/lib/account/constants'
import { siteConfig } from '@/lib/constants'

export function BusinessHome() {
  const { user, signOut } = useAccountAuth()
  const router = useRouter()

  return (
    <div className="flex min-h-screen flex-col items-center bg-black px-6 py-12 text-white">
      <div className="w-full max-w-md">
        <p className="mb-1 text-center text-xs font-medium uppercase tracking-wide text-violet-400">
          {siteConfig.name}
        </p>
        <h1 className="mb-6 text-center text-2xl font-semibold tracking-tight">Your business</h1>

        <div className={accountCardClass}>
          <p className="text-sm text-gray-300">
            Signed in as <span className="text-white">{user?.email}</span>
          </p>
          <p className="text-sm text-gray-400">
            Business tools are coming here: claim your place, add official details, manage
            Wi-Fi, download QR codes and see how people find you.
          </p>
          <p className="text-xs text-gray-500">
            Until then, open your place’s page to share its link and QR code.{' '}
            <Link href="/" className="text-violet-400 hover:text-violet-300">
              Home
            </Link>
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            void signOut().then(() => router.replace(accountRoutes.signIn))
          }}
          className="mt-6 w-full text-center text-xs text-gray-500 hover:text-gray-300"
        >
          Sign out
        </button>
      </div>
    </div>
  )
}
