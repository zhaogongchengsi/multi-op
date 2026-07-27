import { LayoutContent } from '@astryxdesign/core/Layout'
import { Section } from '@astryxdesign/core/Section'
import { Heading, Text } from '@astryxdesign/core/Text'

export function AboutTab() {
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
