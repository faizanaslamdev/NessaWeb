'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { useAccountAuth } from '@/hooks/use-account-auth'
import { accountRoutes } from '@/lib/account/constants'
import { ADMIN_ROLE_LABELS, readMyAdminRole, type AdminRole } from '@/lib/admin'

/**
 * Small tab row for the Nessa admin pages. Shows the caller's role, the
 * Chats tab for every admin and the Team tab for Super Admins. Display only — every action is authorized by
 * the backend.
 */
export function AdminNav() {
  const { user } = useAccountAuth()
  const pathname = usePathname()
  const [role, setRole] = useState<AdminRole | null | undefined>(undefined)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    readMyAdminRole(user.uid).then(r => {
      if (!cancelled) setRole(r)
    })
    return () => {
      cancelled = true
    }
  }, [user])

  if (!role) return null

  const tabs = [
    { href: accountRoutes.admin, label: 'Business claims' },
    { href: accountRoutes.adminChats, label: 'Chats' },
    ...(role === 'super_admin' ? [{ href: accountRoutes.adminTeam, label: 'Team' }] : []),
  ]

  return (
    <nav aria-label="Admin" className="mb-4 flex items-center justify-between gap-3">
      <div className="flex gap-1">
        {tabs.map(t => (
          <Link
            key={t.href}
            href={t.href}
            aria-current={pathname === t.href ? 'page' : undefined}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
              pathname === t.href ? 'bg-violet-600 text-white' : 'bg-white/5 text-gray-300 hover:bg-white/10'
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>
      <span className="text-[11px] text-gray-500">You: {ADMIN_ROLE_LABELS[role]}</span>
    </nav>
  )
}
