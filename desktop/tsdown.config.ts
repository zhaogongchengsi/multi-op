import { defineConfig } from 'tsdown'

const isProd = process.env.NODE_ENV === 'production'

export default defineConfig({
  entry: {
    main: 'src/main.ts',
    preload: 'src/preload.ts',
  },
  format: ['esm'],
  platform: 'node',
  dts: false,
  sourcemap: true,
  shims: true,
  define: {
    'import.meta.env.DEV': JSON.stringify(!isProd),
    'import.meta.env.PROD': JSON.stringify(isProd),
    'import.meta.env.MODE': JSON.stringify(isProd ? 'production' : 'development'),
  },
  deps: {
    neverBundle: ['electron', 'better-sqlite3', '@libsql/client', '@multi-op/database'],
  },
})
