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
      className="fixed inset-0 z-200 flex flex-col bg-black/95 backdrop-blur-md"
    >
      <div className="absolute left-6 top-6 z-210">
        <Button
          asChild
          variant="outline"
          size="sm"
          className="group border-white/15 bg-black/20 text-white transition-colors hover:border-purple-500/30 hover:bg-white/10"
        >
          <Link href="/chat" className="gap-2">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
              className="size-4 text-white/80 transition-colors group-hover:text-white"
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
        <h1 className="text-2xl font-bold text-white sm:text-3xl">Chat Ended</h1>
        <p className="mt-3 max-w-md text-gray-300">This was a temporary chat.</p>
        {variant === 'time' && (
          <p className="mt-2 max-w-sm text-sm text-gray-500">
            This room reached its time limit. You can start a new one anytime.
          </p>
        )}
        <div className="mt-10 flex w-full max-w-sm flex-col gap-6">
          <Button
            asChild
            className="bg-linear-to-r from-purple-600 to-violet-600 py-3 font-semibold text-white hover:from-purple-700 hover:to-violet-700"
          >
            <Link href="/chat">Start New Chat</Link>
          </Button>
          <div className="w-full">
            <p className="mb-3 text-center text-xs text-gray-500">Get the full app</p>
            <AppStoreButtons />
          </div>
        </div>
      </div>
    </motion.div>
  )
}
