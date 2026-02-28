import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    outDir: 'dist',
  },
  server: {
    host: '0.0.0.0', // You should keep this
    
    // Add the allowedHosts property below
    allowedHosts: [
      'https://study-snap-one.vercel.app' 
    ],
  },
  plugins: [
    react(),
    tailwindcss(),
  ],
})