import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { translations } from '@/lib/translations'

export type Lang = 'ar' | 'en'

interface LanguageContextValue {
  lang: Lang
  dir: 'rtl' | 'ltr'
  toggleLang: () => void
  t: (key: keyof typeof translations, vars?: Record<string, string>) => string
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined)

const STORAGE_KEY = 'pfr-lang'

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(() => {
    if (typeof window === 'undefined') return 'ar'
    return (localStorage.getItem(STORAGE_KEY) as Lang | null) ?? 'ar'
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, lang)
    document.documentElement.lang = lang
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'
  }, [lang])

  const value = useMemo<LanguageContextValue>(() => {
    const dir = lang === 'ar' ? 'rtl' : 'ltr'
    const t: LanguageContextValue['t'] = (key, vars) => {
      const entry = translations[key]
      let text = entry ? entry[lang] : String(key)
      if (vars) {
        for (const [k, v] of Object.entries(vars)) {
          text = text.replace(`{${k}}`, v)
        }
      }
      return text
    }
    return { lang, dir, toggleLang: () => setLang((l) => (l === 'ar' ? 'en' : 'ar')), t }
  }, [lang])

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider')
  return ctx
}
