import { defineConfig } from 'vitest/config';
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
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['dist/**', '**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}', 'src/test/**', '*.config.ts'],
    },
  },
  resolve: {
    alias: {
      'better-sqlite3': path.resolve(__dirname, 'src/utils/sqlite-stub.ts'),
      '@otto-ai/core': path.resolve(__dirname, '../core/src'),
    },
  },
});

