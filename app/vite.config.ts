import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { brand } from './src/config/brand'

// Locally the app is the whole site (served at /). In the combined Vercel deploy (see the root
// README) it's assembled under /app/ alongside the static choice and promo pages, so its own
// asset paths, PWA scope and service worker all need that prefix. Vercel sets VERCEL=1 during
// its build; nothing else does, so local `npm run dev` / `npm run build` are unaffected.
const onVercel = !!process.env.VERCEL
const base = onVercel ? '/app/' : '/'

export default defineConfig({
  base,
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      injectManifest: { globPatterns: ['**/*.{js,css,html,svg,png,woff2}'] },
      manifest: {
        name: brand.name,
        short_name: brand.shortName,
        description: brand.tagline,
        theme_color: brand.colors.green,
        background_color: brand.colors.light.ground,
        display: 'standalone',
        start_url: base,
        scope: base,
        icons: [
          { src: `${base}icons/icon-192.png`, sizes: '192x192', type: 'image/png' },
          { src: `${base}icons/icon-512.png`, sizes: '512x512', type: 'image/png' },
          { src: `${base}icons/icon-maskable-512.png`, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
})
