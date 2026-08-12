'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import { APP_CHAT_LANGUAGES } from '@/lib/chat/languages'
import { getPlaceUiCopy, type PlaceUiCopy } from '@/lib/place-ui-copy'
import {
  resolveAppLanguageCode,
  resolveInitialWebUiLanguage,
  writeStoredWebUiLanguage,
} from '@/lib/web-ui-locale'

export function useWebUiLocale() {
  const [language, setLanguageState] = useState('en')
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const resolved = resolveInitialWebUiLanguage()
    setLanguageState(resolved)
    // Seed storage so Place Chat EntryModal picks up browser language on first visit.
    writeStoredWebUiLanguage(resolved)
    setReady(true)
  }, [])

  const setLanguage = useCallback((next: string) => {
    const code = resolveAppLanguageCode(next)
    writeStoredWebUiLanguage(code)
    setLanguageState(code)
  }, [])

  const copy: PlaceUiCopy = useMemo(() => getPlaceUiCopy(language), [language])

  return {
    language,
    setLanguage,
    ready,
    copy,
    languages: APP_CHAT_LANGUAGES,
  }
}
