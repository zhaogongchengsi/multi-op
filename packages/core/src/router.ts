import { protocol, session } from 'electron'
import { SCHEME } from '@multi-op/shared'

export type RouteHandler = (
  request: Request,
  url: URL,
) => Response | Promise<Response>

interface RouteEntry {
  method: string
  pathname: string
  handler: RouteHandler
}

export interface RouterConfig {
  scheme?: string
  privilege?: {
    standard: boolean
    secure: boolean
    supportFetchAPI: boolean
    corsEnabled: boolean
    stream: boolean
  }
}

export class Router {
  private routes: RouteEntry[] = []
  private sseConnections = new Map<string, Set<(data: unknown) => void>>()
  private config: Required<RouterConfig>

  constructor(config: RouterConfig = {}) {
    this.config = {
      scheme: config.scheme ?? SCHEME,
      privilege: {
        standard: true,
        secure: true,
        supportFetchAPI: true,
        corsEnabled: true,
        stream: true,
        ...config.privilege,
      },
    }
  }

  get scheme() {
    return this.config.scheme
  }

  /** 注册自定义协议 (app ready 前调用) */
  registerPrivileged() {
    protocol.registerSchemesAsPrivileged([
      {
        scheme: this.config.scheme,
        privileges: this.config.privilege,
      },
    ])
  }

  /** 注册到 session (app ready 后调用) */
  registerToSession(sess?: Electron.Session) {
    const target = sess ?? session.defaultSession
    target.protocol.handle(this.config.scheme, this.handleRequest.bind(this))
  }

  // ========== Route Registration ==========
  get(pathname: string, handler: RouteHandler) {
    this.addRoute('GET', pathname, handler)
  }

  post(pathname: string, handler: RouteHandler) {
    this.addRoute('POST', pathname, handler)
  }

  put(pathname: string, handler: RouteHandler) {
    this.addRoute('PUT', pathname, handler)
  }

  delete(pathname: string, handler: RouteHandler) {
    this.addRoute('DELETE', pathname, handler)
  }

  /** SSE (Server-Sent Events) endpoint */
  sse(pathname: string, handler: (send: (data: unknown) => void) => void) {
    this.get(pathname, () => {
      const stream = new ReadableStream({
        start: (controller) => {
          const send = (data: unknown) => {
            const text = `data: ${JSON.stringify(data)}\n\n`
            controller.enqueue(new TextEncoder().encode(text))
          }
          handler(send)
        },
      })
      return new Response(stream, {
        headers: { 'content-type': 'text/event-stream', 'cache-control': 'no-cache' },
      })
    })
  }

  private addRoute(method: string, pathname: string, handler: RouteHandler) {
    // 支持路径参数 :param
    this.routes.push({ method, pathname, handler })
  }

  private handleRequest: Electron.ProtocolHandler = (request, callback) => {
    const url = new URL(request.url)
    const method = request.method

    // 路由匹配 (支持路径参数)
    for (const route of this.routes) {
      if (route.method !== method) continue
      const match = this.matchPath(route.pathname, url.pathname)
      if (match) {
        const response = route.handler(request, url)
        if (response instanceof Promise) {
          response.then(callback).catch((err) => {
            callback(new Response(err.message, { status: 500 }))
          })
        } else {
          callback(response)
        }
        return
      }
    }

    callback(new Response('Not Found', { status: 404 }))
  }

  private matchPath(pattern: string, actual: string): boolean {
    const patternParts = pattern.split('/')
    const actualParts = actual.split('/')

    if (patternParts.length !== actualParts.length) return false

    for (let i = 0; i < patternParts.length; i++) {
      if (patternParts[i].startsWith(':')) continue // 路径参数
      if (patternParts[i] !== actualParts[i]) return false
    }
    return true
  }
}

export function createRouter(config?: RouterConfig) {
  return new Router(config)
}
