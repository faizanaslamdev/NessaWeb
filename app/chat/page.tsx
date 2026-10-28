import type { Metadata } from 'next'

import { InstantChatLobby } from '@/components/chat/instant-chat-lobby'
import { Icon, type IconName } from '@/components/dash/icons'
import { SiteShell } from '@/components/site/site-shell'
import { Container, Eyebrow } from '@/components/site/ui'
import { PLACE_PUBLIC_ORIGIN } from '@/lib/place-slug'

export const metadata: Metadata = {
  title: 'Instant chat — talk in any language | NessaChat',
  description:
    'Start a temporary chat room, share the link or QR code and talk right away — every message is translated. No sign-up needed.',
  alternates: { canonical: `${PLACE_PUBLIC_ORIGIN}/chat` },
}

const POINTS: { icon: IconName; text: string }[] = [
  { icon: 'languages', text: 'Everyone writes in their language and reads in theirs.' },
  { icon: 'qr', text: 'Invite with a link or a QR code — across the table or the world.' },
  { icon: 'clock', text: 'Rooms are temporary and close on their own.' },
  { icon: 'globe', text: 'Works in any browser. No app, no sign-up.' },
]

export default function ChatIndexPage() {
  return (
    <SiteShell>
      <Container className="grid gap-10 py-10 sm:py-16 lg:grid-cols-[1fr_1fr] lg:items-center lg:gap-16 lg:py-20">
        <div>
          <Eyebrow className="mb-4">Instant chat</Eyebrow>
          <h1 className="n-display text-[38px] leading-[1.06] sm:text-[52px]">Talk to anyone, in any language.</h1>
          <p className="mt-5 max-w-lg text-[17px] leading-7 text-n-muted">
            Open a room in seconds and share it. NessaChat translates every message, so you can just talk.
          </p>
          <ul className="mt-8 space-y-3.5">
            {POINTS.map(p => (
              <li key={p.text} className="flex items-start gap-3 text-[15px] text-n-ink-2">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-n-accent-soft text-n-accent">
                  <Icon name={p.icon} size={17} />
                </span>
                <span className="pt-1">{p.text}</span>
              </li>
            ))}
          </ul>
        </div>
        <InstantChatLobby />
      </Container>
    </SiteShell>
  )
}
