/**
 * Broadcast the current theme to all active Electron webview elements
 * via the webview.send() API so guest pages can adopt color-scheme.
 */
export function broadcastThemeToWebviews(mode: 'light' | 'dark' | 'system') {
  document.querySelectorAll('webview').forEach(el => {
    try {
      ;(el as HTMLElement & { send: (ch: string, ...args: unknown[]) => void }).send('theme-change', mode)
    } catch {
      // Webview might not be ready yet — ignore
    }
  })
}

/**
 * Send the current theme to a specific webview element.
 * Called when a new webview is created to apply the theme immediately.
 */
export function sendThemeToWebview(
  el: HTMLElement,
  mode: 'light' | 'dark' | 'system',
) {
  try {
    ;(el as HTMLElement & { send: (ch: string, ...args: unknown[]) => void }).send('theme-change', mode)
  } catch { /* ignore */ }
}
