import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import path from 'path';

// Base path for GitHub Pages deployment
// Set VITE_BASE_PATH environment variable to customize (e.g., '/otto-ai/' for repository deployment)
// Defaults to '/' for root domain deployment
const base = process.env.VITE_BASE_PATH || '/';

export default defineConfig({
  base,
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
    // SECURITY: Remove console statements in production builds
    // Note: Vite uses esbuild by default which doesn't support drop_console
    // Console removal is handled by our logger utility in development mode
    // For production, consider using a plugin or post-build script
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
