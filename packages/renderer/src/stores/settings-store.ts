import { Store } from '@tanstack/react-store'

// ─── Types ───────────────────────────────────────────────────────

export type ThemeMode = 'light' | 'dark' | 'system'

export interface SettingsState {
  /** Theme color mode */
  theme: ThemeMode
  /** Whether to launch the app on system startup */
  launchAtStartup: boolean
  /** Whether settings have been loaded from the backend */
  loaded: boolean
}

// ─── Store ───────────────────────────────────────────────────────

export const settingsStore = new Store<SettingsState>({
  theme: 'system',
  launchAtStartup: false,
  loaded: false,
})

// ─── Selectors ────────────────────────────────────────────────────

export function selectTheme(s: SettingsState) {
  return s.theme
}

export function selectLaunchAtStartup(s: SettingsState) {
  return s.launchAtStartup
}

export function selectSettingsLoaded(s: SettingsState) {
  return s.loaded
}

// ─── Actions ──────────────────────────────────────────────────────

const CONFIG = () => window.bridge?.services?.config

/** Load persisted settings from the backend into the store. Call once on app init. */
export async function loadSettings(): Promise<void> {
  const config = CONFIG()
  if (!config) return

  try {
    const [themeResult, appResult] = await Promise.all([
      config.read('settings.theme'),
      config.read('settings.app'),
    ])

    settingsStore.setState(s => ({
      ...s,
      theme: (themeResult?.data as { mode?: ThemeMode })?.mode ?? s.theme,
      launchAtStartup: (appResult?.data as { launchAtStartup?: boolean })?.launchAtStartup ?? s.launchAtStartup,
      loaded: true,
    }))
  } catch {
    settingsStore.setState(s => ({ ...s, loaded: true }))
  }
}

/** Set the theme mode and persist. */
export async function setTheme(mode: ThemeMode): Promise<void> {
  settingsStore.setState(s => ({ ...s, theme: mode }))

  const config = CONFIG()
  if (!config) return
  config.write('settings.theme', { mode }).catch(() => {})
}

/** Set auto-launch preference and persist. */
export async function setLaunchAtStartup(enabled: boolean): Promise<void> {
  settingsStore.setState(s => ({ ...s, launchAtStartup: enabled }))

  const config = CONFIG()
  if (!config) return
  config.write('settings.app', { launchAtStartup: enabled }).catch(() => {})

  // Also update the OS-level auto-launch setting via IPC
  window.bridge?.services?.autoLaunch?.set(enabled)
}
