import { appendFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { existsSync } from 'node:fs'
import type { LogEntry, Transport } from '../types'

export interface FileTransportOptions {
  dir?: string
  maxDays?: number
}

export class FileTransport implements Transport {
  private dir: string
  private maxDays: number
  private ready: Promise<void>

  constructor(options: FileTransportOptions = {}) {
    this.dir = options.dir ?? join(process.cwd(), 'logs')
    this.maxDays = options.maxDays ?? 30
    this.ready = this.init()
  }

  private async init(): Promise<void> {
    if (!existsSync(this.dir)) {
      await mkdir(this.dir, { recursive: true })
    }
    this.cleanOldLogs()
  }

  log(entry: LogEntry): void {
    this.ready.then(() => this.write(entry)).catch(() => {})
  }

  private async write(entry: LogEntry): Promise<void> {
    const date = new Date(entry.timestamp)
    const dateStr = date.toISOString().slice(0, 10)
    const filePath = join(this.dir, `app-${dateStr}.log`)

    const line = JSON.stringify({
      time: date.toISOString(),
      level: entry.level,
      source: entry.source,
      message: entry.message,
    })

    await appendFile(filePath, line + '\n', 'utf-8')
  }

  private async cleanOldLogs(): Promise<void> {
    try {
      const { readdir, unlink } = await import('node:fs/promises')
      const files = await readdir(this.dir)
      const cutoff = Date.now() - this.maxDays * 24 * 60 * 60 * 1000

      for (const file of files) {
        if (!file.startsWith('app-') || !file.endsWith('.log')) continue
        const match = file.match(/^app-(\d{4}-\d{2}-\d{2})\.log$/)
        if (!match) continue
        const fileDate = new Date(match[1])
        if (fileDate.getTime() < cutoff) {
          await unlink(join(this.dir, file))
        }
      }
    } catch {
      // silently ignore cleanup failures
    }
  }
}
