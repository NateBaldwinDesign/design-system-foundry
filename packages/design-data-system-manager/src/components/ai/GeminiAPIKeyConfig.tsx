/**
 * Gemini API Key Configuration Component
 * Allows users to configure their API key at runtime for GitHub Pages deployment
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Input,
  VStack,
  HStack,
  Text,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  useColorMode,
  useToast
} from '@chakra-ui/react';
import { LuKey, LuEye, LuEyeOff } from 'react-icons/lu';

interface GeminiAPIKeyConfigProps {
  onKeyConfigured?: () => void;
}

export const GeminiAPIKeyConfig: React.FC<GeminiAPIKeyConfigProps> = ({ 
  onKeyConfigured 
}) => {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);
  const { colorMode } = useColorMode();
  const toast = useToast();

  // Check if API key is already configured
  useEffect(() => {
    const storedKey = localStorage.getItem('gemini-api-key');
    if (storedKey) {
      setIsConfigured(true);
      onKeyConfigured?.();
    }
  }, [onKeyConfigured]);

  const handleSaveKey = () => {
    if (!apiKey.trim()) {
      toast({
        title: 'API Key Required',
        description: 'Please enter your Gemini API key',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    // Validate API key format (basic check)
    if (!apiKey.startsWith('AIza')) {
      toast({
        title: 'Invalid API Key',
        description: 'Gemini API keys typically start with "AIza"',
        status: 'warning',
        duration: 5000,
        isClosable: true,
      });
    }

    // Store the API key
    localStorage.setItem('gemini-api-key', apiKey.trim());
    setIsConfigured(true);
    
    toast({
      title: 'API Key Saved',
      description: 'Your Gemini API key has been configured successfully',
      status: 'success',
      duration: 3000,
      isClosable: true,
    });

    onKeyConfigured?.();
  };

  const handleRemoveKey = () => {
    localStorage.removeItem('gemini-api-key');
    setIsConfigured(false);
    setApiKey('');
    
    toast({
      title: 'API Key Removed',
      description: 'Your Gemini API key has been removed',
      status: 'info',
      duration: 3000,
      isClosable: true,
    });
  };

  if (isConfigured) {
    return (
      <Box
        p={4}
        borderWidth={1}
        borderRadius="md"
        bg={colorMode === 'dark' ? 'green.900' : 'green.50'}
        borderColor={colorMode === 'dark' ? 'green.700' : 'green.200'}
      >
        <Alert status="success" borderRadius="md">
          <AlertIcon />
          <Box flex="1">
            <AlertTitle>API Key Configured</AlertTitle>
            <AlertDescription>
              Your Gemini API key is configured and ready to use.
            </AlertDescription>
          </Box>
          <Button size="sm" colorScheme="red" variant="outline" onClick={handleRemoveKey}>
            Remove Key
          </Button>
        </Alert>
      </Box>
    );
  }

  return (
    <Box
      p={4}
      borderWidth={1}
      borderRadius="md"
      bg={colorMode === 'dark' ? 'blue.900' : 'blue.50'}
      borderColor={colorMode === 'dark' ? 'blue.700' : 'blue.200'}
    >
      <VStack spacing={4} align="stretch">
        <HStack spacing={2}>
          <LuKey size={20} />
          <Text fontSize="lg" fontWeight="medium">
            Configure Gemini API Key
          </Text>
        </HStack>
        
        <Text fontSize="sm" color={colorMode === 'dark' ? 'blue.200' : 'blue.800'}>
          To use the AI Assistant, you need to configure your Gemini API key. 
          Get your key from{' '}
          <a 
            href="https://makersuite.google.com/app/apikey" 
            target="_blank" 
            rel="noopener noreferrer"
            style={{ textDecoration: 'underline' }}
          >
            Google AI Studio
          </a>
          .
        </Text>

        <VStack spacing={3} align="stretch">
          <HStack>
            <Input
              type={showKey ? 'text' : 'password'}
              placeholder="Enter your Gemini API key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              size="md"
            />
            <Button
              size="md"
              variant="outline"
              onClick={() => setShowKey(!showKey)}
            >
              {showKey ? <LuEyeOff size={16} /> : <LuEye size={16} />}
            </Button>
          </HStack>
          
          <Button 
            colorScheme="blue" 
            onClick={handleSaveKey}
            isDisabled={!apiKey.trim()}
          >
            Save API Key
          </Button>
        </VStack>

        <Alert status="info" borderRadius="md">
          <AlertIcon />
          <Box>
            <AlertTitle>Security Note</AlertTitle>
            <AlertDescription>
              Your API key is stored locally in your browser and is not shared with anyone. 
              You can remove it at any time.
            </AlertDescription>
          </Box>
        </Alert>
      </VStack>
    </Box>
  );
};
