import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-oxc';

export default defineConfig({
  plugins: [react()],
  
  server: {
    host: true,
    port: 5174,
    strictPort: true,
    allowedHosts: true,
    proxy: {
      '/api': { 
        target: 'http://localhost:8080', 
        changeOrigin: true 
      }
    }
  },

  build: {
    // Optimize for sub-1s load times
    target: 'esnext',
    minify: 'terser',
    terserOptions: {
      output: {
        comments: false,
      },
    } as any,
    
    // Enable source maps for production debugging
    sourcemap: false,
    
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 1000,
    
    // Rollup options for bundle splitting
    rollupOptions: {
      output: {
        // Manual chunks for vendor splitting
        manualChunks: {
          // React ecosystem
          'vendor-react': [
            'react',
            'react-dom',
            'react-router-dom',
          ],
          
          // Animation library
          'vendor-motion': [
            'framer-motion',
          ],
          
          // UI components and icons
          'vendor-ui': [
            'lucide-react',
          ],
          
          // Supabase
          'vendor-supabase': [
            '@supabase/supabase-js',
          ],
          
          // Utilities
          'vendor-utils': [
            'clsx',
            'date-fns',
          ],
        } as any,
        
        // Optimize chunk names for caching
        chunkFileNames: 'js/[name]-[hash].js',
        entryFileNames: 'js/[name]-[hash].js',
        assetFileNames: (assetInfo: any) => {
          const info = assetInfo.name.split('.');
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

  // Optimize dependencies
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'framer-motion',
      'lucide-react',
      '@supabase/supabase-js',
    ],
    exclude: ['@vite/client', '@vite/env'],
  },
})