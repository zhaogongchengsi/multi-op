import { useState, useEffect, useCallback, useRef } from 'react'
import { createRootRoute, Outlet } from '@tanstack/react-router'
import { Theme } from '@astryxdesign/core/theme'
import { neutralTheme } from '@astryxdesign/theme-neutral/built'
import { AppShell } from '@astryxdesign/core/AppShell'
import { Layout, LayoutContent } from '@astryxdesign/core/Layout'
import {
  SideNav,
  SideNavItem,
} from '@astryxdesign/core/SideNav'
import { Cog6ToothIcon, MinusIcon, Square2StackIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { loadAll } from '~/stores/workspace-store'
import { loadSettings, settingsStore, selectTheme } from '~/stores/settings-store'
import { loadCustomAddresses } from '~/stores/custom-address-store'
import { useSelector, useStore } from '@tanstack/react-store'
import { SidebarWorkspaces } from '~/components/SidebarWorkspaces'
import { SettingsDialog } from '~/components/SettingsDialog'
import TopNav from '~/components/topnav/topnav';
import { collapsible, setCollapsible } from '~/stores/collapsible';


function ShellLayout() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const theme = useSelector(settingsStore, selectTheme)
  const shellRef = useRef<HTMLDivElement>(null)
  const isCollapsible = useSelector(collapsible)

  // Track sidebar width and expose it as a CSS custom property for TopNav
  useEffect(() => {
    const container = shellRef.current
    if (!container) return

    const updateWidth = () => {
      const nav = container.querySelector<HTMLElement>('[role="navigation"]')
      if (nav) {
        container.style.setProperty('--side-nav-width', `${nav.offsetWidth}px`)
      }
    }

    updateWidth()
    const observer = new ResizeObserver(updateWidth)
    const nav = container.querySelector<HTMLElement>('[role="navigation"]')
    if (nav) observer.observe(nav)
    return () => observer.disconnect()
  }, [])

  // Init all data on mount
  useEffect(() => {
    if (window.bridge) {
      loadAll()
      loadSettings()
      loadCustomAddresses()
    }
  }, [])

  return (
    <Theme theme={neutralTheme} mode={theme}>
      <div ref={shellRef} className="w-screen h-screen">
        <AppShell
          variant="surface"
          contentPadding={0}
          topNav={
            <TopNav />
          }
          sideNav={
            <SideNav
              collapsible={
                {
                  isCollapsed: isCollapsible,
                  onCollapsedChange: setCollapsible
                }
              }
              // resizable={{ defaultWidth: 300, minWidth: 220, maxWidth: 420 }}
              footer={
                <SideNavItem
                  label="Settings"
                  icon={Cog6ToothIcon}
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
    </Theme>
  )
}

export const Route = createRootRoute({
  component: ShellLayout,
})
