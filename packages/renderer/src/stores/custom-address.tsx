import { createContext, useContext, useReducer, useCallback, type ReactNode } from 'react'

// ─── Types ───────────────────────────────────────────────────────
export interface CustomAddress {
  id: string
  name: string
  url: string
  icon: string | null // base64 data URL from uploaded image
  createdAt: number
}

export interface CustomAddressState {
  addresses: CustomAddress[]
}

// ─── Actions ─────────────────────────────────────────────────────
type CustomAddressAction =
  | { type: 'ADD'; payload: Omit<CustomAddress, 'id' | 'createdAt'> }
  | { type: 'REMOVE'; payload: string }
  | { type: 'UPDATE'; payload: { id: string; name?: string; url?: string; icon?: string | null } }

function reducer(state: CustomAddressState, action: CustomAddressAction): CustomAddressState {
  switch (action.type) {
    case 'ADD': {
      const address: CustomAddress = {
        ...action.payload,
        id: crypto.randomUUID(),
        createdAt: Date.now(),
      }
      return { ...state, addresses: [...state.addresses, address] }
    }
    case 'REMOVE':
      return { ...state, addresses: state.addresses.filter(a => a.id !== action.payload) }
    case 'UPDATE':
      return {
        ...state,
        addresses: state.addresses.map(a =>
          a.id === action.payload.id ? { ...a, ...action.payload } : a,
        ),
      }
    default:
      return state
  }
}

// ─── Context ─────────────────────────────────────────────────────
interface CustomAddressContextValue {
  state: CustomAddressState
  addAddress: (addr: Omit<CustomAddress, 'id' | 'createdAt'>) => void
  removeAddress: (id: string) => void
  updateAddress: (id: string, updates: { name?: string; url?: string; icon?: string | null }) => void
}

const CustomAddressContext = createContext<CustomAddressContextValue | null>(null)

const initialState: CustomAddressState = {
  addresses: [],
}

// ─── Provider ────────────────────────────────────────────────────
export function CustomAddressProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState)

  const addAddress = useCallback(
    (addr: Omit<CustomAddress, 'id' | 'createdAt'>) => dispatch({ type: 'ADD', payload: addr }),
    [],
  )

  const removeAddress = useCallback((id: string) => dispatch({ type: 'REMOVE', payload: id }), [])

  const updateAddress = useCallback(
    (id: string, updates: { name?: string; url?: string; icon?: string | null }) =>
      dispatch({ type: 'UPDATE', payload: { id, ...updates } }),
    [],
  )

  return (
    <CustomAddressContext.Provider value={{ state, addAddress, removeAddress, updateAddress }}>
      {children}
    </CustomAddressContext.Provider>
  )
}

// ─── Hook ────────────────────────────────────────────────────────
export function useCustomAddresses(): CustomAddressContextValue {
  const ctx = useContext(CustomAddressContext)
  if (!ctx) {
    throw new Error('useCustomAddresses must be used within a <CustomAddressProvider>')
  }
  return ctx
}
