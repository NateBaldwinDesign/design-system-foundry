/**
 * Message Bubble Component
 * Displays individual conversation messages with proper styling
 */

import React from 'react';
import {
  Box,
  Text,
  HStack,
  VStack,
  Badge,
  useColorMode,
  Code,
  Link,
} from '@chakra-ui/react';
import { LuDollarSign } from 'react-icons/lu';
import type { ConversationMessage } from '../../contexts/GeminiAIContext';

interface MessageBubbleProps {
  message: ConversationMessage;
  showCost?: boolean;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ 
  message, 
  showCost = false 
}) => {
  const { colorMode } = useColorMode();
  const isUser = message.type === 'user';

  const formatTimestamp = (timestamp: Date) => {
    return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Simple markdown parser for common formatting
  const parseMarkdown = (text: string): React.ReactNode[] => {
    if (isUser) {
      // Don't parse markdown for user messages
      return [text];
    }

    const parts: React.ReactNode[] = [];
    let currentText = '';
    let i = 0;

    while (i < text.length) {
      // Handle bold text: **text**
      if (text.slice(i, i + 2) === '**' && i + 2 < text.length) {
        if (currentText) {
          parts.push(currentText);
          currentText = '';
        }
        
        const endIndex = text.indexOf('**', i + 2);
        if (endIndex !== -1) {
          const boldText = text.slice(i + 2, endIndex);
          parts.push(
            <Text as="span" fontWeight="bold" key={`bold-${parts.length}`}>
              {boldText}
            </Text>
          );
          i = endIndex + 2;
          continue;
        }
      }

      // Handle italic text: *text*
      if (text[i] === '*' && i + 1 < text.length) {
        if (currentText) {
          parts.push(currentText);
          currentText = '';
        }
        
        const endIndex = text.indexOf('*', i + 1);
        if (endIndex !== -1 && endIndex !== i + 1) {
          const italicText = text.slice(i + 1, endIndex);
          parts.push(
            <Text as="span" fontStyle="italic" key={`italic-${parts.length}`}>
              {italicText}
            </Text>
          );
          i = endIndex + 1;
          continue;
        }
      }

      // Handle inline code: `code`
      if (text[i] === '`' && i + 1 < text.length) {
        if (currentText) {
          parts.push(currentText);
          currentText = '';
        }
        
        const endIndex = text.indexOf('`', i + 1);
        if (endIndex !== -1) {
          const codeText = text.slice(i + 1, endIndex);
          parts.push(
            <Code
              key={`code-${parts.length}`}
              fontSize="xs"
              px={1}
              py={0.5}
              borderRadius="sm"
              bg={colorMode === 'dark' ? 'gray.600' : 'gray.100'}
              color={colorMode === 'dark' ? 'gray.100' : 'gray.800'}
            >
              {codeText}
            </Code>
          );
          i = endIndex + 1;
          continue;
        }
      }

      // Handle links: [text](url)
      if (text[i] === '[' && i + 1 < text.length) {
        if (currentText) {
          parts.push(currentText);
          currentText = '';
        }
        
        const linkEndIndex = text.indexOf(']', i + 1);
        if (linkEndIndex !== -1 && text[linkEndIndex + 1] === '(') {
          const urlStartIndex = linkEndIndex + 2;
          const urlEndIndex = text.indexOf(')', urlStartIndex);
          
          if (urlEndIndex !== -1) {
            const linkText = text.slice(i + 1, linkEndIndex);
            const url = text.slice(urlStartIndex, urlEndIndex);
            
            parts.push(
              <Link
                key={`link-${parts.length}`}
                href={url}
                isExternal
                color="blue.500"
                textDecoration="underline"
              >
                {linkText}
              </Link>
            );
            i = urlEndIndex + 1;
            continue;
          }
        }
      }

      // Handle line breaks
      if (text[i] === '\n') {
        if (currentText) {
          parts.push(currentText);
          currentText = '';
        }
        parts.push(<br key={`br-${parts.length}`} />);
        i++;
        continue;
      }

      currentText += text[i];
      i++;
    }

    if (currentText) {
      parts.push(currentText);
    }

    return parts;
  };

  return (
    <Box
      alignSelf={isUser ? 'flex-end' : 'flex-start'}
      maxWidth="80%"
    >
      <VStack
        align={isUser ? 'flex-end' : 'flex-start'}
        spacing={1}
      >
        {/* Message Content */}
        <Box
          bg={isUser 
            ? (colorMode === 'dark' ? 'blue.600' : 'blue.500')
            : (colorMode === 'dark' ? 'gray.700' : 'white')
          }
          color={isUser ? 'white' : 'inherit'}
          px={4}
          py={3}
          borderRadius="lg"
          borderWidth={isUser ? 0 : 1}
          borderColor={colorMode === 'dark' ? 'gray.600' : 'gray.200'}
          boxShadow="sm"
        >
          <Text fontSize="sm" whiteSpace="pre-wrap">
            {parseMarkdown(message.content)}
          </Text>
        </Box>

        {/* Message Metadata */}
        <HStack spacing={2} px={2}>
          <Text fontSize="xs" color="gray.500">
            {formatTimestamp(message.timestamp)}
          </Text>
          
          {showCost && message.cost !== undefined && (
            <HStack spacing={1}>
              <LuDollarSign size={12} />
              <Text fontSize="xs" color="gray.500">
                ${message.cost.toFixed(4)}
              </Text>
            </HStack>
          )}
          
          <Badge 
            size="sm" 
            variant="subtle" 
            colorScheme={isUser ? 'blue' : 'gray'}
          >
            {isUser ? 'You' : 'AI'}
          </Badge>
        </HStack>
      </VStack>
    </Box>
  );
};
