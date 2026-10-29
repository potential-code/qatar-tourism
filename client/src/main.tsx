import './styles/app.css'
import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { I18nextProvider } from 'react-i18next'
import { Toaster } from '@/components/ui/sonner'
import i18n from '@/i18n'
import { queryClient } from '@/lib/query-client'
import { createAppRouter } from '@/router'
import { bootDemo } from '@/services/boot'

// The demo database (IndexedDB) loads, or is seeded, before anything reads it.
await bootDemo()

const router = createAppRouter(queryClient)

const root = document.getElementById('root')
if (!root) throw new Error('Missing #root element in index.html')

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={i18n}>
        <RouterProvider router={router} />
        <Toaster richColors closeButton />
      </I18nextProvider>
    </QueryClientProvider>
  </StrictMode>,
)
