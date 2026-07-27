import { SegmentedControl, SegmentedControlItem } from '@astryxdesign/core/SegmentedControl'
import { CheckboxInput } from '@astryxdesign/core/CheckboxInput'
import { FormLayout } from '@astryxdesign/core/FormLayout'
import { LayoutContent } from '@astryxdesign/core/Layout'
import { Section } from '@astryxdesign/core/Section'
import { Heading } from '@astryxdesign/core/Text'
import { useStore } from '@tanstack/react-store'
import {
  settingsStore,
  selectTheme,
  selectLaunchAtStartup,
  setTheme,
  setLaunchAtStartup,
  type ThemeMode,
} from '~/stores/settings-store'

const THEME_OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
]

export function GeneralTab() {
  const theme = useStore(settingsStore, selectTheme)
  const launchAtStartup = useStore(settingsStore, selectLaunchAtStartup)

  return (
    <LayoutContent>
      <Section dividers={['bottom']}>
        <Heading level={4}>Appearance</Heading>
        <FormLayout>
          <SegmentedControl
            label="Theme"
            value={theme}
            onChange={mode => setTheme(mode as ThemeMode)}
            size="sm"
          >
            {THEME_OPTIONS.map(opt => (
              <SegmentedControlItem key={opt.value} value={opt.value} label={opt.label} />
            ))}
          </SegmentedControl>
        </FormLayout>
      </Section>

      <Section dividers={['bottom']}>
        <Heading level={4}>Startup & Window</Heading>
        <FormLayout>
          <SegmentedControl
            label="Default layout"
            value="tile"
            onChange={() => {}}
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
