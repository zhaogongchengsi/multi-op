import React, { useEffect, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useWorkspaces } from '~/stores/workspace'
import { PLATFORM_META } from '@multi-op/shared'
import { useWebContentOverlay } from '~/contexts/webcontent-overlay'

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
  const { state, selectChat } = useWorkspaces()
  const numericId = Number(chatId)

  // ─── Switching indicator ───────────────────────────────────────
  const [switching, setSwitching] = useState(false)

  useEffect(() => {
    setSwitching(true)
    const timer = setTimeout(() => setSwitching(false), 400)
    return () => clearTimeout(timer)
  }, [numericId])

  // ─── Overlay hiding (dialogs on top of native WebContentsView) ─
  const { hidden: overlayActive } = useWebContentOverlay()

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
  const accentColor = (PLATFORM_META as Record<string, { color: string }>)[chat.platform]?.color

  return (
    <div className="h-full flex flex-col relative">
     {/* Switching indicator bar */}
     {switching && (
       <div
         className="switching-indicator"
         style={{ '--bar-color': accentColor } as React.CSSProperties}
       />
     )}
     {platformUrl ? (
       React.createElement('web-content', {
         key: numericId,
         src: platformUrl,
         partition,
         hidden: overlayActive || undefined,
         className: 'flex-1 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700',
       })
     ) : (
       <div className="flex items-center justify-center flex-1 text-gray-500">
         Unsupported platform: {chat.platform}
       </div>
     )}
    </div>
  )
}
