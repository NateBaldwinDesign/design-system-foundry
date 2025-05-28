import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@token-model/data-model': path.resolve(__dirname, '../data-model'),
    },
  },
  server: {
    port: 4001
  },
}); 