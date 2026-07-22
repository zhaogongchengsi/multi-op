import { useEffect } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Card } from '@astryxdesign/core/Card'
import {
  PaperAirplaneIcon,
  ChatBubbleLeftRightIcon,
  HashtagIcon,
  ChatBubbleLeftEllipsisIcon,
} from '@heroicons/react/24/outline'
import { Stack } from '@astryxdesign/core/Stack'
import { PLATFORM_META } from '@multi-op/shared'
import { useWorkspaces } from '~/stores/workspace'

export const Route = createFileRoute('/chat/$chatId')({
  component: ChatView,
})

const PLATFORM_ICONS: Record<string, React.ComponentType<React.ComponentProps<'svg'>>> = {
  telegram: PaperAirplaneIcon,
  whatsapp: ChatBubbleLeftRightIcon,
  twitter: HashtagIcon,
}

function PlatformIcon({ platform }: { platform: string }) {
  const Icon = PLATFORM_ICONS[platform] ?? ChatBubbleLeftEllipsisIcon
  const meta = PLATFORM_META[platform as keyof typeof PLATFORM_META]
  return (
    <Icon
      style={{ color: meta?.color }}
      className="w-5 h-5 shrink-0"
    />
  )
}

function ChatView() {
  const { chatId } = Route.useParams()
  const { state, selectChat } = useWorkspaces()
  const numericId = Number(chatId)

  // Sync selected chat with the store
  useEffect(() => {
    selectChat(numericId)
  }, [numericId, selectChat])

  // Find the chat across all workspaces
  const allChats = state.workspaces.flatMap(w => w.chats)
  const chat = allChats.find(c => c.id === numericId)

  if (!chat) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        Conversation not found
      </div>
    )
  }

  return (
    <div className="p-4 h-full flex flex-col">
      <Card>
        <Stack gap={1} align="center">
          <PlatformIcon platform={chat.platform} />
          <div className="font-semibold text-lg">{chat.title}</div>
        </Stack>
        <div className="text-sm text-gray-500">
          Status: {chat.status} · ID: {chat.id}
        </div>
      </Card>
    </div>
  )
}
