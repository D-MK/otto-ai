import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      include: ['crypto'],
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
    }),
  ],
  server: {
    port: 3000,
  },
  optimizeDeps: {
    exclude: ['better-sqlite3'],
    include: ['@otto-ai/core'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-ai': ['@google/genai'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-zustand': ['zustand'],
        },
      },
    },
  },
  resolve: {
    alias: {
      'better-sqlite3': path.resolve(__dirname, 'src/utils/sqlite-stub.ts'),
      '@otto-ai/core': path.resolve(__dirname, '../core/src'),
    },
  },
});
