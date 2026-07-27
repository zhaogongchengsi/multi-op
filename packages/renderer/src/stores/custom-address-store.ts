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
  loaded: boolean
}

// ─── Store ───────────────────────────────────────────────────────
export const customAddressStore = new Store<CustomAddressState>({
  addresses: [],
  loaded: false,
})

// ─── Helpers ──────────────────────────────────────────────────────

function config() {
  return window.bridge?.services?.config
}

function persist() {
  const { addresses } = customAddressStore.state
  config()?.write('settings.custom-addresses', { addresses }).catch(() => {})
}

// ─── Actions ─────────────────────────────────────────────────────

/** Load persisted addresses from the backend into the store. Call once on app init. */
export async function loadCustomAddresses(): Promise<void> {
  const cfg = config()
  if (!cfg) {
    customAddressStore.setState(s => ({ ...s, loaded: true }))
    return
  }

  try {
    const result = await cfg.read('settings.custom-addresses')
    const data = result?.data as { addresses?: CustomAddress[] } | undefined
    const addresses = data?.addresses ?? []
    customAddressStore.setState(() => ({ addresses, loaded: true }))
  } catch {
    customAddressStore.setState(s => ({ ...s, loaded: true }))
  }
}

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
  persist()
}

export function removeAddress(id: string) {
  customAddressStore.setState(s => ({
    ...s,
    addresses: s.addresses.filter(a => a.id !== id),
  }))
  persist()
}

export function updateAddress(
  id: string,
  updates: { name?: string; url?: string; icon?: string | null },
) {
  customAddressStore.setState(s => ({
    ...s,
    addresses: s.addresses.map(a => (a.id === id ? { ...a, ...updates } : a)),
  }))
  persist()
}
