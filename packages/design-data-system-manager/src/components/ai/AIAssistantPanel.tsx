/**
 * AI Assistant Panel Component
 * Collapsible panel for AI assistant functionality positioned on the right side
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  useColorMode,
  Button,
  IconButton,
  Tooltip,
  Collapse,
} from '@chakra-ui/react';
import {
  ChevronRight,
  Bot,
} from 'lucide-react';
import { GeminiChatbot } from './GeminiChatbot';
import { GeminiAIStatus } from './GeminiAIStatus';
import { GeminiAIHelp } from './GeminiAIHelp';
import { GeminiAPIKeyConfig } from './GeminiAPIKeyConfig';

interface AIAssistantPanelProps {
  isOpen?: boolean;
  onToggle?: (isOpen: boolean) => void;
}

const DEFAULT_SUGGESTIONS = [
  "What tokens are available?",
  "What dimensions and modes exist?",
  "List component categories",
];

export const AIAssistantPanel: React.FC<AIAssistantPanelProps> = ({ 
  isOpen: externalIsOpen, 
  onToggle 
}) => {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [isApiKeyConfigured, setIsApiKeyConfigured] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const { colorMode } = useColorMode();
  
  // Use external state if provided, otherwise use internal state
  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen;
  const setIsOpen = (open: boolean) => {
    if (externalIsOpen !== undefined) {
      onToggle?.(open);
    } else {
      setInternalIsOpen(open);
    }
  };

  const bgColor = colorMode === 'dark' ? 'gray.800' : 'white';
  const borderColor = colorMode === 'dark' ? 'gray.700' : 'gray.200';

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  // Detect if API key is configured
  useEffect(() => {
    const storedKey = localStorage.getItem('gemini-api-key');
    setIsApiKeyConfigured(!!storedKey);
  }, []);

  return (
    <Box
      position="relative"
      h="100%"
      w={isOpen ? '400px' : '64px'}
      bg={bgColor}
      borderLeft="1px"
      borderColor={borderColor}
      transition="width 0.2s"
      display="flex"
      flexDirection="column"
    >
      {/* Header */}
      <Box 
        px={4} 
        py={3} 
        borderBottom="1px" 
        borderColor={borderColor}
        display="flex"
        alignItems="center"
        justifyContent="space-between"
      >
        {isOpen ? (
          <>
            <HStack spacing={2}>
              <Bot size={20} />
              <Text fontSize="sm" fontWeight="bold">
                AI Assistant
              </Text>
            </HStack>
            <HStack spacing={2}>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleToggle}
                leftIcon={<ChevronRight size={16} />}
              >
                Collapse
              </Button>
            </HStack>
          </>
        ) : (
          <Tooltip label="AI Assistant" placement="left">
            <IconButton
              aria-label="Open AI Assistant"
              icon={<Bot size={20} />}
              size="sm"
              variant="ghost"
              onClick={handleToggle}
              w="full"
            />
          </Tooltip>
        )}
      </Box>

      {/* Content */}
      {isOpen && (
        <VStack 
          spacing={3} 
          align="stretch" 
          p={4} 
          flex={1}
          overflowY="auto"
        >
          {/* API Key Configuration (only when missing) */}
          {!isApiKeyConfigured && (
            <GeminiAPIKeyConfig onKeyConfigured={() => setIsApiKeyConfigured(true)} />
          )}

          {/* Minimal controls */}
          <HStack spacing={2} justifyContent="flex-end">
            <Button size="xs" variant="ghost" onClick={() => setIsDetailsOpen(v => !v)}>
              {isDetailsOpen ? 'Hide details' : 'Show details'}
            </Button>
            <Button size="xs" variant="ghost" onClick={() => setIsHelpOpen(v => !v)}>
              {isHelpOpen ? 'Hide help' : 'Help'}
            </Button>
          </HStack>

          {/* Collapsible details (status) */}
          <Collapse in={isDetailsOpen} animateOpacity>
            <GeminiAIStatus />
          </Collapse>

          {/* Chat Interface (primary) */}

            <GeminiChatbot
              suggestions={DEFAULT_SUGGESTIONS}
              maxHeight="100%"
              showCostInfo={false}
            />

          {/* Collapsible help */}
          <Collapse in={isHelpOpen} animateOpacity>
            <GeminiAIHelp />
          </Collapse>
        </VStack>
      )}
    </Box>
  );
};
