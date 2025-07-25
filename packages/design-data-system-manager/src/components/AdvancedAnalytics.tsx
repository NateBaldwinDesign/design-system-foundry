import React, { useState } from 'react';
import {
  Box,
  Card,
  CardBody,
  CardHeader,
  Heading,
  Text,
  VStack,
  HStack,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  SimpleGrid,
  Badge,
  Progress,
  Select,
  Button,
  useToast,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer
} from '@chakra-ui/react';

interface AnalyticsData {
  current: {
    totalTokens: number;
    overriddenTokens: number;
    newTokens: number;
    omittedTokens: number;
    platformCount: number;
    themeCount: number;
    validationErrors: number;
    validationWarnings: number;
  };
  trends: {
    tokenGrowth: number;
    overrideRate: number;
    newTokenRate: number;
    omissionRate: number;
    platformAdoption: number;
  };
  performance: {
    dataLoadTime: number;
    mergeTime: number;
    validationTime: number;
    memoryUsage: number;
    cacheHitRate: number;
  };
  platformBreakdown: Array<{
    platformId: string;
    tokenCount: number;
    overrideCount: number;
    newTokenCount: number;
    omissionCount: number;
    lastUpdated: string;
    validationStatus: 'valid' | 'invalid' | 'warning';
  }>;
}

interface AdvancedAnalyticsProps {
  analyticsData: AnalyticsData;
  onRefresh: () => void;
  onExport: () => void;
}

export const AdvancedAnalytics: React.FC<AdvancedAnalyticsProps> = ({
  analyticsData,
  onRefresh,
  onExport
}) => {
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month'>('week');
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();

  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      await onRefresh();
      toast({
        title: 'Analytics Updated',
        description: 'Analytics data has been refreshed successfully.',
        status: 'success',
        duration: 3000,
        isClosable: true
      });
    } catch (error) {
      toast({
        title: 'Refresh Failed',
        description: 'Failed to refresh analytics data.',
        status: 'error',
        duration: 5000,
        isClosable: true
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = () => {
    onExport();
    toast({
      title: 'Export Started',
      description: 'Analytics data export has been initiated.',
      status: 'info',
      duration: 3000,
      isClosable: true
    });
  };

  const getTrendIcon = (value: number) => {
    if (value > 0) return 'increase';
    if (value < 0) return 'decrease';
    return undefined;
  };

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const formatMemory = (mb: number) => {
    return `${mb.toFixed(1)} MB`;
  };

  return (
    <VStack spacing={6} align="stretch">
      {/* Header with Controls */}
      <Card>
        <CardHeader>
          <HStack justify="space-between">
            <Box>
              <Heading size="md">Advanced Analytics</Heading>
              <Text color="gray.600" mt={1}>
                Comprehensive insights into platform extension performance and trends
              </Text>
            </Box>
            <HStack spacing={3}>
              <Select
                size="sm"
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value as 'day' | 'week' | 'month')}
                w="120px"
              >
                <option value="day">Day</option>
                <option value="week">Week</option>
                <option value="month">Month</option>
              </Select>
              <Button
                size="sm"
                onClick={handleRefresh}
                isLoading={isLoading}
                loadingText="Refreshing..."
              >
                Refresh
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleExport}
              >
                Export
              </Button>
            </HStack>
          </HStack>
        </CardHeader>
      </Card>

      {/* Current Metrics */}
      <Card>
        <CardHeader>
          <Heading size="sm">Current Metrics</Heading>
        </CardHeader>
        <CardBody>
          <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={6}>
            <Stat>
              <StatLabel>Total Tokens</StatLabel>
              <StatNumber>{analyticsData.current.totalTokens}</StatNumber>
              <StatHelpText>
                <StatArrow type={getTrendIcon(analyticsData.trends.tokenGrowth)} />
                {Math.abs(analyticsData.trends.tokenGrowth).toFixed(1)}%
              </StatHelpText>
            </Stat>

            <Stat>
              <StatLabel>Platform Extensions</StatLabel>
              <StatNumber>{analyticsData.current.platformCount}</StatNumber>
              <StatHelpText>
                <StatArrow type={getTrendIcon(analyticsData.trends.platformAdoption)} />
                {Math.abs(analyticsData.trends.platformAdoption).toFixed(1)}%
              </StatHelpText>
            </Stat>

            <Stat>
              <StatLabel>Theme Overrides</StatLabel>
              <StatNumber>{analyticsData.current.themeCount}</StatNumber>
              <StatHelpText>Active themes</StatHelpText>
            </Stat>

            <Stat>
              <StatLabel>Validation Issues</StatLabel>
              <StatNumber color={analyticsData.current.validationErrors > 0 ? 'red.500' : 'green.500'}>
                {analyticsData.current.validationErrors}
              </StatNumber>
              <StatHelpText>
                {analyticsData.current.validationWarnings} warnings
              </StatHelpText>
            </Stat>
          </SimpleGrid>
        </CardBody>
      </Card>

      {/* Token Analysis */}
      <Card>
        <CardHeader>
          <Heading size="sm">Token Analysis</Heading>
        </CardHeader>
        <CardBody>
          <VStack spacing={4} align="stretch">
            {/* Override Rate */}
            <Box>
              <HStack justify="space-between" mb={2}>
                <Text fontWeight="medium">Override Rate</Text>
                <Text fontSize="sm" color="gray.600">
                  {analyticsData.trends.overrideRate.toFixed(1)}%
                </Text>
              </HStack>
              <Progress 
                value={analyticsData.trends.overrideRate} 
                colorScheme="blue" 
                size="sm"
              />
              <Text fontSize="xs" color="gray.500" mt={1}>
                {analyticsData.current.overriddenTokens} of {analyticsData.current.totalTokens} tokens overridden
              </Text>
            </Box>

            {/* New Token Rate */}
            <Box>
              <HStack justify="space-between" mb={2}>
                <Text fontWeight="medium">New Token Rate</Text>
                <Text fontSize="sm" color="gray.600">
                  {analyticsData.trends.newTokenRate.toFixed(1)}%
                </Text>
              </HStack>
              <Progress 
                value={analyticsData.trends.newTokenRate} 
                colorScheme="green" 
                size="sm"
              />
              <Text fontSize="xs" color="gray.500" mt={1}>
                {analyticsData.current.newTokens} new tokens added by platforms
              </Text>
            </Box>

            {/* Omission Rate */}
            <Box>
              <HStack justify="space-between" mb={2}>
                <Text fontWeight="medium">Omission Rate</Text>
                <Text fontSize="sm" color="gray.600">
                  {analyticsData.trends.omissionRate.toFixed(1)}%
                </Text>
              </HStack>
              <Progress 
                value={analyticsData.trends.omissionRate} 
                colorScheme="orange" 
                size="sm"
              />
              <Text fontSize="xs" color="gray.500" mt={1}>
                {analyticsData.current.omittedTokens} tokens omitted by platforms
              </Text>
            </Box>
          </VStack>
        </CardBody>
      </Card>

      {/* Performance Metrics */}
      <Card>
        <CardHeader>
          <Heading size="sm">Performance Metrics</Heading>
        </CardHeader>
        <CardBody>
          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
            <Stat>
              <StatLabel>Data Load Time</StatLabel>
              <StatNumber>{formatTime(analyticsData.performance.dataLoadTime)}</StatNumber>
              <StatHelpText>Average load time</StatHelpText>
            </Stat>

            <Stat>
              <StatLabel>Merge Time</StatLabel>
              <StatNumber>{formatTime(analyticsData.performance.mergeTime)}</StatNumber>
              <StatHelpText>Data merging duration</StatHelpText>
            </Stat>

            <Stat>
              <StatLabel>Validation Time</StatLabel>
              <StatNumber>{formatTime(analyticsData.performance.validationTime)}</StatNumber>
              <StatHelpText>Validation duration</StatHelpText>
            </Stat>

            <Stat>
              <StatLabel>Memory Usage</StatLabel>
              <StatNumber>{formatMemory(analyticsData.performance.memoryUsage)}</StatNumber>
              <StatHelpText>Current memory consumption</StatHelpText>
            </Stat>

            <Stat>
              <StatLabel>Cache Hit Rate</StatLabel>
              <StatNumber>{analyticsData.performance.cacheHitRate.toFixed(1)}%</StatNumber>
              <StatHelpText>Cache efficiency</StatHelpText>
            </Stat>
          </SimpleGrid>
        </CardBody>
      </Card>

      {/* Platform Breakdown */}
      <Card>
        <CardHeader>
          <Heading size="sm">Platform Breakdown</Heading>
        </CardHeader>
        <CardBody>
          <TableContainer>
            <Table variant="simple" size="sm">
              <Thead>
                <Tr>
                  <Th>Platform</Th>
                  <Th isNumeric>Tokens</Th>
                  <Th isNumeric>Overrides</Th>
                  <Th isNumeric>New</Th>
                  <Th isNumeric>Omitted</Th>
                  <Th>Status</Th>
                  <Th>Last Updated</Th>
                </Tr>
              </Thead>
              <Tbody>
                {analyticsData.platformBreakdown.map((platform) => (
                  <Tr key={platform.platformId}>
                    <Td fontWeight="medium">{platform.platformId}</Td>
                    <Td isNumeric>{platform.tokenCount}</Td>
                    <Td isNumeric>{platform.overrideCount}</Td>
                    <Td isNumeric>{platform.newTokenCount}</Td>
                    <Td isNumeric>{platform.omissionCount}</Td>
                    <Td>
                      <Badge
                        colorScheme={
                          platform.validationStatus === 'valid' ? 'green' :
                          platform.validationStatus === 'warning' ? 'yellow' : 'red'
                        }
                        variant="solid"
                        size="sm"
                      >
                        {platform.validationStatus}
                      </Badge>
                    </Td>
                    <Td fontSize="xs" color="gray.600">
                      {new Date(platform.lastUpdated).toLocaleDateString()}
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </TableContainer>
        </CardBody>
      </Card>
    </VStack>
  );
}; 