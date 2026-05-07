import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },

  server: {
    host: true,
    port: 5174,
    strictPort: true,
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },

  build: {
    target: 'esnext',
    minify: 'terser',
    terserOptions: {
      format: {
        comments: false,
      },
    } as any,
    sourcemap: false,
    // Main bundle is ~625KB: framework (React/Router/Radix), Supabase, lightbox,
    // shared UI. Heavy/rarely-visited routes already lazy-loaded via React.lazy
    // in App.tsx. Bumping warning limit to silence the noise.
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        // Split vendor groups so app-only deploys don't bust the heavy
        // framework/UI chunk caches. Long-tail repeat-visit TTI win.
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('@radix-ui')) return 'vendor-radix';
          if (id.includes('framer-motion')) return 'vendor-framer';
          if (id.includes('@supabase')) return 'vendor-supabase';
          if (id.includes('yet-another-react-lightbox')) return 'vendor-lightbox';
          if (id.includes('react-helmet-async')) return 'vendor-helmet';
          if (id.includes('lucide-react')) return 'vendor-lucide';
          if (id.includes('vaul') || id.includes('cmdk') || id.includes('sonner') || id.includes('embla')) return 'vendor-ui-extras';
          if (id.includes('react-hook-form') || id.includes('@hookform') || id.includes('zod') || id.includes('react-day-picker') || id.includes('date-fns')) return 'vendor-forms';
          if (id.includes('nuqs')) return 'vendor-nuqs';
          if (
            /node_modules\/(react|react-dom|scheduler|react-router|react-router-dom)\//.test(id)
          ) return 'vendor-react';
          return 'vendor-misc';
        },
        chunkFileNames: 'js/[name]-[hash].js',
        entryFileNames: 'js/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          // 🛡️ SIGURNOSNA PROVJERA: Ako ime ne postoji, spriječi rušenje
          const fileName = assetInfo.name;
          if (!fileName) {
            return `assets/[name]-[hash][extname]`;
          }

          const info = fileName.split('.');
          const ext = info[info.length - 1];
          if (/png|jpe?g|gif|svg/.test(ext)) {
            return `images/[name]-[hash][extname]`;
          } else if (/woff|woff2|eot|ttf|otf/.test(ext)) {
            return `fonts/[name]-[hash][extname]`;
          } else if (ext === 'css') {
            return `css/[name]-[hash][extname]`;
          }
          return `[name]-[hash][extname]`;
        },
      },
    },
  },

  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'framer-motion',
      'lucide-react',
      '@supabase/supabase-js',
      'browser-image-compression',
    ],
    exclude: ['@vite/client', '@vite/env'],
  },
});