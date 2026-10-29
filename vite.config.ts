/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    // Offline-first: precache the app shell plus the ONNX runtime, the
    // MNIST model, and the PDF worker so the full lifecycle (including
    // neural inference and document parsing) works in airplane mode.
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons.svg'],
      manifest: {
        name: 'SmartInk — Infinite Canvas Smart Notebook',
        short_name: 'SmartInk',
        description:
          'Infinite-canvas smart notebook with on-device handwriting math.',
        start_url: '.',
        display: 'standalone',
        background_color: '#07090e',
        theme_color: '#059669',
        icons: [
          {
            src: 'favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any',
          },
        ],
      },
      workbox: {
        // The ONNX WASM runtime (~10.5 MB) exceeds workbox's 2 MB default.
        maximumFileSizeToCacheInBytes: 20 * 1024 * 1024,
        globPatterns: ['**/*.{js,css,html,svg,wasm,onnx}'],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
  server: {
    port: 5173,
    host: true,
  },
});
