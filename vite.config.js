import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 3000,
    allowedHosts:["thetransporters.elteksrl.it"],
    https: {
      key: fs.readFileSync('./etc/letsencrypt/live/thetransporters.elteksrl.it/privkey.pem'),
      cert: fs.readFileSync('./etc/letsencrypt/live/thetransporters.elteksrl.it/fullchain.pem'),
	},
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
