import React, { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { ChakraProvider, ColorModeScript, useColorMode } from '@chakra-ui/react';
import App from './App';
import theme from './theme';

// Debug component to log color mode changes
function ColorModeDebug() {
  const { colorMode, setColorMode } = useColorMode();
  
  useEffect(() => {
    console.log('Current color mode:', colorMode);
    
    // Check system preference
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    console.log('System prefers dark mode:', prefersDark);
    
    // If system preference doesn't match current mode, update it
    if (prefersDark && colorMode !== 'dark') {
      console.log('Updating to dark mode to match system preference');
      setColorMode('dark');
    } else if (!prefersDark && colorMode !== 'light') {
      console.log('Updating to light mode to match system preference');
      setColorMode('light');
    }
  }, [colorMode, setColorMode]);

  return null;
}

// Create root element if it doesn't exist
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Failed to find the root element');
}

// Create root
const root = ReactDOM.createRoot(rootElement);

// Render app
root.render(
  <React.StrictMode>
    <ColorModeScript initialColorMode={theme.config.initialColorMode} />
    <ChakraProvider theme={theme}>
      <ColorModeDebug />
      <App />
    </ChakraProvider>
  </React.StrictMode>
); 