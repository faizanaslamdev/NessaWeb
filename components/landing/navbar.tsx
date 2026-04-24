'use client'

import { navLinks } from '@/lib/constants'
import { Button } from '@/components/ui/button'
import Image from 'next/image'

export default function Navbar() {
  return (
    <nav className="fixed top-0 z-50 w-full border-b border-white/10 bg-black/40 backdrop-blur-md">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-4">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <Image
              src="/logo.png"
              alt="NessaChat"
              width={32}
              height={32}
              className="h-8 w-8 rounded-lg object-contain"
              priority
            />
            <span className="font-bold text-white">NessaChat</span>
          </div>

          {/* Nav Links - Hidden on mobile */}
          <div className="hidden items-center gap-8 md:flex">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-sm text-gray-400 transition-colors hover:text-white"
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* CTA Button */}
          <Button 
            className="bg-linear-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700"
          >
            Download
          </Button>
        </div>
      </div>
    </nav>
  )
}
