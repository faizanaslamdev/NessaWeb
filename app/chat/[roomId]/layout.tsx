import type { Metadata } from 'next'

/** Chat rooms are private, temporary links: a clear tab title, never indexed. */
export const metadata: Metadata = {
  title: 'Chat room | NessaChat',
  robots: { index: false, follow: false },
}

export default function ChatRoomLayout({ children }: { children: React.ReactNode }) {
  return children
}
