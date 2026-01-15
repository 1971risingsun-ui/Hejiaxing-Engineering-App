
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import process from 'node:process';

export default defineConfig(({ mode }) => {
  // Fix: Cast process to any to access cwd() when type definitions for Node's process are not fully available.
  const env = loadEnv(mode, (process as any).cwd(), '');
  const LOGO_PATH = './logo.png';
  
  return {
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: [LOGO_PATH, 'favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
        manifest: {
          name: '合家興行政管理系統',
          short_name: '合家興行政',
          description: '合家興行政管理系統',
          theme_color: '#0f172a',
          background_color: '#f8fafc',
          display: 'standalone',
          orientation: 'portrait',
          scope: './',
          start_url: './',
          icons: [
            {
              src: LOGO_PATH,
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: LOGO_PATH,
              sizes: '512x512',
              type: 'image/png'
            },
            {
              src: LOGO_PATH,
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable'
            }
          ]
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/cdn\.tailwindcss\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'tailwind-cdn',
                expiration: {
                  maxEntries: 1,
                  maxAgeSeconds: 60 * 60 * 24 * 30, // 30 Days
                },
              },
            },
            {
                urlPattern: /^https:\/\/cdnjs\.cloudflare\.com\/.*/i,
                handler: 'StaleWhileRevalidate',
                options: {
                  cacheName: 'external-libs'
                }
            }
          ]
        }
      })
    ],
    base: './',
    define: {
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
    },
  };
});
