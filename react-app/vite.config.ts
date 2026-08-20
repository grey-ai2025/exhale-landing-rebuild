import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Builds to ../react so the existing static server (and Vercel) can serve it
// alongside the vanilla versions, under /react/.
export default defineConfig({
  plugins: [react()],
  // Served from a GitHub Pages subpath, so assets need the repo name too.
  base: '/exhale-landing-rebuild/react/',
  build: {
    outDir: '../react',
    emptyOutDir: true,
  },
})
