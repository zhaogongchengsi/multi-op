import {useState} from 'react'
import {useNavigate} from '@tanstack/react-router'
import {
  PlusIcon,
  MagnifyingGlassIcon,
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
  onRename,
  onDelete,
}: {
  chat: Chat
  isSelected: boolean
  onSelect: () => void
  onRename: (title: string) => void
  onDelete: () => void
}) {
  const [isHovered, setIsHovered] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const showMenu = isHovered || isMenuOpen

  return (
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
                {label: 'Rename', onClick: () => onRename(chat.title)},
                {label: 'Archive', onClick: () => {}},
                {label: 'Delete', onClick: onDelete},
              ]}
            />
          ) : (
            <StatusDot variant={statusVariant(chat.status)} label={chat.status} />
          )
        }
      />
    </Stack>
  )
}

// ─── Workspace Group ─────────────────────────────────────────────
function WorkspaceGroup({
  workspace,
  selectedChatId,
  onSelectChat,
  onRenameChat,
  onDeleteChat,
}: {
  workspace: Workspace
  selectedChatId: number | null
  onSelectChat: (id: number) => void
  onRenameChat: (id: number, title: string) => void
  onDeleteChat: (id: number) => void
}) {
  return (
    <SideNavItem
      key={workspace.name}
      label={workspace.name}
      collapsible={{defaultIsCollapsed: false}}>
      <VStack gap={0.5}>
        {workspace.chats.map(chat => (
          <ConversationItem
            key={chat.id}
            chat={chat}
            isSelected={chat.id === selectedChatId}
            onSelect={() => onSelectChat(chat.id)}
            onRename={(title) => onRenameChat(chat.id, title)}
            onDelete={() => onDeleteChat(chat.id)}
          />
        ))}
      </VStack>
    </SideNavItem>
  )
}

// ─── Top-level Sidebar Workspaces List ───────────────────────────
export function SidebarWorkspaces() {
  const navigate = useNavigate()
  const {state, selectChat, createChat, renameChat, deleteChat} = useWorkspaces()
  const {workspaces, selectedChatId} = state
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const hasRealGroups = workspaces.some(ws => ws.id !== -1)

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
      </SideNavSection>
      <Divider />
      <SideNavSection title="Workspaces" isHeaderHidden>
        {hasRealGroups ? (
          workspaces
            .filter(ws => ws.id !== -1 || ws.chats.length > 0)
            .map(ws => (
              <WorkspaceGroup
                key={ws.id}
                workspace={ws}
                selectedChatId={selectedChatId}
                onSelectChat={handleSelectChat}
                onRenameChat={renameChat}
                onDeleteChat={deleteChat}
              />
            ))
        ) : (
          <VStack gap={0.5}>
            {workspaces.flatMap(ws => ws.chats).map(chat => (
              <ConversationItem
                key={chat.id}
                chat={chat}
                isSelected={chat.id === selectedChatId}
                onSelect={() => handleSelectChat(chat.id)}
                onRename={(title) => renameChat(chat.id, title)}
                onDelete={() => deleteChat(chat.id)}
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
              <VStack gap={1}>
                {PLATFORMS.map(p => (
                  <Button
                    key={p}
                    label={PLATFORM_LABEL[p]}
                    variant="ghost"
                    width="100%"
                    onClick={() => handleNewChat(p)}
                    icon={
                      <span
                        style={{
                          display: 'inline-block',
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          backgroundColor: PLATFORM_META[p].color,
                        }}
                      />
                    }
                  />
                ))}
              </VStack>
            </LayoutContent>
          }
        />
      </Dialog>
    </>
  )
}
