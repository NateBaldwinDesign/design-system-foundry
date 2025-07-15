import React, { useState } from 'react';
import {
  Box,
  VStack,
  Text,
  useColorMode,
  Button,
  Input,
  FormControl,
  FormLabel,
} from '@chakra-ui/react';
import {
  ChevronLeft,
  ChevronRight,
  MessageCircle,
} from 'lucide-react';
import { AIChatInterface } from './AIChatInterface';
import { useAI } from '../hooks/useAI';

import type { Schema } from '../hooks/useSchema';
import type { TokenSystem } from '@token-model/data-model';

interface ChatSidebarProps {
  schema: Schema;
  onTokenCreated?: (token: Record<string, unknown>) => void;
  onCollectionSuggested?: (collection: Record<string, unknown>) => void;
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({
  schema,
  onTokenCreated,
  onCollectionSuggested,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const { colorMode } = useColorMode();
  const bgColor = colorMode === 'dark' ? 'gray.800' : 'white';
  const borderColor = colorMode === 'dark' ? 'gray.700' : 'gray.200';


  // Convert Schema to TokenSystem format
  const tokenSystem: TokenSystem = {
    systemName: schema.systemName,
    systemId: schema.systemId,
    description: schema.description,
    version: schema.version,
    versionHistory: schema.versionHistory,
    dimensionEvolution: schema.dimensionEvolution,
    dimensions: schema.dimensions,
    dimensionOrder: schema.dimensionOrder,
    tokenCollections: schema.tokenCollections,
    tokens: schema.tokens.map(token => ({
      ...token,
      generatedByAlgorithm: false, // Add missing required property
      algorithmId: undefined
    })),
    platforms: schema.platforms,
    themes: schema.themes || [],
    taxonomies: schema.taxonomies,
    standardPropertyTypes: schema.standardPropertyTypes,
    propertyTypes: schema.standardPropertyTypes, // Use standardPropertyTypes as propertyTypes
    resolvedValueTypes: schema.resolvedValueTypes,
    extensions: schema.extensions
  };

  // Initialize AI hook with manual activation
  const aiHook = useAI(tokenSystem, {
    autoInitialize: false, // Don't auto-initialize to prevent infinite loops
    apiKey: apiKey || undefined,
    model: 'claude-3-5-sonnet-20241022',
    temperature: 0.3,
    maxTokens: 4000,
  });

  return (
    <Box
      as="aside"
      position="relative"
      w={isCollapsed ? '50px' : '400px'}
      h="100%"
      bg={bgColor}
      borderLeft="1px"
      borderColor={borderColor}
      transition="width 0.2s"
      role="complementary"
      aria-label="AI Chat Assistant"
    >
      <VStack spacing={0} align="stretch" h="full">
        {/* Header */}
        <Box px={4} py={3} borderBottom="1px" borderColor={borderColor} display="flex" gap={2} justifyContent="center" alignItems="center">
          <MessageCircle size={20} color={colorMode === 'dark' ? 'white' : 'black'} />
          {/* Title */}
          {!isCollapsed && (
            <Text fontSize="sm" lineHeight="1" fontWeight="bold">
              AI Assistant
            </Text>
          )}
        </Box>

        {/* Chat Interface */}
        <Box flex={1} p={isCollapsed ? 0 : 4} overflow="hidden">
          {!isCollapsed && aiHook.isInitialized && aiHook.context && aiHook.aiService && (
            <AIChatInterface
              aiService={aiHook.aiService}
              context={aiHook.context}
              onTokenCreated={onTokenCreated}
              onCollectionSuggested={onCollectionSuggested}
              className="chat-interface"
            />
          )}
          
          {/* Loading state */}
          {!isCollapsed && aiHook.isInitializing && (
            <Box p={4} textAlign="center">
              <Text fontSize="sm" color="gray.500">
                Initializing AI Assistant...
              </Text>
            </Box>
          )}
          
          {/* AI Not Initialized State */}
          {!isCollapsed && !aiHook.isInitialized && !aiHook.isInitializing && !aiHook.error && (
            <Box p={4} textAlign="center">
              <VStack spacing={3}>
                <Text fontSize="sm" color="blue.500" fontWeight="bold">
                  AI Assistant Ready
                </Text>
                <Text fontSize="xs" color="gray.600">
                  Enter your Claude API key to activate the AI assistant.
                </Text>
                <Text fontSize="xs" color="gray.500" fontStyle="italic">
                  Your API key is stored in memory only and not saved to disk.
                </Text>
                
                {showApiKeyInput ? (
                  <VStack spacing={2} w="full">
                    <FormControl>
                      <FormLabel fontSize="xs">Claude API Key</FormLabel>
                      <Input
                        type="password"
                        size="sm"
                        placeholder="sk-ant-..."
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' && apiKey.trim()) {
                            aiHook.resetError();
                            aiHook.initializeManually().catch(console.error);
                          }
                        }}
                      />
                    </FormControl>
                    <Button
                      size="sm"
                      colorScheme="blue"
                      isDisabled={!apiKey.trim()}
                      onClick={() => {
                        aiHook.resetError();
                        aiHook.initializeManually().catch(console.error);
                      }}
                    >
                      Activate AI
                    </Button>
                    <Button
                      size="xs"
                      variant="ghost"
                      onClick={() => setShowApiKeyInput(false)}
                    >
                      Cancel
                    </Button>
                  </VStack>
                ) : (
                  <Button
                    size="sm"
                    colorScheme="blue"
                    onClick={() => setShowApiKeyInput(true)}
                  >
                    Enter API Key
                  </Button>
                )}
              </VStack>
            </Box>
          )}
          
          {/* Error state with fallback */}
          {!isCollapsed && aiHook.error && !aiHook.isInitializing && (
            <Box p={4} textAlign="center">
              <VStack spacing={3}>
                <Text fontSize="sm" color="orange.500" fontWeight="bold">
                  AI Assistant Unavailable
                </Text>
                <Text fontSize="xs" color="gray.500">
                  {aiHook.error}
                </Text>
                <Text fontSize="xs" color="gray.600">
                  Network or CORS issues prevent AI loading. Using fallback mode.
                </Text>
                <Button
                  size="sm"
                  colorScheme="blue"
                  onClick={() => {
                    aiHook.resetError();
                    aiHook.initializeManually().catch(console.error);
                  }}
                >
                  Retry
                </Button>
              </VStack>
            </Box>
          )}
          
          {/* Fallback message when AI is not available */}
          {!isCollapsed && aiHook.error && !aiHook.isInitializing && (
            <Box p={4} borderTop="1px solid" borderColor="gray.200">
              <VStack spacing={3}>
                <Text fontSize="sm" fontWeight="bold">
                  AI Assistant Unavailable
                </Text>
                <Text fontSize="xs" color="gray.600">
                  Please check your API key and network connection. You can still use the main application features.
                </Text>
              </VStack>
            </Box>
          )}
        </Box>

        {/* Collapse Toggle Button */}
        <Box px={4} py={2} borderTop="1px" borderColor={borderColor}>
          <Button
            aria-label={isCollapsed ? 'Expand chat sidebar' : 'Collapse chat sidebar'}
            size="sm"
            leftIcon={isCollapsed ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
            onClick={() => setIsCollapsed(!isCollapsed)}
            variant="ghost"
            w="full"
            gap={1}
            justifyContent="flex-start"
          >
            {!isCollapsed && 'Collapse'}
          </Button>
        </Box>
      </VStack>
    </Box>
  );
}; 