import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { crx } from '@crxjs/vite-plugin'

// Use require instead of import with assert
const manifest = require('./public/manifest.json')

export default defineConfig({
  plugins: [react(), tailwindcss(), crx({ manifest })],
})