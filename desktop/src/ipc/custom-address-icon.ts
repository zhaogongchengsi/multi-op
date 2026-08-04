import { net } from 'electron'
import { logger } from '../logger.js'

function isValidHttpUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

function extractLinkAttr(tag: string, attr: 'rel' | 'href'): string | null {
  const match = tag.match(new RegExp(`\\b${attr}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i'))
  if (!match) return null
  const value = match[2] ?? match[3] ?? match[4] ?? ''
  return value.trim() || null
}

function resolveUrl(baseUrl: string, href: string): string | null {
  try {
    const resolved = new URL(href, baseUrl)
    return isValidHttpUrl(resolved.href) ? resolved.href : null
  } catch {
    return null
  }
}

function collectIconCandidates(html: string, pageUrl: string): string[] {
  const links = html.match(/<link\b[^>]*>/gi) ?? []
  const candidates: string[] = []
  const seen = new Set<string>()

  for (const tag of links) {
    const rel = extractLinkAttr(tag, 'rel')
    const href = extractLinkAttr(tag, 'href')
    if (!rel || !href || !/\bicon\b/i.test(rel)) continue

    const absoluteUrl = resolveUrl(pageUrl, href)
    if (!absoluteUrl || seen.has(absoluteUrl)) continue

    seen.add(absoluteUrl)
    candidates.push(absoluteUrl)
  }

  const fallbackIcon = resolveUrl(pageUrl, '/favicon.ico')
  if (fallbackIcon && !seen.has(fallbackIcon)) {
    candidates.push(fallbackIcon)
  }

  return candidates
}

function inferImageType(iconUrl: string, headerType: string | null): string | null {
  const normalized = headerType?.split(';')[0]?.trim().toLowerCase() ?? null
  if (normalized?.startsWith('image/')) return normalized

  try {
    const pathname = new URL(iconUrl).pathname.toLowerCase()
    if (pathname.endsWith('.ico')) return 'image/x-icon'
    if (pathname.endsWith('.png')) return 'image/png'
    if (pathname.endsWith('.svg')) return 'image/svg+xml'
    if (pathname.endsWith('.jpg') || pathname.endsWith('.jpeg')) return 'image/jpeg'
    if (pathname.endsWith('.webp')) return 'image/webp'
  } catch {
    return null
  }

  return null
}

export async function fetchIconAsDataUrl(iconUrl: string): Promise<string | null> {
  try {
    const res = await net.fetch(iconUrl, { redirect: 'follow' })
    if (!res.ok) return null

    const imageType = inferImageType(iconUrl, res.headers.get('content-type'))
    if (!imageType) return null

    const bytes = Buffer.from(await res.arrayBuffer())
    if (bytes.length === 0) return null

    return `data:${imageType};base64,${bytes.toString('base64')}`
  } catch (error) {
    logger.warn('Failed to fetch icon candidate', { iconUrl, error: String(error) })
    return null
  }
}

export async function resolveCustomAddressIcon(rawUrl: string): Promise<string | null> {
  if (!isValidHttpUrl(rawUrl)) return null

  try {
    const page = await net.fetch(rawUrl, { redirect: 'follow' })
    if (!page.ok) {
      logger.warn('Failed to fetch custom address html', { url: rawUrl, status: page.status })
      return null
    }

    const html = await page.text()
    const pageUrl = page.url || rawUrl
    const candidates = collectIconCandidates(html, pageUrl)

    for (const iconUrl of candidates) {
      const dataUrl = await fetchIconAsDataUrl(iconUrl)
      if (dataUrl) return dataUrl
    }
  } catch (error) {
    logger.warn('Failed to resolve custom address icon', { url: rawUrl, error: String(error) })
  }

  return null
}
