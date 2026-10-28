'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import AppStoreButtons from '@/components/landing/app-store-buttons'

type Props = {
  variant?: 'expired' | 'time'
}

export default function ChatEndedOverlay({ variant = 'expired' }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-200 flex flex-col bg-n-canvas/95 backdrop-blur-md"
    >
      <div className="absolute left-6 top-6 z-210">
        <Button
          asChild
          variant="outline"
          size="sm"
          className="group border-n-line-strong bg-n-surface text-n-ink transition-colors hover:border-n-line-strong hover:bg-n-hover"
        >
          <Link href="/chat" className="gap-2">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
              className="size-4 text-n-ink-2 transition-colors group-hover:text-n-ink"
            >
              <path
                d="M15 18l-6-6 6-6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Go to lobby
          </Link>
        </Button>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center px-6 pb-10 pt-16 text-center sm:pt-20">
        <h1 className="text-2xl font-bold text-n-ink sm:text-3xl">Chat Ended</h1>
        <p className="mt-3 max-w-md text-n-ink-2">This was a temporary chat.</p>
        {variant === 'time' && (
          <p className="mt-2 max-w-sm text-sm text-n-subtle">
            This room reached its time limit. You can start a new one anytime.
          </p>
        )}
        <div className="mt-10 flex w-full max-w-sm flex-col gap-6">
          <Button
            asChild
            className="bg-n-accent py-3 font-semibold text-white hover:bg-n-accent-strong"
          >
            <Link href="/chat">Start New Chat</Link>
          </Button>
          <div className="w-full">
            <p className="mb-3 text-center text-xs text-n-subtle">Get the full app</p>
            <AppStoreButtons />
          </div>
        </div>
      </div>
    </motion.div>
  )
}
