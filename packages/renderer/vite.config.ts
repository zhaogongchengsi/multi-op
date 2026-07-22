import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import stylex from '@stylexjs/unplugin'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [
    tanstackRouter({ target: 'react', autoCodeSplitting: true }),
    stylex.vite({
      useCSSLayers: true,
      dev: process.env.NODE_ENV !== 'production',
      runtimeInjection: false,
    }),
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '~': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: './dist',
  },
  server: {
    port: 4173,
  },
})
