/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
  server: {
    port: parseInt(process.env.VITE_PORT || '5273'),
    host: true,
    allowedHosts: [
      'mikebarnes.tail67dcb4.ts.net',
      'host.docker.internal',
      ...(process.env.VITE_ALLOWED_HOST ? [process.env.VITE_ALLOWED_HOST] : []),
    ],
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:8180',
        changeOrigin: true,
      },
    },
  },
})
