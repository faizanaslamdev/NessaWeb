'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { appStores } from '@/lib/constants'

type Props = {
  variant?: 'expired' | 'time'
}

export default function ChatEndedOverlay({ variant = 'expired' }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-black/95 px-6 text-center backdrop-blur-md"
    >
      <h1 className="text-2xl font-bold text-white sm:text-3xl">Chat Ended</h1>
      <p className="mt-3 max-w-md text-gray-300">This was a temporary chat.</p>
      {variant === 'time' && (
        <p className="mt-2 max-w-sm text-sm text-gray-500">
          This room hit its time or inactivity limit. You can start a new one anytime.
        </p>
      )}
      <div className="mt-10 flex w-full max-w-sm flex-col gap-3">
        <Button
          asChild
          className="bg-linear-to-r from-purple-600 to-violet-600 py-3 font-semibold text-white hover:from-purple-700 hover:to-violet-700"
        >
          <Link href="/chat">Start New Chat</Link>
        </Button>
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
          {appStores.map((store) => (
            <Button
              key={store.name}
              asChild
              variant="outline"
              className="border-white/20 text-white hover:bg-white/10"
            >
              <a href={store.url} target="_blank" rel="noopener noreferrer">
                Install app — {store.name}
              </a>
            </Button>
          ))}
        </div>
      </div>
    </motion.div>
  )
}
