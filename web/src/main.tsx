import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { captureLeadSource } from '@/lib/attribution'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
// Self-hosted fonts (bundled, cached for a year under /assets): no render-
// blocking request to Google Fonts. Only the Arabic + basic Latin subsets —
// the others (cyrillic, latin-ext) are tiny enough that Vite would inline
// them as base64 into the main CSS, and the site never uses them. Each
// subset has a unicode-range, so the browser fetches only what a page shows.
import '@fontsource/el-messiri/arabic-500.css'
import '@fontsource/el-messiri/latin-500.css'
import '@fontsource/el-messiri/arabic-600.css'
import '@fontsource/el-messiri/latin-600.css'
import '@fontsource/el-messiri/arabic-700.css'
import '@fontsource/el-messiri/latin-700.css'
import '@fontsource/ibm-plex-sans-arabic/arabic-400.css'
import '@fontsource/ibm-plex-sans-arabic/latin-400.css'
import '@fontsource/ibm-plex-sans-arabic/arabic-500.css'
import '@fontsource/ibm-plex-sans-arabic/latin-500.css'
import '@fontsource/ibm-plex-sans-arabic/arabic-600.css'
import '@fontsource/ibm-plex-sans-arabic/latin-600.css'
import '@fontsource/ibm-plex-sans-arabic/arabic-700.css'
import '@fontsource/ibm-plex-sans-arabic/latin-700.css'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from '@/context/AuthContext'
import { LanguageProvider } from '@/lib/i18n'
import { ProfileViewerProvider } from '@/components/ProfileViewer'

const queryClient = new QueryClient()

// Remember where this visitor came from (ad UTM / referrer) for lead attribution.
captureLeadSource()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <LanguageProvider>
          <AuthProvider>
            <ProfileViewerProvider>
              <App />
            </ProfileViewerProvider>
          </AuthProvider>
        </LanguageProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
)

// Register the PWA service worker (installable app + offline + push). Only in
// production builds — a service worker in `vite dev` interferes with HMR.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // registration failing (e.g. unsupported context) just means no offline
      // / push — the site still works as a normal web app.
    })
  })
}
