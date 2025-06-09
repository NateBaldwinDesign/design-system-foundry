import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import tsconfigPaths from "vite-tsconfig-paths"

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  css: {
    modules: {
      localsConvention: 'camelCase'
    },
    preprocessorOptions: {
      scss: {
        additionalData: `@import "@chakra-ui/react/styles";`
      }
    }
  },
  optimizeDeps: {
    include: ['@emotion/react', '@emotion/styled', 'framer-motion', '@chakra-ui/react']
  },
  resolve: {
    alias: {
      '@token-model/data-model': path.resolve(__dirname, '../data-model'),
      '@': path.resolve(__dirname, './src')
    },
  },
  server: {
    port: 4001
  },
}); 