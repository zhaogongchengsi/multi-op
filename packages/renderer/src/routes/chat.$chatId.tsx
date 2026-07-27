import React, { useEffect, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useStore } from '@tanstack/react-store'
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
  const workspaces = useStore(workspaceStore, s => s.workspaces)
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

  if (!chat) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        Conversation not found
      </div>
    )
  }

  const platformUrl = PLATFORM_URLS[chat.platform]
  const partition = `persist:${chat.platform}-${chat.id}`
  const accentColor = (PLATFORM_META as Record<string, { color: string }>)[chat.platform]?.color

  // Webview slot: the webview lives in a body-level pool container and is
  // positioned absolutely over this ref. Z-index is 0 so DOM dialogs on
  // #root naturally appear above. Session persists because webview never
  // leaves the DOM.
  const webviewId = `chat-${chat.platform}-${chat.id}`
  const slotRef = useWebviewSlot(webviewId, platformUrl, partition)

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
