'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import AppStoreButtons from '@/components/landing/app-store-buttons'

type DownloadAppFeaturesModalProps = {
  open: boolean
  onClose: () => void
  /** `chat` = web-room upsell; `landing` = generic header CTA. */
  placement?: 'chat' | 'landing'
}

export default function DownloadAppFeaturesModal({
  open,
  onClose,
  placement = 'chat',
}: DownloadAppFeaturesModalProps) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    const id = globalThis.setTimeout(() => {
      setMounted(true)
    }, 0)
    return () => globalThis.clearTimeout(id)
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
      className="fixed inset-0 z-118 overflow-y-auto overscroll-contain"
      role="presentation"
    >
      <div className="relative flex min-h-dvh items-center justify-center px-3 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-6">
        <button
          type="button"
          aria-label="Close"
          className="absolute inset-0 min-h-full bg-black/75 backdrop-blur-sm"
          onClick={onClose}
        />
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="download-app-features-title"
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className="relative z-10 w-full max-w-md rounded-2xl border border-white/15 bg-linear-to-br from-white/12 to-white/5 p-5 shadow-2xl shadow-black/50 sm:p-6"
        >
          <div className="mb-1 flex items-center gap-2 text-purple-200">
            {placement === 'chat' ? (
              <>
                <PaperclipIcon className="size-5 shrink-0" aria-hidden />
                <span className="text-xs font-medium uppercase tracking-wide">Instant web chat</span>
              </>
            ) : (
              <>
                <PhoneIcon className="size-5 shrink-0" aria-hidden />
                <span className="text-xs font-medium uppercase tracking-wide">iOS & Android</span>
              </>
            )}
          </div>
          <h2 id="download-app-features-title" className="text-lg font-semibold text-white sm:text-xl">
            {placement === 'chat' ? 'Full features in the app' : 'Download NessaChat'}
          </h2>
          <p className="mt-2 text-sm text-gray-400">
            {placement === 'chat' ? (
              <>
                Attachments, camera, voice, and more work in the NessaChat mobile app. Web instant chat is text-only for
                now — download the app to unlock the full experience.
              </>
            ) : (
              <>
                Get the full experience on your phone: real-time translation, calls, media, and groups. Pick your store
                below — it&apos;s free to install.
              </>
            )}
          </p>
          <div className="mt-6">
            <p className="mb-3 text-center text-xs text-gray-500">Download NessaChat</p>
            <AppStoreButtons />
          </div>
          <Button
            type="button"
            variant="outline"
            className="mt-5 w-full border-white/20 text-white hover:bg-white/10"
            onClick={onClose}
          >
            {placement === 'chat' ? 'Continue in browser' : 'Close'}
          </Button>
        </motion.div>
      </div>
    </div>,
    document.body,
  )
}

function PhoneIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <rect x="6" y="3" width="12" height="18" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="M10 18h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function PaperclipIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
