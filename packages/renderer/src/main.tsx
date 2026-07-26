import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import { autoInitBridge, registerWebContentElement } from '@multi-op/webcontent/renderer'
import { routeTree } from '~/routeTree.gen'
import '~/globals.css'

// Detect macOS for frameless window styling
if (navigator.platform.startsWith('Mac')) {
  document.documentElement.dataset.platform = 'macos'
}

// Initialize <web-content> bridge (exposed by preload)
autoInitBridge()
registerWebContentElement()

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
