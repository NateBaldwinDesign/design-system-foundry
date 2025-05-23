import { extendTheme, type ThemeConfig } from '@chakra-ui/react';

// Log initial color mode detection
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
console.log('System prefers dark mode:', prefersDark);

const config: ThemeConfig = {
  initialColorMode: 'system',
  useSystemColorMode: true,
};

const theme = extendTheme({
  config,
  styles: {
    global: {
      body: {
        transition: 'background-color 0.2s, color 0.2s',
      },
    },
  },
  components: {
    VStack: {
      baseStyle: {
        bg: 'transparent',
      },
    },
  },
  semanticTokens: {
    colors: {
      'chakra-body-text': { _light: 'gray.800', _dark: 'white' },
      'chakra-body-bg': { _light: 'white', _dark: 'gray.900' },
      'chakra-border-color': { _light: 'gray.200', _dark: 'gray.700' },
    },
  },
});

// Add color mode change listener
if (typeof window !== 'undefined') {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    console.log('System color scheme changed:', e.matches ? 'dark' : 'light');
  });
}

export default theme; 