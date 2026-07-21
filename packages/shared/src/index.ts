import { z } from 'zod'

// ========== Scheme ==========
export const SCHEME = 'multi-op'

// ========== App Phase ==========
export const ZAppPhase = z.enum(['init', 'ready', 'running', 'stopping', 'stopped'])
export type AppPhase = z.infer<typeof ZAppPhase>

// ========== App Events ==========
export const ZAppEvent = z.discriminatedUnion('type', [
  z.object({ type: z.literal('phase'), phase: ZAppPhase }),
  z.object({ type: z.literal('error'), error: z.string() }),
  z.object({ type: z.literal('window:ready') }),
  z.object({ type: z.literal('window:closed') }),
])
export type AppEvent = z.infer<typeof ZAppEvent>
