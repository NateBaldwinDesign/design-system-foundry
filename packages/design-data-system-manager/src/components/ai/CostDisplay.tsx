/**
 * Cost Display Component
 * Shows cost statistics and budget information
 */

import React from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Progress,
  Badge,
  useColorMode,
  Tooltip
} from '@chakra-ui/react';
import { LuDollarSign, LuTrendingUp, LuAlertTriangle } from 'react-icons/lu';
import type { CostStatistics } from '../../contexts/GeminiAIContext';

interface CostDisplayProps {
  costStats: CostStatistics;
}

export const CostDisplay: React.FC<CostDisplayProps> = ({ costStats }) => {
  const { colorMode } = useColorMode();
  const { budgetStatus, monthlyQueries, averageCostPerQuery } = costStats;
  const { currentUsage, budget, remaining, percentageUsed, isOverBudget } = budgetStatus;

  const getProgressColor = () => {
    if (isOverBudget) return 'red';
    if (percentageUsed >= 80) return 'orange';
    if (percentageUsed >= 60) return 'yellow';
    return 'green';
  };

  const getBudgetStatusText = () => {
    if (isOverBudget) return 'Budget Exceeded';
    if (percentageUsed >= 80) return 'Budget Warning';
    if (percentageUsed >= 60) return 'Budget Notice';
    return 'Budget Healthy';
  };

  return (
    <Box>
      <VStack spacing={3} align="stretch">
        {/* Budget Progress */}
        <Box>
          <HStack justify="space-between" mb={2}>
            <Text fontSize="sm" fontWeight="medium">
              Monthly Budget Usage
            </Text>
            <Badge 
              colorScheme={getProgressColor()} 
              variant="subtle"
              size="sm"
            >
              {getBudgetStatusText()}
            </Badge>
          </HStack>
          
          <Progress 
            value={Math.min(percentageUsed, 100)} 
            colorScheme={getProgressColor()}
            size="sm"
            borderRadius="md"
            mb={2}
          />
          
          <HStack justify="space-between" fontSize="xs" color="gray.500">
            <Text>${currentUsage.toFixed(4)} used</Text>
            <Text>${remaining.toFixed(2)} remaining</Text>
          </HStack>
        </Box>

        {/* Usage Statistics */}
        <HStack justify="space-between" fontSize="sm">
          <HStack spacing={1}>
            <LuTrendingUp size={14} />
            <Text>Queries this month:</Text>
            <Text fontWeight="medium">{monthlyQueries}</Text>
          </HStack>
          
          <HStack spacing={1}>
            <LuDollarSign size={14} />
            <Text>Avg cost per query:</Text>
            <Text fontWeight="medium">${averageCostPerQuery.toFixed(4)}</Text>
          </HStack>
        </HStack>

        {/* Budget Warning */}
        {percentageUsed >= 80 && (
          <HStack 
            spacing={2} 
            p={2} 
            bg={colorMode === 'dark' ? 'orange.900' : 'orange.50'} 
            borderRadius="md"
            borderWidth={1}
            borderColor={colorMode === 'dark' ? 'orange.700' : 'orange.200'}
          >
            <LuAlertTriangle size={16} color="orange" />
            <Text fontSize="sm" color={colorMode === 'dark' ? 'orange.200' : 'orange.800'}>
              {isOverBudget 
                ? 'Monthly budget exceeded. AI features are disabled until next month.'
                : 'Approaching monthly budget limit. Consider reducing usage.'
              }
            </Text>
          </HStack>
        )}
      </VStack>
    </Box>
  );
};
