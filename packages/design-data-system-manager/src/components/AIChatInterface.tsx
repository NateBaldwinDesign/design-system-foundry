import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Button,
  Text,
  IconButton,
  useToast,
  Spinner,
  Badge,
  Textarea,
  Collapse,
  useDisclosure
} from '@chakra-ui/react';
import { Send, Bot, User, ChevronDown, ChevronUp } from 'lucide-react';
import { ClaudeService, type AIContext } from '../services/ai/index';

export interface AIChatInterfaceProps {
  aiService: ClaudeService;
  context: AIContext;
  onTokenCreated?: (token: Record<string, unknown>) => void;
  onCollectionSuggested?: (collection: Record<string, unknown>) => void;
  className?: string;
}

export interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  suggestions?: Record<string, unknown>[];
  validationResult?: {
    isValid: boolean;
    errors: Array<{ path: string; message: string }>;
  };
}

export const AIChatInterface: React.FC<AIChatInterfaceProps> = ({
  aiService,
  context,
  onTokenCreated,
  onCollectionSuggested,
  className
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentTask, setCurrentTask] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const toast = useToast();
  const { isOpen: isSettingsOpen, onToggle: onSettingsToggle } = useDisclosure();

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Add welcome message on mount
  useEffect(() => {
    if (messages.length === 0) {
              setMessages([
          {
            id: 'welcome',
            type: 'assistant',
            content: `Hello! I'm your AI assistant with MCP (Model Context Protocol) integration for design token management. I can help you with:

**Structured Data Queries:**
• "Get all tokens" - List all tokens in the system
• "Get collections" - Show all token collections
• "Get dimensions" - Display all dimensions and modes
• "Get value types" - List all resolved value types
• "System info" - Show system statistics

**Search & Filter:**
• "Search tokens [term]" - Find tokens by name/description
• "Search collections [term]" - Find collections by name
• "Tokens by collection [id]" - Filter tokens by collection
• "Tokens by tier [primitive/semantic/component]" - Filter by token tier

**Transformations:**
• "Export to Figma" - Transform data for Figma
• "Export to CSS" - Generate CSS variables
• "Export to design tokens" - Create design token format

**Analytics:**
• "Analytics" or "Statistics" - Get system analytics

**Traditional AI Tasks:**
• Create new tokens with proper schema validation
• Suggest appropriate collections for your tokens
• Validate and fix data issues
• Explain design token concepts

What would you like to explore?`,
            timestamp: new Date()
          }
        ]);
    }
  }, [messages.length]);

  const addMessage = (message: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    const newMessage: ChatMessage = {
      ...message,
      id: Date.now().toString(),
      timestamp: new Date()
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage = inputValue.trim();
    setInputValue('');
    setIsLoading(true);

    // Add user message
    addMessage({
      type: 'user',
      content: userMessage
    });

    try {
      // Determine the task based on user input
      const task = determineTask(userMessage);
      setCurrentTask(task);

      // Use MCP-enhanced chat for all queries
      const response = await aiService.chatWithMCP(userMessage);

      // Add assistant response
      addMessage({
        type: 'assistant',
        content: response.content,
        suggestions: response.suggestions,
        validationResult: response.validationResult
      });

      // Handle suggestions
      if (response.suggestions && response.suggestions.length > 0) {
        if (task === 'create-token' && onTokenCreated) {
          // Show toast for token creation
          toast({
            title: 'Token Created',
            description: `Created ${response.suggestions.length} token(s)`,
            status: 'success',
            duration: 3000,
            isClosable: true
          });
        } else if (task === 'suggest-collection' && onCollectionSuggested) {
          // Show toast for collection suggestion
          toast({
            title: 'Collection Suggested',
            description: 'Check the chat for collection recommendations',
            status: 'info',
            duration: 3000,
            isClosable: true
          });
        }
      }

      // Show validation errors if any
      if (response.validationResult && !response.validationResult.isValid) {
        toast({
          title: 'Validation Issues',
          description: `Found ${response.validationResult.errors.length} validation errors`,
          status: 'warning',
          duration: 5000,
          isClosable: true
        });
      }

    } catch (error) {
      console.error('AI Service error:', error);
      
      addMessage({
        type: 'assistant',
        content: 'Sorry, I encountered an error while processing your request. Please try again or rephrase your question.'
      });

      toast({
        title: 'Error',
        description: 'Failed to process your request',
        status: 'error',
        duration: 5000,
        isClosable: true
      });
    } finally {
      setIsLoading(false);
      setCurrentTask('');
    }
  };

  const determineTask = (input: string): string => {
    const lowerInput = input.toLowerCase();
    
    if (lowerInput.includes('create') || lowerInput.includes('add') || lowerInput.includes('new token')) {
      return 'create-token';
    }
    if (lowerInput.includes('collection') || lowerInput.includes('where') || lowerInput.includes('organize')) {
      return 'suggest-collection';
    }
    if (lowerInput.includes('find') || lowerInput.includes('search') || lowerInput.includes('existing') || 
        lowerInput.includes('identify') || lowerInput.includes('which') || lowerInput.includes('reference')) {
      return 'find-token';
    }
    if (lowerInput.includes('explain') || lowerInput.includes('what is') || lowerInput.includes('how to')) {
      return 'explain-concept';
    }
    
    return 'find-token'; // Default to search for better UX
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const renderMessage = (message: ChatMessage) => {
    const isUser = message.type === 'user';
    
    return (
      <Box
        key={message.id}
        alignSelf={isUser ? 'flex-end' : 'flex-start'}
        maxW="80%"
        mb={4}
      >
        <HStack spacing={2} align="flex-start">
          {!isUser && (
            <Box
              bg="blue.500"
              color="white"
              p={2}
              borderRadius="full"
              w="32px"
              h="32px"
              display="flex"
              alignItems="center"
              justifyContent="center"
            >
              <Bot size={16} />
            </Box>
          )}
          
          <VStack align={isUser ? 'flex-end' : 'flex-start'} spacing={2}>
            <Box
              bg={isUser ? 'blue.500' : 'gray.100'}
              color={isUser ? 'white' : 'black'}
              p={3}
              borderRadius="lg"
              maxW="100%"
            >
              <Text whiteSpace="pre-wrap">{message.content}</Text>
            </Box>
            
            {/* Render suggestions */}
            {message.suggestions && message.suggestions.length > 0 && (
              <Box w="100%">
                <Text fontSize="sm" fontWeight="bold" mb={2}>
                  Suggestions:
                </Text>
                {message.suggestions.map((suggestion, index) => (
                  <Box
                    key={index}
                    bg="green.50"
                    border="1px solid"
                    borderColor="green.200"
                    p={3}
                    borderRadius="md"
                    mb={2}
                  >
                    <Text fontSize="sm" fontFamily="mono">
                      {JSON.stringify(suggestion, null, 2)}
                    </Text>
                  </Box>
                ))}
              </Box>
            )}
            
            {/* Render validation errors */}
            {message.validationResult && message.validationResult.errors.length > 0 && (
              <Box w="100%">
                <Text fontSize="sm" fontWeight="bold" color="red.500" mb={2}>
                  Validation Errors:
                </Text>
                {message.validationResult.errors.map((error: { path: string; message: string }, index: number) => (
                  <Box
                    key={index}
                    bg="red.50"
                    border="1px solid"
                    borderColor="red.200"
                    p={2}
                    borderRadius="md"
                    mb={1}
                  >
                    <Text fontSize="sm" color="red.700">
                      {error.path}: {error.message}
                    </Text>
                  </Box>
                ))}
              </Box>
            )}
            
            <Text fontSize="xs" color="gray.500">
              {message.timestamp.toLocaleTimeString()}
            </Text>
          </VStack>
          
          {isUser && (
            <Box
              bg="gray.500"
              color="white"
              p={2}
              borderRadius="full"
              w="32px"
              h="32px"
              display="flex"
              alignItems="center"
              justifyContent="center"
            >
              <User size={16} />
            </Box>
          )}
        </HStack>
      </Box>
    );
  };

  return (
    <Box className={className} h="600px" border="1px solid" borderColor="gray.200" borderRadius="lg">
      {/* Header */}
      <Box p={4} borderBottom="1px solid" borderColor="gray.200">
        <HStack justify="space-between">
          <HStack>
            <Bot size={20} />
            <Text fontWeight="bold">AI Assistant</Text>
            {currentTask && (
              <Badge colorScheme="blue" size="sm">
                {currentTask}
              </Badge>
            )}
          </HStack>
          <IconButton
            size="sm"
            icon={isSettingsOpen ? <ChevronUp /> : <ChevronDown />}
            onClick={onSettingsToggle}
            aria-label="Toggle settings"
          />
        </HStack>
        
        {/* Settings panel */}
        <Collapse in={isSettingsOpen}>
          <Box mt={3} p={3} bg="gray.50" borderRadius="md">
            <Text fontSize="sm" fontWeight="bold" mb={2}>Context Summary:</Text>
            <Text fontSize="xs" color="gray.600">
              Tokens: {context?.tokens?.length || 0} | Collections: {context?.collections?.length || 0} | 
              Dimensions: {context?.dimensions?.length || 0}
            </Text>
          </Box>
        </Collapse>
      </Box>

      {/* Messages */}
      <Box flex={1} p={4} overflowY="auto" maxH="400px">
        <VStack spacing={0} align="stretch">
          {messages.map(renderMessage)}
          {isLoading && (
            <Box alignSelf="flex-start" mb={4}>
              <HStack spacing={2}>
                <Box
                  bg="blue.500"
                  color="white"
                  p={2}
                  borderRadius="full"
                  w="32px"
                  h="32px"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                >
                  <Bot size={16} />
                </Box>
                <Box bg="gray.100" p={3} borderRadius="lg">
                  <HStack>
                    <Spinner size="sm" />
                    <Text>Thinking...</Text>
                  </HStack>
                </Box>
              </HStack>
            </Box>
          )}
          <div ref={messagesEndRef} />
        </VStack>
      </Box>

      {/* Input */}
      <Box p={4} borderTop="1px solid" borderColor="gray.200">
        <HStack>
          <Textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask me to create a token, suggest a collection, or explain concepts..."
            resize="none"
            rows={2}
            disabled={isLoading}
          />
          <Button
            colorScheme="blue"
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isLoading}
            size="lg"
          >
            <Send size={16} />
          </Button>
        </HStack>
      </Box>
    </Box>
  );
}; 