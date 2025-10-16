import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    host: '0.0.0.0', // You should keep this
    
    // Add the allowedHosts property below
    allowedHosts: [
      '2aed94cda9c6.ngrok-free.app' 
    ],
  },
  plugins: [
    react(),
    tailwindcss(),
  ],
})