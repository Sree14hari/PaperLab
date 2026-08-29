import react from '@astrojs/react'
import sitemap from '@astrojs/sitemap'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'astro/config'
import vercel from '@astrojs/vercel'

// https://astro.build/config
export default defineConfig({
  adapter: vercel(),
  integrations: [react(), sitemap()],
  vite: {
    plugins: [tailwindcss()],
  },
  site: 'https://paperlab.r3actr.work',
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'ja'],
    routing: {
      fallbackType: 'rewrite',
      prefixDefaultLocale: false,
    },
  },
})
