import { useState } from 'react'
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog'
import { Layout, LayoutFooter, LayoutPanel, HStack } from '@astryxdesign/core/Layout'
import { SideNav, SideNavItem, SideNavSection } from '@astryxdesign/core/SideNav'
import { Button } from '@astryxdesign/core/Button'
import {
  Cog6ToothIcon,
  GlobeAltIcon,
  BookmarkIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline'
import { GeneralTab } from './settings/GeneralTab'
import { PlatformTab } from './settings/PlatformTab'
import { CustomAddressesTab } from './settings/CustomAddressesTab'
import { AboutTab } from './settings/AboutTab'
import stylex from '@stylexjs/stylex'

const styles = stylex.create({
  dialogContent: {
    height: '55vh',
  },
  layoutPanel: {
    padding: '0.5rem',
  },
})

type SettingsTab = 'general' | 'platform' | 'custom-addresses' | 'about'

const NAV_ITEMS: { value: SettingsTab; label: string; icon: React.ComponentType<React.ComponentProps<'svg'>> }[] = [
  { value: 'general', label: 'General', icon: Cog6ToothIcon },
  { value: 'platform', label: 'Platform', icon: GlobeAltIcon },
  { value: 'custom-addresses', label: 'Custom Addresses', icon: BookmarkIcon },
  { value: 'about', label: 'About', icon: InformationCircleIcon },
]

const TAB_CONTENT: Record<SettingsTab, React.ComponentType> = {
  general: GeneralTab,
  platform: PlatformTab,
  'custom-addresses': CustomAddressesTab,
  about: AboutTab,
}

interface SettingsDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}

export function SettingsDialog({ isOpen, onOpenChange }: SettingsDialogProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general')

  const Content = TAB_CONTENT[activeTab]

  return (
    <Dialog
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      width={800}
      purpose="form"
    >
      <div style={{ height: '55vh' }}>
        <Layout
          height="fill"
          header={
            <DialogHeader
              hasDivider
              title="Settings"
              subtitle="Configure Multi-Op preferences"
              onOpenChange={onOpenChange}
            />
          }
          xstyle={styles.dialogContent}
          start={
            <LayoutPanel hasDivider xstyle={styles.layoutPanel}>
              <SideNav className="h-full">
                <SideNavSection title="Preferences">
                  {NAV_ITEMS.map(item => {
                    const Icon = item.icon
                    const isActive = activeTab === item.value
                    return (
                      <SideNavItem
                        key={item.value}
                        label={item.label}
                        icon={Icon}
                        isSelected={isActive}
                        href="void:;"
                        onClick={(e: React.MouseEvent) => {
                          e.preventDefault()
                          setActiveTab(item.value)
                        }}
                      />
                    )
                  })}
                </SideNavSection>
              </SideNav>
            </LayoutPanel>
          }
          content={<Content />}
          footer={
            <LayoutFooter height="fit" hasDivider>
              <HStack gap={2} hAlign="end">
                <Button label="Close" variant="secondary" onClick={() => onOpenChange(false)} />
              </HStack>
            </LayoutFooter>
          }
        />
      </div>
    </Dialog>
  )
}
