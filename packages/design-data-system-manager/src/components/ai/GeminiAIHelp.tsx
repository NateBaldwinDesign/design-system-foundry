/**
 * Gemini AI Help Component
 * Provides help information and usage tips
 */

import React from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  useColorMode,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon
} from '@chakra-ui/react';
import { LuInfo, LuHelpCircle, LuDollarSign, LuShield } from 'react-icons/lu';

export const GeminiAIHelp: React.FC = () => {
  const { colorMode } = useColorMode();

  const helpItems = [
    {
      title: "What can I ask about?",
      content: "You can ask about any aspect of your design system including tokens, components, dimensions, modes, taxonomies, and platform support. The AI understands design system concepts and can help you navigate and understand your data."
    },
    {
      title: "How does cost tracking work?",
      content: "Each query costs approximately $0.001 per 1,000 tokens. Your monthly budget is $5.00, which allows for hundreds of queries. Cost tracking is automatic and you'll receive warnings when approaching your limit."
    },
    {
      title: "What are the core concepts?",
      content: "The AI understands 5 core design system concepts: 1) Resolved Value Types (color, font, gap, shadow), 2) Dimensions (groups of modes), 3) Modes (specific options within dimensions), 4) Token Collections (categorization groups), and 5) Aliases (token references)."
    },
    {
      title: "Is my data secure?",
      content: "Yes, your design system data is processed locally and only sent to Google's Gemini API for AI processing. No data is stored permanently on external servers. All communication is encrypted and follows Google's privacy standards."
    },
    {
      title: "What if I exceed my budget?",
      content: "If you exceed your $5 monthly budget, AI features will be disabled until the next month. You can continue using all other features of the application normally. Budget resets occur on the 1st of each month."
    }
  ];

  return (
    <Box>
      <VStack spacing={4} align="stretch">
        {/* Header */}
        <HStack spacing={2}>
          <LuHelpCircle size={20} />
          <Text fontSize="lg" fontWeight="medium">
            Help & Information
          </Text>
        </HStack>

        {/* Help Accordion */}
        <Box
          borderWidth={1}
          borderRadius="md"
          bg={colorMode === 'dark' ? 'gray.800' : 'white'}
          borderColor={colorMode === 'dark' ? 'gray.600' : 'gray.200'}
          overflow="hidden"
        >
          <Accordion allowMultiple>
            {helpItems.map((item, index) => (
              <AccordionItem key={index}>
                <AccordionButton py={4} px={4}>
                  <Box flex="1" textAlign="left">
                    <Text fontSize="sm" fontWeight="medium">
                      {item.title}
                    </Text>
                  </Box>
                  <AccordionIcon />
                </AccordionButton>
                <AccordionPanel pb={4} px={4}>
                  <Text fontSize="sm" color="gray.600" lineHeight="1.6">
                    {item.content}
                  </Text>
                </AccordionPanel>
              </AccordionItem>
            ))}
          </Accordion>
        </Box>

        {/* Quick Tips */}
        <Box
          p={4}
          borderWidth={1}
          borderRadius="md"
          bg={colorMode === 'dark' ? 'blue.900' : 'blue.50'}
          borderColor={colorMode === 'dark' ? 'blue.700' : 'blue.200'}
        >
          <HStack spacing={2} mb={2}>
            <LuInfo size={16} />
            <Text fontSize="sm" fontWeight="medium" color={colorMode === 'dark' ? 'blue.200' : 'blue.800'}>
              Quick Tips
            </Text>
          </HStack>
          <VStack align="start" spacing={1}>
            <Text fontSize="xs" color={colorMode === 'dark' ? 'blue.300' : 'blue.700'}>
              • Be specific in your questions for better responses
            </Text>
            <Text fontSize="xs" color={colorMode === 'dark' ? 'blue.300' : 'blue.700'}>
              • Ask about relationships between concepts (e.g., "How do dimensions relate to modes?")
            </Text>
            <Text fontSize="xs" color={colorMode === 'dark' ? 'blue.300' : 'blue.700'}>
              • Use the suggestion buttons to get started with common questions
            </Text>
            <Text fontSize="xs" color={colorMode === 'dark' ? 'blue.300' : 'blue.700'}>
              • Monitor your usage in the cost display to stay within budget
            </Text>
          </VStack>
        </Box>
      </VStack>
    </Box>
  );
};
