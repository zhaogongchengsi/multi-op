import { defineConfig } from 'tsdown'

export default defineConfig({
  workspace: [
    'packages/shared',
    'packages/core',
    'packages/database',
    'packages/logger',
    'desktop',
  ],
  entry: ['src/index.ts'],
  format: ['esm'],
  platform: 'node',
  dts: true,
  sourcemap: true,
  clean: true,
  deps: { onlyBundle: false },
})


