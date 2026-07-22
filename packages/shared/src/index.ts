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

// ========== Platform ==========
export const PLATFORMS = ['telegram', 'whatsapp', 'twitter'] as const
export const ZPlatform = z.enum(PLATFORMS)
export type Platform = z.infer<typeof ZPlatform>

export const PLATFORM_LABEL: Record<Platform, string> = {
  telegram: 'Telegram',
  whatsapp: 'WhatsApp',
  twitter: 'Twitter',
}

export const PLATFORM_META: Record<Platform, { label: string; short: string; color: string }> = {
  telegram: { label: 'Telegram', short: 'TG', color: '#0088cc' },
  whatsapp: { label: 'WhatsApp', short: 'WA', color: '#25D366' },
  twitter: { label: 'Twitter', short: 'TW', color: '#1DA1F2' },
}

// ========== Platform Connection Configs ==========
export const ZTelegramConfig = z.object({
  apiId: z.number(),
  apiHash: z.string().min(1),
  phoneNumber: z.string().optional(),
  sessionString: z.string().optional(),
})
export type TelegramConfig = z.infer<typeof ZTelegramConfig>

export const ZWhatsAppConfig = z.object({
  phoneNumberId: z.string().min(1),
  businessAccountId: z.string().optional(),
  apiToken: z.string().optional(),
})
export type WhatsAppConfig = z.infer<typeof ZWhatsAppConfig>

export const ZTwitterConfig = z.object({
  apiKey: z.string().min(1),
  apiSecret: z.string().min(1),
  accessToken: z.string().optional(),
  accessSecret: z.string().optional(),
  bearerToken: z.string().optional(),
})
export type TwitterConfig = z.infer<typeof ZTwitterConfig>

export type PlatformConfig = TelegramConfig | WhatsAppConfig | TwitterConfig

// ========== Account ==========
export const ZAccountStatus = z.enum(['active', 'inactive'])
export type AccountStatus = z.infer<typeof ZAccountStatus>

export const ZSessionStatus = z.enum(['active', 'expired', 'disconnected'])
export type SessionStatus = z.infer<typeof ZSessionStatus>

export const ZAccount = z.object({
  id: z.number(),
  platform: ZPlatform,
  label: z.string(),
  configJson: z.string(),
  isActive: z.boolean(),
  position: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
})
export type Account = z.infer<typeof ZAccount>

export const ZSession = z.object({
  id: z.number(),
  accountId: z.number(),
  status: ZSessionStatus,
  token: z.string().nullable(),
  expiresAt: z.string().nullable(),
  createdAt: z.string(),
})
export type Session = z.infer<typeof ZSession>
