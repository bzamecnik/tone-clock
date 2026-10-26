/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  // relative asset paths: the app works at any path, e.g. /tone-clock/ on
  // GitHub Pages
  base: './',
  plugins: [
    react(),
    // installable and working offline; a new version is fetched in the
    // background and used on the next start
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.png', 'apple-touch-icon.png'],
      manifest: {
        name: 'Tone Clock',
        short_name: 'Tone Clock',
        description: 'Explore chords, scales and keys on a circle of the 12 pitch classes.',
        start_url: '.',
        scope: '.',
        display: 'standalone',
        theme_color: '#86b359',
        background_color: '#ffffff',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
})
