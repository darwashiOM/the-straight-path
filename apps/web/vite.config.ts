/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import mdx from '@mdx-js/rollup';
import remarkFrontmatter from 'remark-frontmatter';
import remarkMdxFrontmatter from 'remark-mdx-frontmatter';
import remarkGfm from 'remark-gfm';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'node:path';

export default defineConfig({
  plugins: [
    {
      enforce: 'pre',
      ...mdx({
        remarkPlugins: [remarkFrontmatter, remarkMdxFrontmatter, remarkGfm],
      }),
    },
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: [
        'favicon.svg',
        'apple-touch-icon.png',
        'icon-192.png',
        'icon-512.png',
        'icon-maskable-512.png',
        'offline.html',
        'og-default.svg',
        'robots.txt',
      ],
      // Keep manifest inline so it stays in sync with the app; the static
      // public/manifest.webmanifest remains for direct fetches but the
      // plugin emits its own and rewires the <link rel="manifest"> href.
      manifest: {
        name: 'The Straight Path',
        short_name: 'Straight Path',
        description: 'A pastoral, accessible introduction to Islam.',
        start_url: '/',
        scope: '/',
        id: '/',
        display: 'standalone',
        orientation: 'any',
        lang: 'en',
        dir: 'ltr',
        background_color: '#FAF7F1',
        theme_color: '#0F5F5C',
        categories: ['education', 'books', 'lifestyle'],
        icons: [
          { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml' },
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          {
            src: '/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
          { src: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
        ],
        shortcuts: [
          {
            name: "Read the Qur'an",
            short_name: "Qur'an",
            description: "Open the Qur'an reader",
            url: '/quran',
            icons: [{ src: '/icon-192.png', sizes: '192x192', type: 'image/png' }],
          },
          {
            name: 'Articles',
            short_name: 'Articles',
            description: 'Read articles and essays',
            url: '/learn/articles',
            icons: [{ src: '/icon-192.png', sizes: '192x192', type: 'image/png' }],
          },
          {
            name: 'FAQ',
            short_name: 'FAQ',
            description: 'Common questions',
            url: '/faq',
            icons: [{ src: '/icon-192.png', sizes: '192x192', type: 'image/png' }],
          },
        ],
      },
      workbox: {
        // Precache the hashed app-shell assets.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest,woff,woff2}'],
        // Skip precaching gigantic source maps.
        globIgnores: ['**/*.map', 'sw.js', 'workbox-*.js'],
        // SPA shell fallback: any same-origin navigation not matched by a
        // precached URL resolves to the React app shell so client-side routes
        // (including /ar/*) render correctly when served from the SW cache.
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/__/, /^\/api\//, /^\/sw\.js/, /^\/workbox-/, /\/sitemap\.xml$/, /\/robots\.txt$/, /\/ai\.txt$/, /\/llms.*\.txt$/, /\/manifest\.webmanifest$/],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        runtimeCaching: [
          {
            // Qur'an API — prefer fresh data, fall back to cache when offline.
            urlPattern: ({ url }) => url.origin === 'https://quran.com',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'quran-api',
              networkTimeoutSeconds: 6,
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Google Fonts stylesheets.
            urlPattern: ({ url }) => url.origin === 'https://fonts.googleapis.com',
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-stylesheets',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 365 days
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Google Fonts webfont files.
            urlPattern: ({ url }) => url.origin === 'https://fonts.gstatic.com',
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 365 days
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Same-origin images.
            urlPattern: ({ request, sameOrigin }) => sameOrigin && request.destination === 'image',
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'images',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
            },
          },
          {
            // SPA navigation: NetworkFirst so new deploys appear promptly;
            // on failure, Workbox serves the precached app shell (index.html).
            // The dedicated /offline.html is used only when the precache is
            // itself unavailable.
            urlPattern: ({ request, sameOrigin }) =>
              sameOrigin && request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'pages',
              networkTimeoutSeconds: 4,
              plugins: [
                {
                  handlerDidError: async () =>
                    (await caches.match('/offline.html')) ?? Response.error(),
                },
              ],
            },
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    strictPort: false,
  },
  build: {
    sourcemap: true,
    target: 'es2020',
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          firebase: ['firebase/app', 'firebase/firestore', 'firebase/auth'],
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
});
