import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Builds to ../react so the existing static server (and Vercel) can serve it
// alongside the vanilla versions, under /react/.
export default defineConfig({
  plugins: [react()],
  base: '/react/',
  build: {
    outDir: '../react',
    emptyOutDir: true,
  },
})
