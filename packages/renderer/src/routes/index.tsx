import { createFileRoute } from '@tanstack/react-router'
import { Stack } from '@astryxdesign/core/Layout'
import { Heading, Text } from '@astryxdesign/core/Text'

function WelcomePage() {
  return (
    <div className="flex items-center justify-center h-full">
      <Stack direction="vertical" gap={6} className="text-center items-center">
        {/* Decorative line */}
        <div className="welcome-decorative-line animate-fade-in" />

        <Stack direction="vertical" gap={3}>
          <Heading
            level={2}
            className="animate-fade-in-up"
            style={{ animationDelay: '0.15s' }}
          >
            Welcome to Multi-Op
          </Heading>
          <Text
            type="body"
            color="secondary"
            className="animate-fade-in-up"
            style={{ animationDelay: '0.3s' }}
          >
            Select a conversation from the sidebar to get started
          </Text>
        </Stack>

        <Text
          type="caption"
          color="tertiary"
          className="animate-fade-in"
          style={{ animationDelay: '0.5s' }}
        >
          Telegram &middot; WhatsApp &middot; Twitter
        </Text>
      </Stack>
    </div>
  )
}

export const Route = createFileRoute('/')({
  component: WelcomePage,
})
