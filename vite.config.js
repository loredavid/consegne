import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '::',
    port: 3000,
  },
  define: {
    global: 'globalThis',
    'process.env': {},
  },
  resolve: {
    alias: {
      buffer: 'buffer',
      process: 'process/browser',
      crypto: 'crypto-browserify',
    }
  },
  optimizeDeps: {
    include: ['buffer', 'process']
  },
  build: {
    commonjsOptions: {
      transformMixedEsModules: true
    }
  }
});
