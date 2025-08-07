import React, { useState, useEffect } from 'react';
import {
  Box,
  CircularProgress,
  useColorMode,
} from '@chakra-ui/react';

interface PageLoaderProps {
  isLoading: boolean;
  children: React.ReactNode;
  minDisplayTime?: number;
}

export const PageLoader: React.FC<PageLoaderProps> = ({
  isLoading,
  children,
  minDisplayTime = 600,
}) => {
  const { colorMode } = useColorMode();
  const [showLoader, setShowLoader] = useState(false);
  const [showContent, setShowContent] = useState(true);
  const [startTime, setStartTime] = useState<number | null>(null);

  useEffect(() => {
    if (isLoading) {
      // Start loading state
      setShowContent(false);
      setShowLoader(true);
      setStartTime(Date.now());
    } else {
      // Check if minimum display time has elapsed
      if (startTime) {
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, minDisplayTime - elapsed);

        if (remaining > 0) {
          // Wait for remaining time before hiding loader
          const timer = setTimeout(() => {
            setShowLoader(false);
            setShowContent(true);
            setStartTime(null);
          }, remaining);
          return () => clearTimeout(timer);
        } else {
          // Minimum time has elapsed, hide loader immediately
          setShowLoader(false);
          setShowContent(true);
          setStartTime(null);
        }
      } else {
        // No loading state was active, show content immediately
        setShowContent(true);
      }
    }
  }, [isLoading, minDisplayTime, startTime]);

  return (
    <Box position="relative" w="full" h="full">
      {/* Loading State */}
      {showLoader && (
        <Box
          position="absolute"
          top="0"
          left="0"
          right="0"
          bottom="0"
          display="flex"
          alignItems="center"
          justifyContent="center"
          bg={colorMode === 'dark' ? 'gray.800' : 'white'}
          zIndex={10}
          opacity={showLoader ? 1 : 0}
          transition="opacity 0.3s ease-in-out"
        >
          <CircularProgress
            isIndeterminate
            size="100px"
            thickness="4px"
            color="blue.500"
          />
        </Box>
      )}

      {/* Content */}
      <Box
        opacity={showContent ? 1 : 0}
        transition="opacity 0.3s ease-in-out"
        w="full"
        h="full"
      >
        {children}
      </Box>
    </Box>
  );
}; 