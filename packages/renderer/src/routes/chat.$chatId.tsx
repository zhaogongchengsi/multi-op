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
  const { state, selectChat, renameChat, createWorkspace, moveChat } = useWorkspaces()
  const numericId = Number(chatId)

  // Rename dialog
  const [isRenameOpen, setIsRenameOpen] = useState(false)
  const [renameValue, setRenameValue] = useState('')

  // Move-to-group dialog
  const [isGroupOpen, setIsGroupOpen] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [isCreatingGroup, setIsCreatingGroup] = useState(false)

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

  const handleRename = () => {
    setRenameValue(chat.title)
    setIsRenameOpen(true)
  }

  const handleRenameConfirm = () => {
    if (renameValue.trim()) {
      renameChat(chat.id, renameValue.trim())
    }
    setIsRenameOpen(false)
  }

  const handleMoveGroup = (groupId: number | null) => {
    moveChat(chat.id, groupId)
    setIsGroupOpen(false)
  }

  const handleCreateAndMove = async () => {
    if (!newGroupName.trim()) return
    setIsCreatingGroup(true)
    try {
      const newId = await createWorkspace(newGroupName.trim())
      moveChat(chat.id, newId)
    } finally {
      setIsCreatingGroup(false)
      setNewGroupName('')
      setIsGroupOpen(false)
    }
  }

  const realGroups = state.workspaces.filter(w => w.id !== -1)

  return (
    <div className="p-4 h-full flex flex-col">
      <Card>
        <Stack gap={1} align="center">
          <PlatformIcon platform={chat.platform} />
          <div className="font-semibold text-lg flex-1">{chat.title}</div>
          <MoreMenu
            label="Chat options"
            items={[
              { label: 'Rename', onClick: handleRename },
              { label: 'Move to group', onClick: () => setIsGroupOpen(true) },
            ]}
          />
        </Stack>
        <div className="text-sm text-gray-500">
          Status: {chat.status} · ID: {chat.id}
        </div>
      </Card>

      {/* Rename dialog */}
      <Dialog isOpen={isRenameOpen} onOpenChange={setIsRenameOpen} width={360}>
        <Layout
          header={<DialogHeader title="Rename conversation" onOpenChange={setIsRenameOpen} />}
          content={
            <LayoutContent>
              <Stack gap={1}>
                <TextInput
                  label="Name"
                  isLabelHidden
                  placeholder="Conversation name"
                  value={renameValue}
                  onChange={setRenameValue}
                  onEnter={handleRenameConfirm}
                  hasAutoFocus
                />
                <Button label="Save" variant="primary" width="100%" onClick={handleRenameConfirm} />
              </Stack>
            </LayoutContent>
          }
        />
      </Dialog>

      {/* Move to group dialog */}
      <Dialog isOpen={isGroupOpen} onOpenChange={setIsGroupOpen} width={360}>
        <Layout
          header={<DialogHeader title="Move to group" onOpenChange={setIsGroupOpen} />}
          content={
            <LayoutContent>
              <Stack gap={0.5}>
                <Button
                  label="Ungrouped"
                  variant="ghost"
                  width="100%"
                  onClick={() => handleMoveGroup(null)}
                />
                {realGroups.map(g => (
                  <Button
                    key={g.id}
                    label={g.name}
                    variant="ghost"
                    width="100%"
                    onClick={() => handleMoveGroup(g.id)}
                  />
                ))}
                <Stack gap={0.5}>
                  <TextInput
                    label="New group name"
                    isLabelHidden
                    placeholder="New group name"
                    value={newGroupName}
                    onChange={setNewGroupName}
                    onEnter={handleCreateAndMove}
                  />
                  <Button
                    label="Create & move"
                    variant="secondary"
                    width="100%"
                    onClick={handleCreateAndMove}
                    isLoading={isCreatingGroup}
                    isDisabled={!newGroupName.trim()}
                  />
                </Stack>
              </Stack>
            </LayoutContent>
          }
        />
      </Dialog>
    </div>
  )
}
