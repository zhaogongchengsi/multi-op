import { defineConfig } from 'tsdown'

const isProd = process.env.NODE_ENV === 'production'

const common = {
  platform: 'node' as const,
  dts: false,
  sourcemap: true,
  define: {
    'import.meta.env.DEV': JSON.stringify(!isProd),
    'import.meta.env.PROD': JSON.stringify(isProd),
    'import.meta.env.MODE': JSON.stringify(isProd ? 'production' : 'development'),
  },
}

export default defineConfig([
  // ─── Main & preload (ESM) ───────────────────────────────────
  {
    ...common,
    entry: { main: 'src/main.ts', preload: 'src/preload.ts' },
    format: ['esm'],
    shims: true,
    deps: {
      neverBundle: ['electron', 'better-sqlite3', '@libsql/client', '@multi-op/database'],
    },
  },
  // ─── Webview preload (CJS — webview sandbox doesn't support ESM) ──
  {
    ...common,
    entry: { 'webview-preload': 'src/webview-preload.ts' },
    format: ['cjs'],
    shims: false,
    outDir: 'dist',
    deps: { neverBundle: ['electron'] },
  },
])
