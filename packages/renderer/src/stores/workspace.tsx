import { createContext, useContext, useReducer, useCallback, useEffect, type ReactNode } from 'react'

// ─── Types ───────────────────────────────────────────────────────
export type ChatStatus = 'active' | 'idle' | 'needs-review' | 'in-progress' | 'blocked'

export interface Chat {
  id: number
  title: string
  status: ChatStatus
  platform: string
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

// ─── Actions ─────────────────────────────────────────────────────
type WorkspaceAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_WORKSPACES'; payload: Workspace[] }
  | { type: 'SET_SELECTED_CHAT'; payload: number | null }
  | { type: 'ADD_WORKSPACE'; payload: Workspace }
  | { type: 'UPDATE_WORKSPACE'; payload: { id: number; name: string } }
  | { type: 'DELETE_WORKSPACE'; payload: number }
  | { type: 'ADD_CHAT'; payload: Chat }
  | { type: 'UPDATE_CHAT'; payload: { id: number; title: string } }
  | { type: 'DELETE_CHAT'; payload: number }
  | { type: 'SET_CHATS'; payload: { groupId: number | null; chats: Chat[] } }
  | { type: 'MOVE_CHAT'; payload: { chatId: number; toGroupId: number | null; fromGroupId: number | null } }

function workspaceReducer(state: WorkspaceState, action: WorkspaceAction): WorkspaceState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload }
    case 'SET_ERROR':
      return { ...state, error: action.payload }
    case 'SET_WORKSPACES':
      return { ...state, workspaces: action.payload }
    case 'SET_SELECTED_CHAT':
      return { ...state, selectedChatId: action.payload }
    case 'ADD_WORKSPACE':
      return { ...state, workspaces: [...state.workspaces, action.payload] }
    case 'UPDATE_WORKSPACE':
      return {
        ...state,
        workspaces: state.workspaces.map(w =>
          w.id === action.payload.id ? { ...w, name: action.payload.name } : w,
        ),
      }
    case 'DELETE_WORKSPACE':
      return {
        ...state,
        workspaces: state.workspaces.filter(w => w.id !== action.payload),
      }
    case 'ADD_CHAT': {
      // null groupId → Ungrouped (id: -1)
      const targetId = action.payload.groupId ?? -1
      const targetExists = state.workspaces.some(w => w.id === targetId)
      if (!targetExists) {
        return {
          ...state,
          workspaces: [
            { id: -1, name: 'Ungrouped', parentId: null, chats: [action.payload] },
            ...state.workspaces,
          ],
        }
      }
      return {
        ...state,
        workspaces: state.workspaces.map(w =>
          w.id === targetId
            ? { ...w, chats: [...w.chats, action.payload] }
            : w,
        ),
      }
    }
    case 'UPDATE_CHAT':
      return {
        ...state,
        workspaces: state.workspaces.map(w => ({
          ...w,
          chats: w.chats.map(c =>
            c.id === action.payload.id ? { ...c, title: action.payload.title } : c,
          ),
        })),
      }
    case 'DELETE_CHAT':
      return {
        ...state,
        selectedChatId: state.selectedChatId === action.payload ? null : state.selectedChatId,
        workspaces: state.workspaces.map(w => ({
          ...w,
          chats: w.chats.filter(c => c.id !== action.payload),
        })),
      }
    case 'SET_CHATS':
      return {
        ...state,
        workspaces: state.workspaces.map(w =>
          w.id === action.payload.groupId
            ? { ...w, chats: action.payload.chats }
            : w,
        ),
      }
    case 'MOVE_CHAT': {
      const { chatId, toGroupId } = action.payload
      // Find the chat across all workspaces
      let movedChat: Chat | undefined
      const workspacesAfterRemove = state.workspaces.map(w => {
        const filtered = w.chats.filter(c => c.id !== chatId)
        if (filtered.length !== w.chats.length) {
          movedChat = w.chats.find(c => c.id === chatId)
        }
        return { ...w, chats: filtered }
      })

      if (!movedChat) return state

      const updatedChat = { ...movedChat, groupId: toGroupId }
      const targetId = toGroupId ?? -1
      const targetExists = workspacesAfterRemove.some(w => w.id === targetId)

      if (!targetExists) {
        return {
          ...state,
          workspaces: [
            { id: -1, name: 'Ungrouped', parentId: null, chats: [updatedChat] },
            ...workspacesAfterRemove,
          ],
        }
      }

      return {
        ...state,
        workspaces: workspacesAfterRemove.map(w =>
          w.id === targetId
            ? { ...w, chats: [...w.chats, updatedChat] }
            : w,
        ),
      }
    }
    default:
      return state
  }
}

// ─── Context ─────────────────────────────────────────────────────
interface WorkspaceContextValue {
  state: WorkspaceState
  /** Load all groups and their sessions from bridge */
  loadAll: () => Promise<void>
  /** Select a chat */
  selectChat: (chatId: number | null) => void
  /** Create a new workspace (group) */
  createWorkspace: (name: string, parentId?: number | null) => Promise<number>
  /** Rename a workspace */
  renameWorkspace: (id: number, name: string) => Promise<void>
  /** Delete a workspace */
  deleteWorkspace: (id: number) => Promise<void>
  /** Create a new chat (session) */
  createChat: (title: string, groupId: number | null, platform?: string) => Promise<void>
  /** Rename a chat */
  renameChat: (id: number, title: string) => Promise<void>
  /** Delete a chat */
  deleteChat: (id: number) => Promise<void>
  /** Move a chat to a different group (null = ungrouped) */
  moveChat: (chatId: number, toGroupId: number | null) => Promise<void>
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null)

// ─── Initial state ───────────────────────────────────────────────
const initialState: WorkspaceState = {
  workspaces: [],
  selectedChatId: null,
  loading: false,
  error: null,
}

// ─── Provider ────────────────────────────────────────────────────
export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(workspaceReducer, initialState)

  const loadAll = useCallback(async () => {
    dispatch({ type: 'SET_LOADING', payload: true })
    dispatch({ type: 'SET_ERROR', payload: null })
    try {
      const { bridge } = window
      if (!bridge) {
        // Fallback: no bridge (dev without Electron)
        dispatch({ type: 'SET_LOADING', payload: false })
        return
      }
      const [groupRes, sessionRes] = await Promise.all([
        bridge.services.group.list(),
        bridge.services.session.list(),
      ])

      const groupMap = new Map<number, SessionRecord[]>()
      for (const s of sessionRes.data) {
        const key = s.groupId ?? -1
        if (!groupMap.has(key)) groupMap.set(key, [])
        groupMap.get(key)!.push(s)
      }

      const workspaces: Workspace[] = groupRes.data.map(g => ({
        id: g.id,
        name: g.name,
        parentId: g.parentId,
        chats: (groupMap.get(g.id) ?? []).map(s => ({
          id: s.id,
          title: s.title ?? 'Untitled',
          status: mapStatus(s.status),
          platform: s.platform,
          groupId: s.groupId,
        })),
      }))

      // Also include ungrouped sessions
      const ungrouped = (groupMap.get(-1) ?? []).map(s => ({
        id: s.id,
        title: s.title ?? 'Untitled',
        status: mapStatus(s.status),
        platform: s.platform,
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

      dispatch({ type: 'SET_WORKSPACES', payload: workspaces })
    } catch (e) {
      dispatch({ type: 'SET_ERROR', payload: String(e) })
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false })
    }
  }, [])

  const selectChat = useCallback((chatId: number | null) => {
    dispatch({ type: 'SET_SELECTED_CHAT', payload: chatId })
  }, [])

  const createWorkspace = useCallback(async (name: string, parentId: number | null = null): Promise<number> => {
    try {
      const res = await window.bridge.services.group.create({ name, parentId })
      const g = res.data
      const ws: Workspace = {
        id: g.id,
        name: g.name,
        parentId: g.parentId,
        chats: [],
      }
      dispatch({ type: 'ADD_WORKSPACE', payload: ws })
      return g.id
    } catch (e) {
      dispatch({ type: 'SET_ERROR', payload: String(e) })
      throw e
    }
  }, [])

  const renameWorkspace = useCallback(async (id: number, name: string) => {
    try {
      await window.bridge.services.group.update(id, { name })
      dispatch({ type: 'UPDATE_WORKSPACE', payload: { id, name } })
    } catch (e) {
      dispatch({ type: 'SET_ERROR', payload: String(e) })
    }
  }, [])

  const deleteWorkspace = useCallback(async (id: number) => {
    try {
      await window.bridge.services.group.delete(id)
      dispatch({ type: 'DELETE_WORKSPACE', payload: id })
    } catch (e) {
      dispatch({ type: 'SET_ERROR', payload: String(e) })
    }
  }, [])

  const createChat = useCallback(async (title: string, groupId: number | null, platform: string = 'default') => {
    try {
      const res = await window.bridge.services.session.create({
        platform,
        title,
        groupId,
        status: 'active',
      })
      const s = res.data
      const chat: Chat = {
        id: s.id,
        title: s.title ?? 'Untitled',
        status: 'active',
        platform: s.platform,
        groupId: s.groupId,
      }
      dispatch({ type: 'ADD_CHAT', payload: chat })
    } catch (e) {
      dispatch({ type: 'SET_ERROR', payload: String(e) })
    }
  }, [])

  const renameChat = useCallback(async (id: number, title: string) => {
    try {
      await window.bridge.services.session.update(id, { title })
      dispatch({ type: 'UPDATE_CHAT', payload: { id, title } })
    } catch (e) {
      dispatch({ type: 'SET_ERROR', payload: String(e) })
    }
  }, [])

  const deleteChat = useCallback(async (id: number) => {
    try {
      await window.bridge.services.session.delete(id)
      dispatch({ type: 'DELETE_CHAT', payload: id })
    } catch (e) {
      dispatch({ type: 'SET_ERROR', payload: String(e) })
    }
  }, [])

  const moveChat = useCallback(async (chatId: number, toGroupId: number | null) => {
    try {
      // Find current groupId for the optimistic update
      let fromGroupId: number | null = null
      for (const ws of state.workspaces) {
        const found = ws.chats.find(c => c.id === chatId)
        if (found) {
          fromGroupId = found.groupId
          break
        }
      }
      await window.bridge.services.session.update(chatId, { groupId: toGroupId })
      dispatch({ type: 'MOVE_CHAT', payload: { chatId, toGroupId, fromGroupId } })
    } catch (e) {
      dispatch({ type: 'SET_ERROR', payload: String(e) })
    }
  }, [state.workspaces])

  // Load on mount
  useEffect(() => {
    if (window.bridge) {
      loadAll()
    }
  }, [loadAll])

  return (
    <WorkspaceContext.Provider
      value={{
        state,
        loadAll,
        selectChat,
        createWorkspace,
        renameWorkspace,
        deleteWorkspace,
        createChat,
        renameChat,
        deleteChat,
        moveChat,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  )
}

// ─── Hook ────────────────────────────────────────────────────────
export function useWorkspaces(): WorkspaceContextValue {
  const ctx = useContext(WorkspaceContext)
  if (!ctx) {
    throw new Error('useWorkspaces must be used within a <WorkspaceProvider>')
  }
  return ctx
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
