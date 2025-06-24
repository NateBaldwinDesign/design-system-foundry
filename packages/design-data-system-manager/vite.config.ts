import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react({
    jsxRuntime: 'automatic',
    jsxImportSource: 'react',
  })],
  base: process.env.NODE_ENV === 'production' ? '/design-system-foundry/' : '/',
  resolve: {
    alias: {
      '@token-model/data-model': path.resolve(__dirname, '../data-model'),
    },
  },
  server: {
    port: 4001
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          chakra: ['@chakra-ui/react', '@chakra-ui/hooks', '@chakra-ui/system'],
          router: ['react-router-dom']
        }
      }
    }
  }
}); 