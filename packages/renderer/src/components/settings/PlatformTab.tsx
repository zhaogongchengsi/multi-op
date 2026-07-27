import { CheckboxInput } from '@astryxdesign/core/CheckboxInput'
import { FormLayout } from '@astryxdesign/core/FormLayout'
import { LayoutContent } from '@astryxdesign/core/Layout'
import { Section } from '@astryxdesign/core/Section'
import { Heading } from '@astryxdesign/core/Text'
import { useState } from 'react'

export function PlatformTab() {
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
