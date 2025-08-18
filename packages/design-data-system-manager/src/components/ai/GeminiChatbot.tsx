/**
 * Gemini Chatbot Component
 * Provides conversational AI interface for design system queries
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Input,
  Button,
  Text,
  useColorMode,
  Spinner,
  IconButton,
  Tooltip,
  Badge,
  Divider
} from '@chakra-ui/react';
import { LuSend, LuTrash2, LuDollarSign } from 'react-icons/lu';
import { useGeminiAI } from '../../hooks/useGeminiAI';
import { MessageBubble } from './MessageBubble';
import { SuggestionButtons } from './SuggestionButtons';
import { CostDisplay } from './CostDisplay';

interface GeminiChatbotProps {
  suggestions?: string[];
  maxHeight?: string;
  showCostInfo?: boolean;
}

const DEFAULT_SUGGESTIONS = [
  "What tokens are available in my design system?",
  "How do I create a new component?",
  "What are the current dimensions and modes?",
  "How do I organize tokens with taxonomies?",
  "What platforms does my design system support?",
  "Explain the relationship between dimensions and modes",
  "How do aliases work in this design system?",
  "What resolved value types are supported?"
];

export const GeminiChatbot: React.FC<GeminiChatbotProps> = ({
  suggestions = DEFAULT_SUGGESTIONS,
  maxHeight = "600px",
  showCostInfo = true
}) => {
  const { conversation, askQuestion, isLoading, costStats, isAvailable } = useGeminiAI();
  const [inputValue, setInputValue] = useState('');
  const { colorMode } = useColorMode();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading || !isAvailable) return;
    
    await askQuestion(inputValue.trim());
    setInputValue('');
  };

  const handleSuggestionClick = async (suggestion: string) => {
    if (isLoading || !isAvailable) return;
    await askQuestion(suggestion);
  };

  const formatTimestamp = (timestamp: Date) => {
    return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <Box>
      {/* Status Bar */}
      <HStack justify="space-between" mb={4} p={2} bg={colorMode === 'dark' ? 'gray.700' : 'gray.100'} borderRadius="md">
        <HStack spacing={2}>
          <Badge 
            colorScheme={isAvailable ? 'green' : 'red'} 
            variant="subtle"
          >
            {isAvailable ? 'AI Available' : 'AI Disabled'}
          </Badge>
          {isLoading && (
            <HStack spacing={1}>
              <Spinner size="xs" />
              <Text fontSize="sm">Processing...</Text>
            </HStack>
          )}
        </HStack>
        
        {showCostInfo && (
          <HStack spacing={2}>
            <LuDollarSign size={16} />
            <Text fontSize="sm" fontWeight="medium">
              ${costStats.monthlyCost.toFixed(4)} / ${costStats.budgetStatus.budget.toFixed(2)}
            </Text>
          </HStack>
        )}
      </HStack>

      {/* Conversation Messages */}
      <VStack 
        spacing={4} 
        maxHeight={maxHeight} 
        overflowY="auto"
        align="stretch"
        mb={4}
        p={2}
        borderWidth={1}
        borderRadius="md"
        borderColor={colorMode === 'dark' ? 'gray.600' : 'gray.200'}
        bg={colorMode === 'dark' ? 'gray.800' : 'gray.50'}
      >
        {conversation.length === 0 ? (
          <Box textAlign="center" py={8}>
            <Text color="gray.500" fontSize="sm">
              Start a conversation about your design system
            </Text>
            <Text color="gray.400" fontSize="xs" mt={2}>
              Ask about tokens, components, dimensions, or any design system concepts
            </Text>
          </Box>
        ) : (
          conversation.map((message, index) => (
            <MessageBubble 
              key={index} 
              message={message}
              showCost={message.type === 'assistant' && message.cost !== undefined}
            />
          ))
        )}
        
        {isLoading && (
          <HStack spacing={2} p={3} bg={colorMode === 'dark' ? 'gray.700' : 'white'} borderRadius="md">
            <Spinner size="sm" />
            <Text fontSize="sm" color="gray.500">AI is thinking...</Text>
          </HStack>
        )}
        
        <div ref={messagesEndRef} />
      </VStack>

      {/* Input Form */}
      <form onSubmit={handleSubmit}>
        <HStack spacing={2}>
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={isAvailable ? "Ask about your design system..." : "AI is currently disabled"}
            disabled={isLoading || !isAvailable}
            size="md"
            borderRadius="md"
          />
          <Button 
            type="submit" 
            isLoading={isLoading}
            disabled={!inputValue.trim() || !isAvailable}
            colorScheme="blue"
            size="md"
            borderRadius="md"
          >
            <LuSend size={16} />
          </Button>
        </HStack>
      </form>

      {/* Suggestions */}
      {conversation.length === 0 && (
        <Box mt={4}>
          <Text fontSize="sm" color="gray.500" mb={2}>
            Try asking about:
          </Text>
          <SuggestionButtons 
            suggestions={suggestions} 
            onSelect={handleSuggestionClick}
            disabled={isLoading || !isAvailable}
          />
        </Box>
      )}

      {/* Cost Information */}
      {showCostInfo && (
        <Box mt={4}>
          <Divider mb={3} />
          <CostDisplay costStats={costStats} />
        </Box>
      )}
    </Box>
  );
};
