import type { LogEntry, Transport } from '../types'

/**
 * Transport that sends log entries from renderer to main process via
 * the `window.loggerAPI` bridge exposed by the preload script.
 */
export class IPCBridgeTransport implements Transport {
  log(entry: LogEntry): void {
    const api = (globalThis as Record<string, unknown>).loggerAPI as
      | { log: (level: string, ...args: unknown[]) => void }
      | undefined

    if (api?.log) {
      api.log(entry.level, ...entry.args)
    }
  }
}
