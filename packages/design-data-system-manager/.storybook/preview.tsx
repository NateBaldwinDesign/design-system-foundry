import React from 'react';
import type { Preview } from '@storybook/react';
import { ChakraProvider, extendTheme } from '@chakra-ui/react';

// Mock global services
const mockStorageService = {
  setThemes: (themes: any[]) => {
    console.log('Themes saved:', themes);
  },
};

// @ts-ignore - Mocking global services
window.StorageService = mockStorageService;

const theme = extendTheme({}); // Use your custom theme here if you have one

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: '^on[A-Z].*' },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
  decorators: [
    (Story) => (
      <ChakraProvider resetCSS theme={theme}>
        <Story />
      </ChakraProvider>
    ),
  ],
};

export default preview; 