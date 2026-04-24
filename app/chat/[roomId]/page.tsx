'use client'

import { useParams } from 'next/navigation'
import ChatRoom from '@/components/chat/chat-room'

export default function ChatPage() {
  const params = useParams()
  const roomId = params.roomId as string

  return <ChatRoom roomId={roomId} />
}
