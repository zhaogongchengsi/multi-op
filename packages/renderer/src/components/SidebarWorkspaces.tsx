import {useState} from 'react'
import {useNavigate} from '@tanstack/react-router'
import {
  PlusIcon,
  MagnifyingGlassIcon,
  FolderPlusIcon,
  FolderIcon,
  PaperAirplaneIcon,
  ChatBubbleLeftRightIcon,
  HashtagIcon,
  ChatBubbleLeftEllipsisIcon,
} from '@heroicons/react/24/outline'
import {Divider} from '@astryxdesign/core/Divider'
import {
  SideNavItem,
  SideNavSection,
} from '@astryxdesign/core/SideNav'
import {MoreMenu} from '@astryxdesign/core/MoreMenu'
import {StatusDot} from '@astryxdesign/core/StatusDot'
import type {StatusDotVariant} from '@astryxdesign/core/StatusDot'
import {Stack, VStack} from '@astryxdesign/core/Stack'
import {Dialog, DialogHeader} from '@astryxdesign/core/Dialog'
import {TextInput} from '@astryxdesign/core/TextInput'
import {Layout, LayoutContent} from '@astryxdesign/core/Layout'
import {Button} from '@astryxdesign/core/Button'
import {PLATFORMS, PLATFORM_LABEL, PLATFORM_META} from '@multi-op/shared'
import {useWorkspaces} from '../stores/workspace'
import type {Workspace, Chat, ChatStatus} from '../stores/workspace'

// ─── Platform icon ────────────────────────────────────────────────
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
      className="w-4 h-4 shrink-0"
    />
  )
}

// ─── Status dot variant mapping ──────────────────────────────────
function statusVariant(status: ChatStatus): StatusDotVariant {
  switch (status) {
    case 'active':
      return 'success'
    case 'idle':
      return 'neutral'
    case 'needs-review':
      return 'warning'
    case 'in-progress':
      return 'accent'
    case 'blocked':
      return 'error'
  }
}

// ─── Conversation Item ───────────────────────────────────────────
function ConversationItem({
  chat,
  isSelected,
  onSelect,
}: {
  chat: Chat
  isSelected: boolean
  onSelect: () => void
}) {
  const [isHovered, setIsHovered] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isRenameOpen, setIsRenameOpen] = useState(false)
  const [renameValue, setRenameValue] = useState('')
  const [isGroupOpen, setIsGroupOpen] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [isCreatingGroup, setIsCreatingGroup] = useState(false)
  const { state, renameChat, deleteChat, createWorkspace, moveChat } = useWorkspaces()
  const showMenu = isHovered || isMenuOpen
  const realGroups = state.workspaces.filter(w => w.id !== -1)

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

  return (
    <>
      <Stack
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}>
        <SideNavItem
          label={chat.title}
          href="#"
          isSelected={isSelected}
          onClick={onSelect}
          icon={<PlatformIcon platform={chat.platform} />}
          endContent={
            showMenu ? (
              <MoreMenu
                size="sm"
                label="Conversation options"
                onOpenChange={setIsMenuOpen}
                items={[
                  {label: 'Pin', onClick: () => {}},
                  {label: 'Rename', onClick: handleRename},
                  {label: 'Move to group', onClick: () => setIsGroupOpen(true)},
                  {label: 'Archive', onClick: () => {}},
                  {label: 'Delete', onClick: () => deleteChat(chat.id)},
                ]}
              />
            ) : (
              <StatusDot variant={statusVariant(chat.status)} label={chat.status} />
            )
          }
        />
      </Stack>

      {/* Rename dialog */}
      <Dialog isOpen={isRenameOpen} onOpenChange={setIsRenameOpen} width={320}>
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
      <Dialog isOpen={isGroupOpen} onOpenChange={setIsGroupOpen} width={320}>
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
                <div className="border-t border-gray-200 my-2" />
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
            </LayoutContent>
          }
        />
      </Dialog>
    </>
  )
}

// ─── Workspace Group ─────────────────────────────────────────────
function WorkspaceGroup({
  workspace,
  selectedChatId,
  onSelectChat,
}: {
  workspace: Workspace
  selectedChatId: number | null
  onSelectChat: (id: number) => void
}) {
  return (
    <SideNavItem
      key={workspace.name}
      label={workspace.name}
      icon={FolderIcon}
      collapsible={{defaultIsCollapsed: false}}>
      <VStack gap={0.5}>
        {workspace.chats.map(chat => (
          <ConversationItem
            key={chat.id}
            chat={chat}
            isSelected={chat.id === selectedChatId}
            onSelect={() => onSelectChat(chat.id)}
          />
        ))}
      </VStack>
    </SideNavItem>
  )
}

// ─── Top-level Sidebar Workspaces List ───────────────────────────
export function SidebarWorkspaces() {
  const navigate = useNavigate()
  const {state, selectChat, createChat, createWorkspace, moveChat} = useWorkspaces()
  const {workspaces, selectedChatId} = state
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isGroupDialogOpen, setIsGroupDialogOpen] = useState(false)
  const [groupName, setGroupName] = useState('')
  const [isCreatingGroup, setIsCreatingGroup] = useState(false)

  const realGroups = workspaces.filter(ws => ws.id !== -1)
  const ungrouped = workspaces.find(ws => ws.id === -1)?.chats ?? []

  const handleSelectChat = (chatId: number) => {
    selectChat(chatId)
    navigate({ to: '/chat/$chatId', params: { chatId: String(chatId) } })
  }

  const handleNewChat = (platform: string) => {
    createChat(
      `${PLATFORM_LABEL[platform as keyof typeof PLATFORM_LABEL] ?? platform} Chat`,
      null,
      platform,
    )
    setIsDialogOpen(false)
  }

  const handleCreateGroup = async () => {
    if (!groupName.trim() || isCreatingGroup) return
    setIsCreatingGroup(true)
    try {
      await createWorkspace(groupName.trim())
      setGroupName('')
      setIsGroupDialogOpen(false)
    } catch {
      // error handled by store
    } finally {
      setIsCreatingGroup(false)
    }
  }

  return (
    <>
      <SideNavSection title="Menu" isHeaderHidden>
        <SideNavItem
          label="New chat"
          icon={PlusIcon}
          href="#"
          onClick={(e: React.MouseEvent) => {
            e.preventDefault()
            setIsDialogOpen(true)
          }}
        />
        <SideNavItem label="Search" icon={MagnifyingGlassIcon} href="#" />
        <SideNavItem
          label="New group"
          icon={FolderPlusIcon}
          href="#"
          onClick={(e: React.MouseEvent) => {
            e.preventDefault()
            setIsGroupDialogOpen(true)
          }}
        />
      </SideNavSection>
      <Divider />
      <SideNavSection title="Workspaces" isHeaderHidden>
        {realGroups.map(ws => (
          <WorkspaceGroup
            key={ws.id}
            workspace={ws}
            selectedChatId={selectedChatId}
            onSelectChat={handleSelectChat}
          />
        ))}
        {ungrouped.length > 0 && (
          <VStack gap={0.5}>
            {ungrouped.map(chat => (
              <ConversationItem
                key={chat.id}
                chat={chat}
                isSelected={chat.id === selectedChatId}
                onSelect={() => handleSelectChat(chat.id)}
              />
            ))}
          </VStack>
        )}
      </SideNavSection>

      <Dialog isOpen={isDialogOpen} onOpenChange={setIsDialogOpen} width={360}>
        <Layout
          header={<DialogHeader title="New session" onOpenChange={setIsDialogOpen} />}
          content={
            <LayoutContent>
              <Stack direction="horizontal" gap={1} justify="center" wrap="nowrap">
                {PLATFORMS.map(p => (
                  <Button
                    key={p}
                    label={PLATFORM_LABEL[p]}
                    variant="secondary"
                    isIconOnly
                    onClick={() => handleNewChat(p)}
                    icon={
                      (() => {
                        const Icon = PLATFORM_ICONS[p] ?? ChatBubbleLeftEllipsisIcon
                        return <Icon style={{ color: PLATFORM_META[p].color }} className="w-5 h-5" />
                      })()
                    }
                  />
                ))}
              </Stack>
            </LayoutContent>
          }
        />
      </Dialog>

      {/* New group dialog */}
      <Dialog isOpen={isGroupDialogOpen} onOpenChange={setIsGroupDialogOpen} width={360}>
        <Layout
          header={<DialogHeader title="New group" onOpenChange={setIsGroupDialogOpen} />}
          content={
            <LayoutContent>
              <Stack gap={1}>
                <TextInput
                  label="Group name"
                  isLabelHidden
                  placeholder="Group name"
                  value={groupName}
                  onChange={setGroupName}
                  onEnter={handleCreateGroup}
                  hasAutoFocus
                />
                <Button
                  label="Create"
                  variant="primary"
                  width="100%"
                  onClick={handleCreateGroup}
                  isLoading={isCreatingGroup}
                  isDisabled={!groupName.trim()}
                />
              </Stack>
            </LayoutContent>
          }
        />
      </Dialog>
    </>
  )
}
