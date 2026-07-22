import { createRootRoute, Outlet } from '@tanstack/react-router'
import { WorkspaceProvider } from '~/stores/workspace'

export const Route = createRootRoute({
  component: () => (
    <WorkspaceProvider>
      <div className="w-screen h-screen">
        <Outlet />
      </div>
    </WorkspaceProvider>
  ),
})
