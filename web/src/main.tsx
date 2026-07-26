import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from '@/context/AuthContext'
import { LanguageProvider } from '@/lib/i18n'
import { ProfileViewerProvider } from '@/components/ProfileViewer'

const queryClient = new QueryClient()

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
