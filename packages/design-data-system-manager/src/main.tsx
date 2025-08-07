import React from 'react';
import ReactDOM from 'react-dom/client';
import { ChakraProvider } from '@chakra-ui/react';
import App from './App';
import theme from './theme';

console.log('🔍 [Main] Starting application initialization');
console.log('🔍 [Main] Theme config:', theme.config);

// Enhanced color mode change listener with debug logging
if (typeof window !== 'undefined') {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  console.log('🔍 [Main] Initial media query state:', mediaQuery.matches ? 'dark' : 'light');
  
  mediaQuery.addEventListener('change', (e) => {
    console.log('🔍 [Main] System color scheme changed:', e.matches ? 'dark' : 'light');
  });
}

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Failed to find the root element');

console.log('🔍 [Main] Root element found, rendering app');

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <ChakraProvider theme={theme}>
      <App />
    </ChakraProvider>
  </React.StrictMode>
); 

console.log('🔍 [Main] App rendered with ChakraProvider'); 