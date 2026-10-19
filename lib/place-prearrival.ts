/**
 * Ready-to-paste pre-arrival messages (roadmap item 11) that hostels / hotels
 * can drop into Booking.com messaging, WhatsApp or email. Every link carries
 * `?ref=pre` so that traffic is attributed as `prearrival`.
 */

export type PrearrivalChannel = 'whatsapp' | 'booking' | 'email'

export type PrearrivalCopy = {
  channel: PrearrivalChannel
  label: string
  text: string
}

export function buildPrearrivalCopy(input: {
  placeName: string
  placeUrl: string
  chatUrl: string
}): PrearrivalCopy[] {
  const name = input.placeName.trim() || 'our place'
  return [
    {
      channel: 'whatsapp',
      label: 'WhatsApp',
      text:
        `Hi! Before you arrive at ${name}, join our guest chat on Nessa to meet ` +
        `other travelers and ask us anything — messages are translated automatically. ` +
        `${input.chatUrl}`,
    },
    {
      channel: 'booking',
      label: 'Booking.com / Hostelworld message',
      text:
        `Thanks for booking ${name}! Guests who are arriving soon and guests already ` +
        `here chat together on Nessa (works in your browser, no app needed, auto-translated). ` +
        `Join here: ${input.chatUrl}\n` +
        `See the place, tips and recommendations: ${input.placeUrl}`,
    },
    {
      channel: 'email',
      label: 'Email',
      text:
        `Subject: Meet your fellow guests before you arrive at ${name}\n\n` +
        `Hello,\n\n` +
        `We're looking forward to welcoming you. If you'd like to connect with other ` +
        `guests before you arrive, ask questions, or get local tips, join the ${name} ` +
        `chat on Nessa. It works in any browser, no app required, and messages are ` +
        `translated automatically:\n${input.chatUrl}\n\n` +
        `Place page with recommendations: ${input.placeUrl}\n\n` +
        `See you soon!`,
    },
  ]
}
