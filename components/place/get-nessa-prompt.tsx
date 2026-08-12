'use client'

import { storesForPlatform } from '@/lib/store-links'

type Props = {
  prompt: string
  ctaLabel: string
  className?: string
}

/**
 * Subtle acquisition line under Join Live Chat / in Place Chat footer.
 * Never blocks chat or auto-redirects.
 */
export function GetNessaPrompt({ prompt, ctaLabel, className = '' }: Props) {
  const stores = storesForPlatform()
  const primary = stores[0]
  if (!primary) return null

  return (
    <div className={`w-full max-w-sm text-center ${className}`}>
      <p className="text-xs leading-4 text-[#737373]">{prompt}</p>
      <a
        href={primary.url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-1.5 inline-flex text-xs font-semibold text-violet-300 no-underline underline-offset-2 hover:underline"
      >
        {ctaLabel}
      </a>
      {stores.length > 1 ? (
        <span className="mt-1 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-[11px] text-gray-500">
          {stores.map(store => (
            <a
              key={store.name}
              href={store.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 no-underline hover:text-gray-200"
            >
              {store.name}
            </a>
          ))}
        </span>
      ) : null}
    </div>
  )
}
