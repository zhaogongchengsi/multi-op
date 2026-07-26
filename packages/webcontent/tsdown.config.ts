import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: {
    'main/index': 'src/main/index.ts',
    'renderer/index': 'src/renderer/index.ts',
    'preload/index': 'src/preload/index.ts',
  },
  deps: {
    neverBundle: ['electron'],
  },
})
