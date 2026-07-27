import { useState } from 'react'
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog'
import { Layout, LayoutContent, LayoutFooter, LayoutPanel, HStack } from '@astryxdesign/core/Layout'
import { SideNav, SideNavItem, SideNavSection } from '@astryxdesign/core/SideNav'
import { Section } from '@astryxdesign/core/Section'
import { FormLayout } from '@astryxdesign/core/FormLayout'
import {
  SegmentedControl,
  SegmentedControlItem,
} from '@astryxdesign/core/SegmentedControl'
import { CheckboxInput } from '@astryxdesign/core/CheckboxInput'
import { Button } from '@astryxdesign/core/Button'
import { TextInput } from '@astryxdesign/core/TextInput'
import { Text, Heading } from '@astryxdesign/core/Text'
import {
  Cog6ToothIcon,
  GlobeAltIcon,
  BookmarkIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline'
import { useCustomAddresses } from '~/stores/custom-address'
import stylex from '@stylexjs/stylex'


const styles = stylex.create({
  dialogContent: {
    height: '55vh',
  },
  layoutPanel: {
    padding: '0.5rem',
  }
})

// ─── Vertical nav config ─────────────────────────────────────────

type SettingsTab = 'general' | 'platform' | 'custom-addresses' | 'about'

const NAV_ITEMS: { value: SettingsTab; label: string; icon: React.ComponentType<React.ComponentProps<'svg'>> }[] = [
  { value: 'general', label: 'General', icon: Cog6ToothIcon },
  { value: 'platform', label: 'Platform', icon: GlobeAltIcon },
  { value: 'custom-addresses', label: 'Custom Addresses', icon: BookmarkIcon },
  { value: 'about', label: 'About', icon: InformationCircleIcon },
]

function GeneralTab() {
  const [layout, setLayout] = useState('tile')
  const [launchAtStartup, setLaunchAtStartup] = useState(false)

  return (
    <LayoutContent>
      <Section dividers={['bottom']}>
        <Heading level={4}>Startup & Window</Heading>
        <FormLayout>
          <SegmentedControl
            label="Default layout"
            value={layout}
            onChange={setLayout}
            size="sm"
          >
            <SegmentedControlItem value="tile" label="Tile" />
            <SegmentedControlItem value="grid" label="Grid" />
            <SegmentedControlItem value="tabs" label="Tabs" />
            <SegmentedControlItem value="free" label="Free" />
          </SegmentedControl>
          <CheckboxInput
            label="Launch at system startup"
            value={launchAtStartup}
            onChange={setLaunchAtStartup}
          />
        </FormLayout>
      </Section>
    </LayoutContent>
  )
}

function PlatformTab() {
  const [autoOpen, setAutoOpen] = useState(true)

  return (
    <LayoutContent>
      <Section dividers={['bottom']}>
        <Heading level={4}>Telegram</Heading>
        <FormLayout>
          <CheckboxInput
            label="Auto-open links in app"
            value={autoOpen}
            onChange={setAutoOpen}
          />
        </FormLayout>
      </Section>
      <Section dividers={['bottom']}>
        <Heading level={4}>WhatsApp</Heading>
        <FormLayout>
          <CheckboxInput
            label="Auto-open links in app"
            value={autoOpen}
            onChange={setAutoOpen}
          />
        </FormLayout>
      </Section>
      <Section dividers={['bottom']}>
        <Heading level={4}>Twitter</Heading>
        <FormLayout>
          <CheckboxInput
            label="Auto-open links in app"
            value={autoOpen}
            onChange={setAutoOpen}
          />
        </FormLayout>
      </Section>
    </LayoutContent>
  )
}

function AboutTab() {
  return (
    <LayoutContent>
      <Section>
        <Heading level={4}>Multi-Op</Heading>
        <Text type="body" color="secondary">
          Multi-platform account management tool.
        </Text>
        <Text type="supporting" color="disabled">
          Version 0.1.0
        </Text>
      </Section>
    </LayoutContent>
  )
}

// ─── Custom address management tab ───────────────────────────────

function CustomAddressesTab() {
  const { state, addAddress, removeAddress } = useCustomAddresses()
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [iconPreview, setIconPreview] = useState<string | null>(null)

  const handleIconUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setIconPreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  const handleAdd = () => {
    if (!name.trim() || !url.trim()) return
    addAddress({ name: name.trim(), url: url.trim(), icon: iconPreview })
    setName('')
    setUrl('')
    setIconPreview(null)
  }

  return (
    <LayoutContent>
      <Section dividers={['bottom']}>
        <Heading level={4}>Add Custom Address</Heading>
        <FormLayout>
          <TextInput label="Name" placeholder="My Service" value={name} onChange={setName} />
          <TextInput label="URL" placeholder="https://example.com" value={url} onChange={setUrl} />

          {/* Icon upload */}
          <div className="flex flex-col gap-2">
            <Text type="supporting" color="secondary">Icon (optional)</Text>
            <div className="flex items-center gap-3">
              <label className="cursor-pointer px-3 py-1.5 rounded-md border border-gray-300 text-sm hover:bg-gray-50 transition-colors">
                Choose image
                <input type="file" accept="image/*" className="hidden" onChange={handleIconUpload} />
              </label>
              {iconPreview && (
                <img src={iconPreview} alt="Preview" className="size-8 rounded object-cover" />
              )}
            </div>
          </div>

          <Button
            label="Add address"
            variant="primary"
            onClick={handleAdd}
            isDisabled={!name.trim() || !url.trim()}
          />
        </FormLayout>
      </Section>

      {state.addresses.length > 0 && (
        <Section dividers={['bottom']}>
          <Heading level={4}>Saved Addresses ({state.addresses.length})</Heading>
          <div className="flex flex-col gap-2">
            {state.addresses.map(addr => (
              <div key={addr.id} className="flex items-center gap-3 p-2 rounded-md border border-gray-200">
                {addr.icon ? (
                  <img src={addr.icon} alt={addr.name} className="size-6 rounded object-cover shrink-0" />
                ) : (
                  <div className="size-6 rounded bg-gray-200 shrink-0 flex items-center justify-center text-xs text-gray-500">
                    {addr.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <Text type="body" className="truncate">{addr.name}</Text>
                  <Text type="supporting" color="disabled" className="truncate">{addr.url}</Text>
                </div>
                <Button
                  label="Remove"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeAddress(addr.id)}
                />
              </div>
            ))}
          </div>
        </Section>
      )}
    </LayoutContent>
  )
}

interface SettingsDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}

export function SettingsDialog({ isOpen, onOpenChange }: SettingsDialogProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general')

  const renderTabContent = () => {
    switch (activeTab) {
      case 'general':
        return <GeneralTab />
      case 'platform':
        return <PlatformTab />
      case 'custom-addresses':
        return <CustomAddressesTab />
      case 'about':
        return <AboutTab />
    }
  }

  return (
    <Dialog
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      width={800}
      purpose="form"
    >
      <div className="min-h-95 flex flex-col">
        <Layout
          height="fill"
          header={
            <DialogHeader
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
          content={renderTabContent()}
          footer={
            <LayoutFooter>
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
