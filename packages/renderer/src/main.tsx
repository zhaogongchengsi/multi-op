import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import { routeTree } from '~/routeTree.gen'
import '~/globals.css'

// Detect macOS for frameless window styling
if (navigator.platform.startsWith('Mac')) {
  document.documentElement.dataset.platform = 'macos'
}

const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
