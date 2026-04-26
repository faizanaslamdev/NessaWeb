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
}

export default function ParticipantsSheet({ open, onClose, participants }: ParticipantsSheetProps) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

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
      className="fixed inset-0 z-118 flex items-end justify-center px-0 pb-0 pt-16 sm:items-center sm:p-6"
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
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
        className="relative z-10 flex min-h-0 max-h-[min(85dvh,32rem)] w-full max-w-md flex-col rounded-t-2xl border border-white/15 border-b-0 bg-linear-to-br from-white/12 to-white/5 shadow-2xl shadow-black/50 sm:max-h-[min(80dvh,28rem)] sm:rounded-2xl sm:border-b"
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 px-4 py-3 sm:px-5 sm:py-4">
          <h2 id="participants-sheet-title" className="text-base font-semibold text-white sm:text-lg">
            People in this room ({participants.length})
          </h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0 border-white/20 text-white hover:bg-white/10"
            onClick={onClose}
          >
            Done
          </Button>
        </div>
        {participants.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-gray-500">No one here yet.</p>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <ParticipantsList participants={participants} className="min-h-0 flex-1" />
          </div>
        )}
      </motion.div>
    </div>,
    document.body,
  )
}
