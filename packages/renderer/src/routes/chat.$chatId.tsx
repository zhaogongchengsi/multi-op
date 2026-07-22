import { useEffect } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Card } from '@astryxdesign/core/Card'
import { useWorkspaces } from '~/stores/workspace'

export const Route = createFileRoute('/chat/$chatId')({
  component: ChatView,
})

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
        <div className="font-semibold text-lg">{chat.title}</div>
        <div className="text-sm text-gray-500">
          Status: {chat.status} · ID: {chat.id}
        </div>
      </Card>
    </div>
  )
}
