/**
 * Gemini AI Status Component
 * Shows AI availability status and budget information
 */

import React from 'react';
import {
  Box,
  HStack,
  VStack,
  Text,
  Badge,
  useColorMode,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription
} from '@chakra-ui/react';
import { LuBot, LuDollarSign, LuAlertTriangle, LuCheckCircle } from 'react-icons/lu';
import { useGeminiAI } from '../../hooks/useGeminiAI';

export const GeminiAIStatus: React.FC = () => {
  const { isAvailable, costStats } = useGeminiAI();
  const { colorMode } = useColorMode();
  const { budgetStatus } = costStats;
  const { percentageUsed, isOverBudget } = budgetStatus;

  const getStatusColor = () => {
    if (isOverBudget) return 'red';
    if (percentageUsed >= 80) return 'orange';
    return 'green';
  };

  const getStatusText = () => {
    if (isOverBudget) return 'Budget Exceeded';
    if (percentageUsed >= 80) return 'Budget Warning';
    return 'Available';
  };

  const getStatusIcon = () => {
    if (isOverBudget) return LuAlertTriangle;
    if (percentageUsed >= 80) return LuAlertTriangle;
    return LuCheckCircle;
  };

  return (
    <Box>
      <VStack spacing={4} align="stretch">
        {/* Status Alert */}
        {!isAvailable && (
          <Alert status="error" borderRadius="md">
            <AlertIcon />
            <Box>
              <AlertTitle>AI Assistant Disabled</AlertTitle>
              <AlertDescription>
                Monthly budget has been exceeded. AI features will be available again next month.
              </AlertDescription>
            </Box>
          </Alert>
        )}

        {percentageUsed >= 80 && isAvailable && (
          <Alert status="warning" borderRadius="md">
            <AlertIcon />
            <Box>
              <AlertTitle>Budget Warning</AlertTitle>
              <AlertDescription>
                You've used {percentageUsed.toFixed(1)}% of your monthly budget. Consider reducing usage to avoid exceeding the limit.
              </AlertDescription>
            </Box>
          </Alert>
        )}

        {/* Status Bar */}
        <Box
          p={4}
          borderWidth={1}
          borderRadius="md"
          bg={colorMode === 'dark' ? 'gray.700' : 'gray.50'}
          borderColor={colorMode === 'dark' ? 'gray.600' : 'gray.200'}
        >
          <HStack justify="space-between" align="center">
            <HStack spacing={3}>
              <LuBot size={20} />
              <VStack align="start" spacing={0}>
                <Text fontSize="sm" fontWeight="medium">
                  AI Assistant Status
                </Text>
                <Text fontSize="xs" color="gray.500">
                  Powered by Google Gemini
                </Text>
              </VStack>
            </HStack>

            <HStack spacing={4}>
              <VStack align="end" spacing={0}>
                <Text fontSize="xs" color="gray.500">Monthly Usage</Text>
                <Text fontSize="sm" fontWeight="medium">
                  ${costStats.monthlyCost.toFixed(4)} / ${costStats.budgetStatus.budget.toFixed(2)}
                </Text>
              </VStack>

              <Badge 
                colorScheme={getStatusColor()} 
                variant="subtle"
                size="sm"
              >
                <HStack spacing={1}>
                  {React.createElement(getStatusIcon(), { size: 12 })}
                  <Text>{getStatusText()}</Text>
                </HStack>
              </Badge>
            </HStack>
          </HStack>
        </Box>
      </VStack>
    </Box>
  );
};
