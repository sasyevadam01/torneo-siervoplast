import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// In produzione l'app vive su https://<utente>.github.io/torneo-siervoplast/
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/torneo-siervoplast/' : '/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.png', 'apple-touch-icon.png', 'loghi/*.webp'],
      manifest: {
        name: 'Torneo Siervoplast',
        short_name: 'Torneo',
        description: 'Risultati, classifica e marcatori del torneo aziendale Siervoplast',
        lang: 'it',
        theme_color: '#0b0f0d',
        background_color: '#0b0f0d',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,webp,svg}'],
        // i dati arrivano sempre freschi da Supabase: niente cache delle API
        navigateFallbackDenylist: [/^\/rest/, /^\/auth/],
      },
    }),
  ],
}))
