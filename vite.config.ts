import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: process.env.VITE_BASE || '/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icon.svg'],
      manifest: {
        name: 'Household Deal',
        short_name: 'Deal',
        description: 'A daily household chore lottery for the whole family.',
        theme_color: '#2c5a4c',
        background_color: '#f3ecdf',
        display: 'standalone',
        icons: [
          {
            src: 'icon.svg',
            sizes: '180x180',
            type: 'image/svg+xml',
            purpose: 'any',
          },
        ],
      },
    }),
  ],
  test: {
    environment: 'node',
  },
})
