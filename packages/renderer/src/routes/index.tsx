import {useState, useEffect, useCallback} from 'react'
import { createFileRoute } from '@tanstack/react-router'
import {AppShell} from '@astryxdesign/core/AppShell'
import {Divider} from '@astryxdesign/core/Divider'
import {Layout, LayoutContent, LayoutFooter} from '@astryxdesign/core/Layout'
import {
  SideNav,
  SideNavHeading,
  SideNavItem,
  SideNavSection,
} from '@astryxdesign/core/SideNav'
import {MoreMenu} from '@astryxdesign/core/MoreMenu'
import {StatusDot} from '@astryxdesign/core/StatusDot'
import type {StatusDotVariant} from '@astryxdesign/core/StatusDot'
import {Card} from '@astryxdesign/core/Card'
import {Stack, VStack, HStack} from '@astryxdesign/core/Stack'
import {
  PlusIcon,
  MagnifyingGlassIcon,
  BookOpenIcon,
  Cog6ToothIcon,
  UserCircleIcon,
  UserIcon,
  BuildingOffice2Icon,
  CodeBracketIcon,
  MinusIcon,
  Square2StackIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import { IconType } from '@astryxdesign/core';

type Conversation = {
  label: string
  status: StatusDotVariant
  statusLabel: string
}

type Workspace = {
  name: string
  icon: IconType
  chats: Conversation[]
}

const WORKSPACES: Workspace[] = [
  {
    name: 'Personal',
    icon: UserIcon,
    chats: [
      {label: 'Weekend trip planning', status: 'success', statusLabel: 'Active'},
      {label: 'Recipe ideas for the week', status: 'neutral', statusLabel: 'Idle'},
      {label: 'Book recommendations', status: 'warning', statusLabel: 'Needs review'},
      {label: 'Home workout plan', status: 'neutral', statusLabel: 'Idle'},
    ],
  },
  {
    name: 'Acme Corp',
    icon: BuildingOffice2Icon,
    chats: [
      {label: 'Q3 roadmap draft', status: 'accent', statusLabel: 'In progress'},
      {label: 'Customer onboarding flow', status: 'success', statusLabel: 'Active'},
      {label: 'Pricing strategy review', status: 'warning', statusLabel: 'Needs review'},
      {label: 'Standup summary', status: 'neutral', statusLabel: 'Idle'},
    ],
  },
  {
    name: 'Open Source',
    icon: CodeBracketIcon,
    chats: [
      {label: 'StyleX migration notes', status: 'accent', statusLabel: 'In progress'},
      {label: 'Skeleton loading states', status: 'success', statusLabel: 'Active'},
      {label: 'Accessibility audit', status: 'error', statusLabel: 'Blocked'},
      {label: 'Release notes v4.0', status: 'neutral', statusLabel: 'Idle'},
    ],
  },
]

const SELECTED_CHAT = 'StyleX migration notes'

const MESSAGES = [
  {role: 'assistant' as const, width: '78%', height: 104},
  {role: 'user' as const, width: '48%', height: 48},
  {role: 'assistant' as const, width: '64%', height: 132},
  {role: 'user' as const, width: '38%', height: 40},
]

function ConversationItem({
  label,
  status,
  statusLabel,
  isSelected,
}: {
  label: string
  status: StatusDotVariant
  statusLabel: string
  isSelected?: boolean
}) {
  const [isHovered, setIsHovered] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const showMenu = isHovered || isMenuOpen

  return (
    <Stack
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}>
      <SideNavItem
        label={label}
        href="#"
        isSelected={isSelected}
        endContent={
          showMenu ? (
            <MoreMenu
              size="sm"
              label="Conversation options"
              onOpenChange={setIsMenuOpen}
              items={[
                {label: 'Pin', onClick: () => {}},
                {label: 'Rename', onClick: () => {}},
                {label: 'Archive', onClick: () => {}},
                {label: 'Delete', onClick: () => {}},
              ]}
            />
          ) : (
            <StatusDot variant={status} label={statusLabel} />
          )
        }
      />
    </Stack>
  )
}

const isWin = navigator.platform.startsWith('Win')

function ShellSideNav() {
  const [isMaximized, setIsMaximized] = useState(false)

  useEffect(() => {
    if (!window.windowControls) return
    window.windowControls.onMaximizedChange(setIsMaximized)
  }, [])

  const handleMinimize = useCallback(() => window.windowControls?.minimize(), [])
  const handleMaximize = useCallback(() => window.windowControls?.maximize(), [])
  const handleClose = useCallback(() => window.windowControls?.close(), [])

  return (
    <>
      <AppShell
        contentPadding={0}
        topNav={
          <div className="w-full h-12 flex items-center justify-between px-4 app-shell-top-nav">
            {
              isWin && <div className="title-bar-controls">
                <button className="title-bar-btn" onClick={handleMinimize} aria-label="Minimize">
                  <MinusIcon className="size-3.5" />
                </button>
                <button className="title-bar-btn" onClick={handleMaximize} aria-label={isMaximized ? 'Restore' : 'Maximize'}>
                  <Square2StackIcon className="size-3.5" />
                </button>
                <button className="title-bar-btn title-bar-close" onClick={handleClose} aria-label="Close">
                  <XMarkIcon className="size-3.5" />
                </button>
              </div>
            }
          </div>
        }
        sideNav={
          <SideNav
            collapsible
            resizable={{defaultWidth: 300, minWidth: 220, maxWidth: 420}}
            footer={
              <SideNavSection title="Account" isHeaderHidden>
                <SideNavItem label="Settings" icon={Cog6ToothIcon} href="#" />
                <SideNavItem label="Sarah Chen" icon={UserCircleIcon} href="#" />
              </SideNavSection>
            }>
            <SideNavSection title="Menu" isHeaderHidden>
              <SideNavItem label="New chat" icon={PlusIcon} href="#" />
              <SideNavItem label="Search" icon={MagnifyingGlassIcon} href="#" />
              <SideNavItem label="Library" icon={BookOpenIcon} href="#" />
            </SideNavSection>
            <Divider />
            <SideNavSection title="Workspaces" isHeaderHidden>
              {WORKSPACES.map(workspace => (
                <SideNavItem
                  key={workspace.name}
                  label={workspace.name}
                  icon={workspace.icon}
                  collapsible={{defaultIsCollapsed: false}}>
                  <VStack gap={0.5}>
                    {workspace.chats.map(chat => (
                      <ConversationItem
                        key={chat.label}
                        label={chat.label}
                        status={chat.status}
                        statusLabel={chat.statusLabel}
                        isSelected={chat.label === SELECTED_CHAT}
                      />
                    ))}
                  </VStack>
                </SideNavItem>
              ))}
            </SideNavSection>
          </SideNav>
        }>
        <Layout
          height="fill"
          contentWidth={768}
          content={
            <LayoutContent padding={6}>
              <VStack gap={5}>
                {MESSAGES.map((message, mi) => (
                  <HStack
                    key={mi}
                    hAlign={message.role === 'assistant' ? 'start' : 'end'}>
                    <Card
                      variant="muted"
                      padding={0}
                      width={message.width}
                      height={message.height}
                    />
                  </HStack>
                ))}
              </VStack>
            </LayoutContent>
          }
          footer={
            <LayoutFooter>
              <Card variant="muted" padding={0} width="100%" height={56} />
            </LayoutFooter>
          }
        />
      </AppShell>
    </>
  )
}

export const Route = createFileRoute('/')({
  component: ShellSideNav,
})
