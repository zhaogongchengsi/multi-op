import { Store } from '@tanstack/react-store'

export interface ActiveWebview {
  id: string
  chatId: number
  platform: string
}

export interface WebviewState {
  webviews: ActiveWebview[]
}

export const webviewStore = new Store<WebviewState>({
  webviews: [],
})

function parseWebviewId(id: string): { chatId: number; platform: string } | null {
  const match = id.match(/^chat-(.+)-(\d+)$/)
  if (!match) return null
  return { platform: match[1], chatId: Number(match[2]) }
}

export function addWebview(id: string) {
  const parsed = parseWebviewId(id)
  if (!parsed) return

  webviewStore.setState(s => {
    // Avoid duplicates
    if (s.webviews.some(w => w.id === id)) return s
    return {
      ...s,
      webviews: [...s.webviews, { id, ...parsed }],
    }
  })
}

export function removeWebview(id: string) {
  webviewStore.setState(s => ({
    ...s,
    webviews: s.webviews.filter(w => w.id !== id),
  }))
}
