import { extendTheme, type ThemeConfig } from '@chakra-ui/react';

// Log initial color mode detection
const prefersDark = typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
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
    Modal: {
      baseStyle: {
        dialog: {
          bg: 'chakra-body-bg',
          maxH: 'calc(100vh - 80px)',
          my: '40px',
          overflow: 'hidden',
        },
        header: {
          px: 6,
          py: 4,
        },
        body: {
          px: 6,
          py: 4,
          overflowY: 'auto',
        },
        footer: {
          px: 6,
          py: 4,
        },
      },
    },
    Popover: {
      baseStyle: {
        content: {
          bg: 'chakra-body-bg',
          borderColor: 'chakra-border-color',
        },
      },
    },
    NumberInput: {
      baseStyle: {
        field: {
          bg: 'chakra-body-bg',
          borderColor: 'chakra-border-color',
        },
        stepper: {
          borderColor: 'chakra-border-color',
        },
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