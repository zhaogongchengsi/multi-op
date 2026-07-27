import { Store } from '@tanstack/react-store'

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

// ─── Store ───────────────────────────────────────────────────────
export const customAddressStore = new Store<CustomAddressState>({
  addresses: [],
})

// ─── Actions ─────────────────────────────────────────────────────

export function addAddress(addr: Omit<CustomAddress, 'id' | 'createdAt'>) {
  const address: CustomAddress = {
    ...addr,
    id: crypto.randomUUID(),
    createdAt: Date.now(),
  }
  customAddressStore.setState(s => ({
    ...s,
    addresses: [...s.addresses, address],
  }))
}

export function removeAddress(id: string) {
  customAddressStore.setState(s => ({
    ...s,
    addresses: s.addresses.filter(a => a.id !== id),
  }))
}

export function updateAddress(
  id: string,
  updates: { name?: string; url?: string; icon?: string | null },
) {
  customAddressStore.setState(s => ({
    ...s,
    addresses: s.addresses.map(a => (a.id === id ? { ...a, ...updates } : a)),
  }))
}
