import { redirect } from 'next/navigation'

/** Chat settings now live on each Place's page (Live chat tab). */
export default function AdminChatsPage() {
  redirect('/admin/places')
}
