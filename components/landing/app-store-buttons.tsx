'use client'

import Image from 'next/image'
import { appStores } from '@/lib/constants'
import { cn } from '@/lib/utils'

type AppStoreButtonsProps = {
  className?: string
}

/** Same store links as `AppDownloadSection` — reuse on landing, chat ended overlay, etc. */
export default function AppStoreButtons({ className }: AppStoreButtonsProps) {
  return (
    <div
      className={cn(
        'flex w-full flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4',
        className,
      )}
    >
      {appStores.map((store) => (
        <a
          key={store.name}
          href={store.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex w-full items-center justify-center gap-3 rounded-lg border border-white/20 bg-white/5 px-4 py-2.5 transition-colors hover:bg-white/10 sm:w-auto sm:flex-1 sm:px-6 sm:py-3"
        >
          <Image src={store.iconSrc} alt="" width={22} height={22} className="h-[22px] w-[22px]" />
          <div className="text-left">
            <p className="text-xs text-gray-400">Download on</p>
            <p className="text-sm font-semibold text-white">{store.name}</p>
          </div>
        </a>
      ))}
    </div>
  )
}
