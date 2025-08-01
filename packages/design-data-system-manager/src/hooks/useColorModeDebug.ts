import { useEffect } from 'react';
import { useColorMode } from '@chakra-ui/react';

/**
 * Debug hook to track color mode changes and provide detailed logging
 */
export const useColorModeDebug = () => {
  const { colorMode, setColorMode } = useColorMode();

  useEffect(() => {
    console.log('🔍 [ColorModeDebug] Color mode changed to:', colorMode);
    console.log('🔍 [ColorModeDebug] Available setColorMode function:', typeof setColorMode);
    
    // Log system preference
    if (typeof window !== 'undefined') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      console.log('🔍 [ColorModeDebug] System preference:', mediaQuery.matches ? 'dark' : 'light');
      console.log('🔍 [ColorModeDebug] Color mode matches system preference:', 
        (colorMode === 'dark' && mediaQuery.matches) || (colorMode === 'light' && !mediaQuery.matches)
      );
    }
  }, [colorMode]);

  // Log initial state
  useEffect(() => {
    console.log('🔍 [ColorModeDebug] Initial color mode state:', colorMode);
  }, []);

  return { colorMode, setColorMode };
}; 