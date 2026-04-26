'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import QRCode from 'react-qr-code'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import CopyLinkButton from '@/components/chat/copy-link-button'
import { APP_CHAT_LANGUAGES, DEFAULT_CHAT_LANGUAGE_CODE } from '@/lib/chat/languages'
import { shareUrlWithoutScheme } from '@/lib/chat/format'

export type EntryModalVariant = 'join' | 'invite-host'

interface EntryModalProps {
  roomId: string
  isOpen: boolean
  /** `invite-host`: same layout as create-room flow — QR + share; no join form (you’re already in the room). */
  variant?: EntryModalVariant
  onClose?: () => void
  /** After create room — dismiss invite layer and stay in this room. */
  onContinue?: () => void
  onJoin?: (data: { name: string; language: string }) => void
}

export default function EntryModal({
  roomId,
  isOpen,
  variant = 'join',
  onClose,
  onContinue,
  onJoin,
}: EntryModalProps) {
  const [name, setName] = useState('')
  const [language, setLanguage] = useState(DEFAULT_CHAT_LANGUAGE_CODE)
  const [origin] = useState(() =>
    typeof window !== 'undefined' ? window.location.origin : '',
  )

  const handleJoin = () => {
    if (name.trim()) {
      onJoin?.({ name, language })
    }
  }

  const roomLink = origin ? `${origin}/chat/${roomId}` : `/chat/${roomId}`
  const showLiveQr = Boolean(origin)

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={variant === 'invite-host' ? onContinue ?? onClose : onClose}
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

                  <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-lg border-2 border-dashed border-purple-400/50 bg-white/5 flex items-center justify-center mb-4 sm:mb-6 p-2 sm:p-2.5">
                    {showLiveQr ? (
                      <div className="flex max-h-full max-w-full items-center justify-center rounded-md bg-white p-1.5">
                        <QRCode
                          value={roomLink}
                          size={128}
                          style={{ height: 'auto', maxWidth: '100%', width: '100%' }}
                          className="sm:max-h-38"
                        />
                      </div>
                    ) : (
                      <div className="text-center">
                        <div className="text-2xl sm:text-3xl mb-2">📱</div>
                        <p className="text-xs text-gray-400">QR Code</p>
                      </div>
                    )}
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
                        value={shareUrlWithoutScheme(roomLink)}
                        title={roomLink}
                        readOnly
                        variant="landing"
                        className="min-w-0 flex-1 truncate text-xs text-gray-300"
                        onCopy={(e) => {
                          e.preventDefault()
                          e.clipboardData?.setData('text/plain', roomLink)
                        }}
                      />
                      <CopyLinkButton
                        textToCopy={roomLink}
                        size="sm"
                        className="shrink-0 self-center whitespace-nowrap px-3 text-xs sm:px-4 sm:text-sm"
                      />
                    </div>
                  </div>
                </motion.div>

                {/* Right Section — join form or host “room ready” */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: 0.2 }}
                  className="p-4 sm:p-8 flex flex-col justify-center min-h-0 overflow-y-auto"
                >
                  {variant === 'invite-host' ? (
                    <>
                      <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">Room ready</h2>
                      <p className="text-gray-400 text-sm mb-5 sm:mb-6">
                        Have someone scan the QR or use the link on the left. When you’re done sharing, continue to the chat.
                      </p>
                      <div className="mt-2 flex flex-row-reverse items-stretch gap-2 md:flex-col md:gap-3">
                        <Button
                          type="button"
                          onClick={() => onContinue?.()}
                          className="min-w-0 flex-1 bg-linear-to-r from-purple-600 to-violet-600 py-2.5 font-semibold text-white hover:from-purple-700 hover:to-violet-700 md:w-full"
                        >
                          Continue to chat
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={onClose}
                          className="shrink-0 border-white/20 px-4 text-white hover:bg-white/10 md:w-full"
                        >
                          Back to lobby
                        </Button>
                      </div>
                      <p className="text-xs text-gray-500 text-center mt-4">
                        No signup for guests
                      </p>
                    </>
                  ) : (
                    <>
                      <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">
                        Join the conversation
                      </h2>
                      <p className="text-gray-400 text-sm mb-5 sm:mb-6">
                        Enter your details to get started
                      </p>

                      <div className="space-y-4">
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

                        <div>
                          <label className="block text-xs font-medium text-gray-300 mb-2">
                            Preferred Language
                          </label>
                          <select
                            value={language}
                            onChange={(e) => setLanguage(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all appearance-none cursor-pointer"
                          >
                        {APP_CHAT_LANGUAGES.map((lang) => (
                          <option key={lang.code} value={lang.code}>
                            {lang.flag} {lang.name}
                          </option>
                        ))}
                          </select>
                        </div>

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

                      <p className="text-xs text-gray-500 text-center mt-4">
                        No signup required. Just chat and go.
                      </p>
                    </>
                  )}
                </motion.div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
