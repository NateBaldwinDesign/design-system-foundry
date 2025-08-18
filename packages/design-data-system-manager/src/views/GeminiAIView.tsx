/**
 * Gemini AI View
 * Main view for AI assistant functionality
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  useColorMode,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription
} from '@chakra-ui/react';
import { LuBot, LuInfo } from 'react-icons/lu';
import { PageTemplate } from '../components/PageTemplate';
import { GeminiChatbot } from '../components/ai/GeminiChatbot';
import { GeminiAIStatus } from '../components/ai/GeminiAIStatus';
import { GeminiAIHelp } from '../components/ai/GeminiAIHelp';
import { GeminiAPIKeyConfig } from '../components/ai/GeminiAPIKeyConfig';

interface GeminiAIViewProps {
  canEdit?: boolean;
}

export const GeminiAIView: React.FC<GeminiAIViewProps> = ({ canEdit = false }) => {
  const { colorMode } = useColorMode();
  const [isApiKeyConfigured, setIsApiKeyConfigured] = useState(false);
  
  const suggestions = [
    "What tokens are available in my design system?",
    "How do I create a new component?",
    "What are the current dimensions and modes?",
    "How do I organize tokens with taxonomies?",
    "What platforms does my design system support?",
    "Explain the relationship between dimensions and modes",
    "How do aliases work in this design system?",
    "What resolved value types are supported?"
  ];

  // Check if API key is configured on mount
  useEffect(() => {
    const storedKey = localStorage.getItem('gemini-api-key');
    setIsApiKeyConfigured(!!storedKey);
  }, []);
  
  return (
    <PageTemplate
      title="AI Assistant"
      description="Ask questions about your design system using natural language"
      icon={LuBot}
    >
      <VStack spacing={6} align="stretch">
        {/* API Key Configuration */}
        {!isApiKeyConfigured && (
          <GeminiAPIKeyConfig onKeyConfigured={() => setIsApiKeyConfigured(true)} />
        )}
        
        {/* Status and Cost Information */}
        <GeminiAIStatus />
        
        {/* Chatbot Interface */}
        <Box
          borderWidth={1}
          borderRadius="lg"
          bg={colorMode === 'dark' ? 'gray.800' : 'white'}
          borderColor={colorMode === 'dark' ? 'gray.600' : 'gray.200'}
          p={6}
          shadow="sm"
        >
          <GeminiChatbot
            suggestions={suggestions}
            maxHeight="600px"
            showCostInfo={true}
          />
        </Box>
        
        {/* Help and Information */}
        <GeminiAIHelp />
      </VStack>
    </PageTemplate>
  );
};
