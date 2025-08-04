import { extendTheme, type ThemeConfig } from '@chakra-ui/react';

console.log('🔍 [Theme] Creating theme configuration');

// Check what color mode was set by the HTML script
const storedColorMode = typeof window !== 'undefined' ? localStorage.getItem('chakra-ui-color-mode') : null;
console.log('🔍 [Theme] Stored color mode from HTML script:', storedColorMode);

// Validate the color mode value
const validColorMode = storedColorMode === 'light' || storedColorMode === 'dark' || storedColorMode === 'system' ? storedColorMode : undefined;

const config: ThemeConfig = {
  initialColorMode: validColorMode || 'system',
  useSystemColorMode: !validColorMode, // Only use system if no stored preference
};

console.log('🔍 [Theme] Theme config:', config);

const theme = extendTheme({
  config,
  styles: {
    global: (props: { colorMode: 'light' | 'dark' }) => ({
      body: {
        transition: 'background-color 0.2s, color 0.2s',
        bg: props.colorMode === 'dark' ? 'gray.900' : 'white',
        color: props.colorMode === 'dark' ? 'white' : 'gray.900',
      },
    }),
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
        },
      },
        },
    Drawer: {
      baseStyle: {
        dialog: {
          bg: 'chakra-body-bg',
        },
      },
    },
    Menu: {
      baseStyle: {
        list: {
          bg: 'chakra-body-bg',
        },
      },
    },
    Popover: {
      baseStyle: {
        content: {
          bg: 'chakra-body-bg',
        },
      },
    },
    Tooltip: {
      baseStyle: {
          bg: 'chakra-body-bg',
        color: 'chakra-body-text',
      },
    },
  },
    colors: {
    gray: {
      50: '#f7fafc',
      100: '#edf2f7',
      200: '#e2e8f0',
      300: '#cbd5e0',
      400: '#a0aec0',
      500: '#718096',
      600: '#4a5568',
      700: '#2d3748',
      800: '#1a202c',
      900: '#171923',
    },
  },
});

console.log('🔍 [Theme] Theme created with config:', theme.config);

export default theme; 