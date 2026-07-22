import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: {
    main: 'src/main.ts',
    preload: 'src/preload.ts',
  },
  format: ['esm'],
  platform: 'node',
  dts: false,
  sourcemap: true,
  deps: {
    neverBundle: ['electron', 'better-sqlite3', '@multi-op/database', '@multi-op/renderer'],
  },
})
