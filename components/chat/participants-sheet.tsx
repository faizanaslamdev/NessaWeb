'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { ParticipantsList, type ChatParticipant } from '@/components/chat/participants-list'

type ParticipantsSheetProps = {
  open: boolean
  onClose: () => void
  participants: ChatParticipant[]
  title?: string
  doneLabel?: string
  emptyLabel?: string
}

export default function ParticipantsSheet({
  open,
  onClose,
  participants,
  title = 'People in this room',
  doneLabel = 'Done',
  emptyLabel = 'No one here yet.',
}: ParticipantsSheetProps) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    queueMicrotask(() => setMounted(true))
  }, [])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open || !mounted) return null

  return createPortal(
    <div
      className="fixed inset-0 z-118 flex max-w-dvw items-end justify-center overflow-hidden overscroll-none px-0 pb-0 pt-16 sm:items-center sm:p-6"
      role="presentation"
    >
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-black/75 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="participants-sheet-title"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 flex min-h-0 min-w-0 max-h-[min(85dvh,32rem)] w-full max-w-full flex-col overflow-hidden rounded-t-2xl border border-white/15 border-b-0 bg-linear-to-br from-white/12 to-white/5 shadow-2xl shadow-black/50 sm:max-h-[min(80dvh,28rem)] sm:max-w-md sm:rounded-2xl sm:border-b"
      >
        <div className="flex min-w-0 shrink-0 items-center justify-between gap-3 border-b border-white/10 px-4 py-3 sm:px-5 sm:py-4">
          <h2
            id="participants-sheet-title"
            className="min-w-0 flex-1 truncate text-base font-semibold text-white sm:text-lg"
          >
            {title} ({participants.length})
          </h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0 border-white/20 text-white hover:bg-white/10"
            onClick={onClose}
          >
            {doneLabel}
          </Button>
        </div>
        {participants.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-gray-500">{emptyLabel}</p>
        ) : (
          <div
            className="max-h-[min(calc(85dvh-5.25rem),calc(32rem-5.25rem))] overflow-x-hidden overflow-y-auto overscroll-y-contain pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:max-h-[min(calc(80dvh-5.25rem),calc(28rem-5.25rem))]"
          >
            <ParticipantsList participants={participants} />
          </div>
        )}
      </motion.div>
    </div>,
    document.body,
  )
}
