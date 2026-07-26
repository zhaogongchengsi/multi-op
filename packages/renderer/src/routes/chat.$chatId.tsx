import { useState, useEffect } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Card } from '@astryxdesign/core/Card'
import {
  PaperAirplaneIcon,
  ChatBubbleLeftRightIcon,
  HashtagIcon,
  ChatBubbleLeftEllipsisIcon,
} from '@heroicons/react/24/outline'
import { Stack } from '@astryxdesign/core/Stack'
import { MoreMenu } from '@astryxdesign/core/MoreMenu'
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog'
import { TextInput } from '@astryxdesign/core/TextInput'
import { Layout, LayoutContent } from '@astryxdesign/core/Layout'
import { Button } from '@astryxdesign/core/Button'
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

/** Maps platform to its web app URL */
const PLATFORM_URLS: Record<string, string> = {
  telegram: 'https://web.telegram.org/k/',
  whatsapp: 'https://web.whatsapp.com',
  twitter: 'https://x.com',
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

  const platformUrl = PLATFORM_URLS[chat.platform]
  const partition = `persist:${chat.platform}-${chat.id}`

  return (
    <div className="p-2 h-full flex flex-col">
     {platformUrl ? (
       <web-content
         src={platformUrl}
         partition={partition}
         class="flex-1 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700"
       />
     ) : (
       <div className="flex items-center justify-center flex-1 text-gray-500">
         Unsupported platform: {chat.platform}
       </div>
     )}
    </div>
  )
}
