import type { Metadata } from 'next'

import { AdminTeam } from '@/components/admin/admin-team'

export const metadata: Metadata = { title: 'Admin team' }

/** Super Admins manage the admin team; `manageAdmins` enforces the role. */
export default function AdminTeamPage() {
  return <AdminTeam />
}
