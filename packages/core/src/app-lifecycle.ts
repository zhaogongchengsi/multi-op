import type { AppPhase } from '@multi-op/shared'

type PhaseListener = (phase: AppPhase, prev: AppPhase) => void

export class AppLifecycle {
  private _phase: AppPhase = 'init'
  private listeners = new Set<PhaseListener>()

  get phase(): AppPhase {
    return this._phase
  }

  onChange(listener: PhaseListener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private transition(next: AppPhase): void {
    const prev = this._phase
    this._phase = next
    this.listeners.forEach((fn) => fn(next, prev))
  }

  start(): void {
    this.transition('ready')
    this.transition('running')
  }

  stop(): void {
    this.transition('stopping')
    this.transition('stopped')
  }

  onError(_error: Error): void {
    this.transition('stopped')
  }
}
