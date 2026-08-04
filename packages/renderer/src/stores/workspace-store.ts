import { Store } from '@tanstack/react-store'

// ─── Types ───────────────────────────────────────────────────────
export type ChatStatus = 'active' | 'idle' | 'needs-review' | 'in-progress' | 'blocked'

export interface Chat {
  id: number
  title: string
  status: ChatStatus
  platform: string
  url?: string
  avatar?: string | null
  groupId: number | null
}

export interface Workspace {
  id: number
  name: string
  parentId: number | null
  chats: Chat[]
}

export interface WorkspaceState {
  workspaces: Workspace[]
  selectedChatId: number | null
  loading: boolean
  error: string | null
}

// ─── Helpers ─────────────────────────────────────────────────────
function mapStatus(dbStatus: string | null): ChatStatus {
  switch (dbStatus) {
    case 'active':
      return 'active'
    case 'idle':
      return 'idle'
    case 'blocked':
      return 'blocked'
    case 'in_progress':
      return 'in-progress'
    default:
      return 'idle'
  }
}

// ─── Store ───────────────────────────────────────────────────────
export const workspaceStore = new Store<WorkspaceState>({
  workspaces: [],
  selectedChatId: null,
  loading: false,
  error: null,
})

// ─── Actions ─────────────────────────────────────────────────────

export function selectChat(chatId: number | null) {
  workspaceStore.setState(s => ({ ...s, selectedChatId: chatId }))
}

export async function loadAll() {
  workspaceStore.setState(s => ({ ...s, loading: true, error: null }))
  try {
    const { bridge } = window
    if (!bridge) {
      workspaceStore.setState(s => ({ ...s, loading: false }))
      return
    }

    const [groupRes, sessionRes] = await Promise.all([
      bridge.services.group.list(),
      bridge.services.session.list(),
    ])

    type SessionRecord = { id: number; title?: string; status?: string | null; platform: string; url?: string; avatar?: string | null; groupId: number | null }
    const groupMap = new Map<number, SessionRecord[]>()
    for (const s of sessionRes.data as SessionRecord[]) {
      const key = s.groupId ?? -1
      if (!groupMap.has(key)) groupMap.set(key, [])
      groupMap.get(key)!.push(s)
    }

    const workspaces: Workspace[] = (groupRes.data as { id: number; name: string; parentId: number | null }[]).map(g => ({
      id: g.id,
      name: g.name,
      parentId: g.parentId,
      chats: (groupMap.get(g.id) ?? []).map(s => ({
        id: s.id,
        title: s.title ?? 'Untitled',
        status: mapStatus(s.status ?? null),
        platform: s.platform,
        url: s.url,
        avatar: s.avatar ?? null,
        groupId: s.groupId,
      })),
    }))

    const ungrouped = (groupMap.get(-1) ?? []).map(s => ({
      id: s.id,
      title: s.title ?? 'Untitled',
      status: mapStatus(s.status ?? null),
      platform: s.platform,
      url: s.url,
      avatar: s.avatar ?? null,
      groupId: s.groupId,
    }))

    if (ungrouped.length > 0) {
      workspaces.unshift({
        id: -1,
        name: 'Ungrouped',
        parentId: null,
        chats: ungrouped,
      })
    }

    workspaceStore.setState(s => ({ ...s, workspaces, loading: false }))
  } catch (e) {
    workspaceStore.setState(s => ({ ...s, error: String(e), loading: false }))
  }
}

export async function createWorkspace(name: string, parentId: number | null = null): Promise<number> {
  try {
    const res = await window.bridge.services.group.create({ name, parentId })
    const g = res.data as { id: number; name: string; parentId: number | null }
    const ws: Workspace = { id: g.id, name: g.name, parentId: g.parentId, chats: [] }
    workspaceStore.setState(s => ({ ...s, workspaces: [...s.workspaces, ws] }))
    return g.id
  } catch (e) {
    workspaceStore.setState(s => ({ ...s, error: String(e) }))
    throw e
  }
}

export async function renameWorkspace(id: number, name: string) {
  try {
    await window.bridge.services.group.update(id, { name })
    workspaceStore.setState(s => ({
      ...s,
      workspaces: s.workspaces.map(w => (w.id === id ? { ...w, name } : w)),
    }))
  } catch (e) {
    workspaceStore.setState(s => ({ ...s, error: String(e) }))
  }
}

export async function deleteWorkspace(id: number) {
  try {
    await window.bridge.services.group.delete(id)
    workspaceStore.setState(s => ({
      ...s,
      workspaces: s.workspaces.filter(w => w.id !== id),
    }))
  } catch (e) {
    workspaceStore.setState(s => ({ ...s, error: String(e) }))
  }
}

export async function createChat(
  title: string,
  groupId: number | null,
  platform: string = 'default',
  url?: string,
  avatar?: string | null,
) {
  try {
    const res = await window.bridge.services.session.create({
      platform,
      url,
      avatar,
      title,
      groupId,
      status: 'active',
    })
    const s = res.data as { id: number; title?: string; platform: string; url?: string; avatar?: string | null; groupId: number | null }
    const chat: Chat = {
      id: s.id,
      title: s.title ?? 'Untitled',
      status: 'active',
      platform: s.platform,
      url: s.url,
      avatar: s.avatar ?? null,
      groupId: s.groupId,
    }

    workspaceStore.setState(state => {
      const targetId = chat.groupId ?? -1
      const targetExists = state.workspaces.some(w => w.id === targetId)
      if (!targetExists) {
        return {
          ...state,
          workspaces: [
            { id: -1, name: 'Ungrouped', parentId: null, chats: [chat] },
            ...state.workspaces,
          ],
        }
      }
      return {
        ...state,
        workspaces: state.workspaces.map(w =>
          w.id === targetId ? { ...w, chats: [...w.chats, chat] } : w,
        ),
      }
    })
  } catch (e) {
    workspaceStore.setState(s => ({ ...s, error: String(e) }))
  }
}

export async function renameChat(id: number, title: string) {
  try {
    await window.bridge.services.session.update(id, { title })
    workspaceStore.setState(s => ({
      ...s,
      workspaces: s.workspaces.map(w => ({
        ...w,
        chats: w.chats.map(c => (c.id === id ? { ...c, title } : c)),
      })),
    }))
  } catch (e) {
    workspaceStore.setState(s => ({ ...s, error: String(e) }))
  }
}

export async function deleteChat(id: number) {
  try {
    await window.bridge.services.session.delete(id)
    workspaceStore.setState(s => ({
      ...s,
      selectedChatId: s.selectedChatId === id ? null : s.selectedChatId,
      workspaces: s.workspaces.map(w => ({
        ...w,
        chats: w.chats.filter(c => c.id !== id),
      })),
    }))
  } catch (e) {
    workspaceStore.setState(s => ({ ...s, error: String(e) }))
  }
}

export async function moveChat(chatId: number, toGroupId: number | null) {
  try {
    // Find current groupId for the optimistic update
    const state = workspaceStore.state
    let fromGroupId: number | null = null
    for (const ws of state.workspaces) {
      const found = ws.chats.find(c => c.id === chatId)
      if (found) {
        fromGroupId = found.groupId
        break
      }
    }

    await window.bridge.services.session.update(chatId, { groupId: toGroupId })

    workspaceStore.setState(s => {
      let movedChat: Chat | undefined
      const workspacesAfterRemove = s.workspaces.map(w => {
        const filtered = w.chats.filter(c => c.id !== chatId)
        if (filtered.length !== w.chats.length) {
          movedChat = w.chats.find(c => c.id === chatId)
        }
        return { ...w, chats: filtered }
      })

      if (!movedChat) return s

      const updatedChat = { ...movedChat, groupId: toGroupId }
      const targetId = toGroupId ?? -1
      const targetExists = workspacesAfterRemove.some(w => w.id === targetId)

      if (!targetExists) {
        return {
          ...s,
          workspaces: [
            { id: -1, name: 'Ungrouped', parentId: null, chats: [updatedChat] },
            ...workspacesAfterRemove,
          ],
        }
      }

      return {
        ...s,
        workspaces: workspacesAfterRemove.map(w =>
          w.id === targetId ? { ...w, chats: [...w.chats, updatedChat] } : w,
        ),
      }
    })
  } catch (e) {
    workspaceStore.setState(s => ({ ...s, error: String(e) }))
  }
}
