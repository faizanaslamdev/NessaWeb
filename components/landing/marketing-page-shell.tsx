import Image from 'next/image'
import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { siteConfig } from '@/lib/constants'

function ChevronBackIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M15 18l-6-6 6-6" />
    </svg>
  )
}

type MarketingPageShellProps = {
  title: string
  children: React.ReactNode
}

/**
 * Shared chrome for legal / marketing subpages: matches landing (black, blur header, logo).
 */
export function MarketingPageShell({ title, children }: MarketingPageShellProps) {
  return (
    <div className="min-h-screen bg-black text-white">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-black/70 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Button
            asChild
            variant="outline"
            size="sm"
            className="rounded-xl border-white/20 bg-white/5 text-white shadow-none hover:bg-white/10 hover:text-white"
          >
            <Link
              href="/"
              aria-label="Back to home"
              className="inline-flex items-center gap-2 no-underline"
            >
              <ChevronBackIcon className="size-4 shrink-0 text-white/90" />
              Back to home
            </Link>
          </Button>
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/logo.png"
              alt={siteConfig.name}
              width={28}
              height={28}
              className="h-7 w-7 rounded-lg object-contain"
            />
            <span className="font-bold text-white">{siteConfig.name}</span>
          </Link>
        </div>
      </header>

      <main className="relative mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-20 right-0 h-72 w-72 rounded-full bg-linear-to-br from-purple-600/15 to-violet-600/10 blur-3xl" />
        </div>
        <div className="relative">
          <h1 className="mb-8 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            {title}
          </h1>
          <div className="space-y-6 text-sm leading-relaxed text-gray-300 sm:text-base">
            {children}
          </div>
        </div>
      </main>
    </div>
  )
}
