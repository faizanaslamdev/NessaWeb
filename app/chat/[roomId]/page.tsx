'use client'

import { Suspense, useMemo } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'

import ChatRoom from '@/components/chat/chat-room'
import PlaceChatRoom from '@/components/chat/place-chat-room'
import { Button } from '@/components/ui/button'
import { resolveWebChatKind } from '@/lib/chat/resolve-chat-kind'

function ChatPageInner() {
  const params = useParams()
  const searchParams = useSearchParams()
  const roomId = (params.roomId as string) || ''

  const resolved = useMemo(
    () => resolveWebChatKind(roomId, searchParams),
    [roomId, searchParams],
  )

  if (resolved.kind === 'error') {
    return (
      <div className="fixed inset-0 z-0 flex flex-col items-center justify-center gap-4 bg-n-canvas px-6 text-center">
        <p className="text-n-ink-2">{resolved.message}</p>
        <Button asChild className="bg-n-accent text-white hover:bg-n-accent-strong">
          <Link href="/chat">Back to lobby</Link>
        </Button>
      </div>
    )
  }

  if (resolved.kind === 'place') {
    return <PlaceChatRoom placeId={resolved.placeId} />
  }

  return <ChatRoom roomId={resolved.roomId} />
}

export default function ChatPage() {
  return (
    <Suspense
      fallback={
        <div className="fixed inset-0 z-0 flex items-center justify-center bg-n-canvas text-n-muted">
          Loading…
        </div>
      }
    >
      <ChatPageInner />
    </Suspense>
  )
}
