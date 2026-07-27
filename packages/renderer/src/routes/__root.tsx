import { useState, useEffect, useCallback } from 'react'
import { createRootRoute, Outlet } from '@tanstack/react-router'
import {AppShell} from '@astryxdesign/core/AppShell'
import {Layout, LayoutContent} from '@astryxdesign/core/Layout'
import {
  SideNav,
  SideNavItem,
  SideNavSection,
} from '@astryxdesign/core/SideNav'
import { Cog6ToothIcon, MinusIcon, Square2StackIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { loadAll } from '~/stores/workspace-store'
import { SidebarWorkspaces } from '~/components/SidebarWorkspaces'
import { SettingsDialog } from '~/components/SettingsDialog'

const isWin = navigator.platform.startsWith('Win')

function ShellLayout() {
  const [isMaximized, setIsMaximized] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  useEffect(() => {
    if (!window.windowControls) return
    window.windowControls.onMaximizedChange(setIsMaximized)
  }, [])

  const handleMinimize = useCallback(() => window.windowControls?.minimize(), [])
  const handleMaximize = useCallback(() => window.windowControls?.maximize(), [])
  const handleClose = useCallback(() => window.windowControls?.close(), [])

  // Init workspace data on mount
  useEffect(() => {
    if (window.bridge) {
      loadAll()
    }
  }, [])

  return (
    <>
      <div className="w-screen h-screen">
        <AppShell
          variant="surface"
          contentPadding={0}
          topNav={
            <div className="w-full h-12 flex items-center justify-between px-4 app-shell-top-nav">
              {
                isWin && <div className="title-bar-controls">
                  <button className="title-bar-btn" onClick={handleMinimize} aria-label="Minimize">
                    <MinusIcon className="size-3.5" />
                  </button>
                  <button className="title-bar-btn" onClick={handleMaximize} aria-label={isMaximized ? 'Restore' : 'Maximize'}>
                    <Square2StackIcon className="size-3.5" />
                  </button>
                  <button className="title-bar-btn title-bar-close" onClick={handleClose} aria-label="Close">
                    <XMarkIcon className="size-3.5" />
                  </button>
                </div>
              }
            </div>
          }
          sideNav={
            <SideNav
              collapsible
              resizable={{defaultWidth: 300, minWidth: 220, maxWidth: 420}}
              footer={
                <SideNavItem
                  label="Settings"
                  icon={Cog6ToothIcon}
                  href="void:;"
                  onClick={(e: React.MouseEvent) => {
                    e.preventDefault()
                    setIsSettingsOpen(true)
                  }}
                />
              }>
              <SidebarWorkspaces />
            </SideNav>
          }>
          <Layout
            height="fill"
            content={
              <LayoutContent>
                <Outlet />
              </LayoutContent>
            }
          />
        </AppShell>
      </div>
      <SettingsDialog isOpen={isSettingsOpen} onOpenChange={setIsSettingsOpen} />
    </>
  )
}

export const Route = createRootRoute({
  component: ShellLayout,
})
