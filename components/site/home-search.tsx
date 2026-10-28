'use client'

import { PlaceSearch } from '@/components/site/place-search'
import type { DirectoryPlace } from '@/lib/place-directory'
import { useDirectoryPlaces } from '@/lib/place-directory-client'

/** Home hero search: the server list, or the browser-loaded one as a fallback. */
export function HomeSearch({ places, className }: { places: DirectoryPlace[]; className?: string }) {
  const { places: list } = useDirectoryPlaces(places)
  return <PlaceSearch places={list} className={className} />
}
