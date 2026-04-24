'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import CopyLinkButton from '@/components/chat/copy-link-button'

interface EntryModalProps {
  roomId: string
  isOpen: boolean
  onClose?: () => void
  onJoin?: (data: { name: string; language: string }) => void
}

const languages = [
  { value: 'en', label: 'English' },
  { value: 'ur', label: 'اردو' },
  { value: 'es', label: 'Español' },
  { value: 'fr', label: 'Français' },
  { value: 'de', label: 'Deutsch' },
  { value: 'zh', label: '中文' },
  { value: 'ar', label: 'العربية' },
  { value: 'hi', label: 'हिन्दी' },
]

export default function EntryModal({
  roomId,
  isOpen,
  onClose,
  onJoin,
}: EntryModalProps) {
  const [name, setName] = useState('')
  const [language, setLanguage] = useState('en')

  const handleJoin = () => {
    if (name.trim()) {
      onJoin?.({ name, language })
    }
  }

  const roomLink =
    typeof window !== 'undefined'
      ? `${window.location.origin}/chat/${roomId}`
      : `/chat/${roomId}`

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-100 bg-black/80 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="fixed inset-0 z-110 flex items-stretch justify-center overflow-y-auto overscroll-contain px-3 py-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] sm:items-center sm:px-4 sm:py-4"
          >
            <div className="my-auto w-full max-w-2xl max-h-[min(92dvh,900px)] rounded-2xl border border-white/20 bg-linear-to-br from-white/10 to-white/5 overflow-hidden flex flex-col shadow-2xl shadow-black/40">
              {/* Content Grid */}
              <div className="grid flex-1 min-h-0 grid-cols-1 md:grid-cols-2 md:min-h-[min(520px,80dvh)]">
                {/* Left Section - QR Code & Share */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: 0.1 }}
                  className="bg-linear-to-b from-white/5 to-white/0 p-4 sm:p-8 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-white/10 shrink-0"
                >
                  <h3 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4">
                    Share This Chat
                  </h3>

                  {/* QR Code Placeholder */}
                  <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-lg border-2 border-dashed border-purple-400/50 bg-white/5 flex items-center justify-center mb-4 sm:mb-6">
                    <div className="text-center">
                      <div className="text-2xl sm:text-3xl mb-2">📱</div>
                      <p className="text-xs text-gray-400">QR Code</p>
                    </div>
                  </div>

                  <p className="text-xs sm:text-sm text-gray-400 text-center mb-4 sm:mb-6 px-1">
                    Scan to join this chat instantly
                  </p>

                  {/* Copy Link — URL + button one row (saves vertical space on mobile) */}
                  <div className="w-full space-y-2">
                    <p className="text-xs font-medium text-gray-300">
                      Or share this link:
                    </p>
                    <div className="flex flex-row items-stretch gap-2">
                      <Input
                        type="text"
                        value={`${typeof window !== 'undefined' ? window.location.origin : ''}/chat/${roomId}`}
                        readOnly
                        variant="landing"
                        className="min-w-0 flex-1 truncate text-xs text-gray-300"
                      />
                      <CopyLinkButton
                        textToCopy={roomLink}
                        size="sm"
                        className="shrink-0 self-center whitespace-nowrap px-3 text-xs sm:px-4 sm:text-sm"
                      />
                    </div>
                  </div>
                </motion.div>

                {/* Right Section - Form */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: 0.2 }}
                  className="p-4 sm:p-8 flex flex-col justify-center min-h-0 overflow-y-auto"
                >
                  <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">
                    Join the conversation
                  </h2>
                  <p className="text-gray-400 text-sm mb-5 sm:mb-6">
                    Enter your details to get started
                  </p>

                  {/* Form Fields */}
                  <div className="space-y-4">
                    {/* Name Input */}
                    <div>
                      <label className="block text-xs font-medium text-gray-300 mb-2">
                        Your Name
                      </label>
                      <Input
                        type="text"
                        placeholder="Enter your name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                        variant="landing"
                      />
                    </div>

                    {/* Language Selector */}
                    <div>
                      <label className="block text-xs font-medium text-gray-300 mb-2">
                        Preferred Language
                      </label>
                      <select
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all appearance-none cursor-pointer"
                      >
                        {languages.map((lang) => (
                          <option key={lang.value} value={lang.value}>
                            {lang.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Enter + Back: mobile row — Enter on right (row-reverse); md+ stacked Enter top */}
                    <div className="mt-6 flex flex-row-reverse items-stretch gap-2 md:flex-col md:gap-3">
                      <Button
                        onClick={handleJoin}
                        disabled={!name.trim()}
                        className="min-w-0 flex-1 bg-linear-to-r from-purple-600 to-violet-600 py-2.5 font-semibold text-white hover:from-purple-700 hover:to-violet-700 disabled:cursor-not-allowed disabled:opacity-50 md:w-full"
                      >
                        Enter Chat
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={onClose}
                        className="shrink-0 border-white/20 px-4 text-white hover:bg-white/10 md:w-full"
                      >
                        Back
                      </Button>
                    </div>
                  </div>

                  {/* Info Text */}
                  <p className="text-xs text-gray-500 text-center mt-4">
                    No signup required. Just chat and go.
                  </p>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
