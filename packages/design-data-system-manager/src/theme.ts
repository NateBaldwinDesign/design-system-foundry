import { createSystem, defaultConfig } from '@chakra-ui/react';

// Log initial color mode detection
const prefersDark = typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
console.log('System prefers dark mode:', prefersDark);

export const system = createSystem(defaultConfig, {
  theme: {
    tokens: {
      colors: {
        // Base colors
        gray: {
          50: { value: "#fafafa" },
          100: { value: "#f4f4f5" },
          200: { value: "#e4e4e7" },
          300: { value: "#d4d4d8" },
          400: { value: "#a1a1aa" },
          500: { value: "#71717a" },
          600: { value: "#52525b" },
          700: { value: "#3f3f46" },
          800: { value: "#27272a" },
          900: { value: "#18181b" },
          950: { value: "#09090b" }
        },
        blue: {
          50: { value: "#e6f2ff" },
          100: { value: "#e6f2ff" },
          200: { value: "#bfdeff" },
          300: { value: "#99caff" },
          400: { value: "#66b3ff" },
          500: { value: "#3399ff" },
          600: { value: "#0080ff" },
          700: { value: "#0066cc" },
          800: { value: "#004d99" },
          900: { value: "#003366" },
          950: { value: "#001a33" }
        }
      },
      fonts: {
        heading: { value: 'system-ui, sans-serif' },
        body: { value: 'system-ui, sans-serif' }
      }
    },
    semanticTokens: {
      colors: {
        // Semantic color tokens
        bg: {
          value: { base: "{colors.gray.50}", _dark: "{colors.gray.900}" }
        },
        text: {
          value: { base: "{colors.gray.900}", _dark: "{colors.gray.50}" }
        },
        border: {
          value: { base: "{colors.gray.200}", _dark: "{colors.gray.700}" }
        },
        // Status colors
        success: {
          solid: { value: "{colors.green.500}" },
          contrast: { value: "{colors.green.100}" },
          fg: { value: "{colors.green.700}" },
          muted: { value: "{colors.green.100}" },
          subtle: { value: "{colors.green.200}" },
          emphasized: { value: "{colors.green.300}" },
          focusRing: { value: "{colors.green.500}" }
        },
        error: {
          solid: { value: "{colors.red.500}" },
          contrast: { value: "{colors.red.100}" },
          fg: { value: "{colors.red.700}" },
          muted: { value: "{colors.red.100}" },
          subtle: { value: "{colors.red.200}" },
          emphasized: { value: "{colors.red.300}" },
          focusRing: { value: "{colors.red.500}" }
        },
        warning: {
          solid: { value: "{colors.yellow.500}" },
          contrast: { value: "{colors.yellow.100}" },
          fg: { value: "{colors.yellow.700}" },
          muted: { value: "{colors.yellow.100}" },
          subtle: { value: "{colors.yellow.200}" },
          emphasized: { value: "{colors.yellow.300}" },
          focusRing: { value: "{colors.yellow.500}" }
        }
      }
    },
    components: {
      Stack: {
        baseStyle: {
          bg: 'transparent'
        }
      },
      Dialog: {
        baseStyle: {
          content: {
            bg: 'bg',
            maxH: 'calc(100vh - 80px)',
            my: '40px',
            overflow: 'hidden'
          },
          header: {
            px: 6,
            py: 4
          },
          body: {
            px: 6,
            py: 4,
            overflowY: 'auto'
          },
          footer: {
            px: 6,
            py: 4
          }
        }
      },
      Popover: {
        baseStyle: {
          content: {
            bg: 'bg',
            borderColor: 'border'
          }
        }
      },
      NumberInput: {
        baseStyle: {
          field: {
            bg: 'bg',
            borderColor: 'border'
          },
          stepper: {
            borderColor: 'border'
          }
        }
      }
    }
  }
});

// Add color mode change listener
if (typeof window !== 'undefined') {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    console.log('System color scheme changed:', e.matches ? 'dark' : 'light');
  });
}

export default system; 