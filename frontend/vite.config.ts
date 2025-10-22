import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { muiResolver } from './vite-mui-plugin'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [['babel-plugin-react-compiler']],
      },
    }),
    muiResolver(),
  ],
  optimizeDeps: {
    esbuildOptions: {
      mainFields: ['module', 'main'],
      resolveExtensions: ['.js', '.jsx', '.ts', '.tsx'],
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    },
    // ✅ Allow ngrok host
    allowedHosts: ['unsparingly-unskilled-conner.ngrok-free.dev','devserver-main--agrisupply.netlify.app']
  }
})
