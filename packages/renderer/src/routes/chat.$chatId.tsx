import React, { useEffect, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useSelector } from '@tanstack/react-store'
import { workspaceStore, selectChat } from '~/stores/workspace-store'
import { PLATFORM_META } from '@multi-op/shared'
import { useWebviewSlot } from '~/hooks/useWebviewSlot'

export const Route = createFileRoute('/chat/$chatId')({
  component: ChatView,
})

/** Maps platform to its web app URL */
const PLATFORM_URLS: Record<string, string> = {
  telegram: 'https://web.telegram.org/k/',
  whatsapp: 'https://web.whatsapp.com',
  twitter: 'https://x.com',
}

function ChatView() {
  const { chatId } = Route.useParams()
  const workspaces = useSelector(workspaceStore, s => s.workspaces)
  const numericId = Number(chatId)

  // ─── Switching indicator ───────────────────────────────────────
  const [switching, setSwitching] = useState(false)

  useEffect(() => {
    setSwitching(true)
    const timer = setTimeout(() => setSwitching(false), 400)
    return () => clearTimeout(timer)
  }, [numericId])

  // Sync selected chat with the store
  useEffect(() => {
    selectChat(numericId)
  }, [numericId, selectChat])

  // Find the chat across all workspaces
  const allChats = workspaces.flatMap(w => w.chats)
  const chat = allChats.find(c => c.id === numericId)

  // Compute slot values (may be undefined when chat not found)
  const platformUrl = chat ? PLATFORM_URLS[chat.platform] ?? '' : ''
  const partition = chat ? `persist:${chat.platform}-${chat.id}` : ''
  const accentColor = chat
    ? (PLATFORM_META as Record<string, { color: string }>)[chat.platform]?.color
    : undefined

  // Webview slot: hooks must be called before any early returns.
  // When chat is not found, the slotRef won't be attached to DOM and the
  // webview stays hidden in the pool.
  const webviewId = chat ? `chat-${chat.platform}-${chat.id}` : ''
  const slotRef = useWebviewSlot(webviewId, platformUrl, partition)

  if (!chat) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        Conversation not found
      </div>
    )
  }

  return (
    <div
      className="h-full flex flex-col relative rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700"
      style={{ zIndex: 1 }}
    >
     {/* Switching indicator bar */}
     {switching && (
       <div
         className="switching-indicator"
         style={{ '--bar-color': accentColor } as React.CSSProperties}
       />
     )}
     {platformUrl ? (
       <div ref={slotRef} className="flex-1" />
     ) : (
       <div className="flex items-center justify-center flex-1 text-gray-500">
         Unsupported platform: {chat.platform}
       </div>
     )}
    </div>
  )
}
