import React from 'react';
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
  SimpleGrid,
  Badge,
  Progress,
  Divider,
  Alert,
  AlertIcon
} from '@chakra-ui/react';

interface PlatformAnalyticsProps {
  analytics: {
    totalTokens: number;
    overriddenTokens: number;
    newTokens: number;
    omittedTokens: number;
    platformCount: number;
    themeCount: number;
  };
  platformExtensions: Array<{
    platformId: string;
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }>;
  hasCoreData: boolean;
}

export const PlatformAnalytics: React.FC<PlatformAnalyticsProps> = ({
  analytics,
  platformExtensions,
  hasCoreData
}) => {
  const overridePercentage = analytics.totalTokens > 0 
    ? (analytics.overriddenTokens / analytics.totalTokens) * 100 
    : 0;

  const newTokenPercentage = analytics.totalTokens > 0 
    ? (analytics.newTokens / analytics.totalTokens) * 100 
    : 0;

  const omissionPercentage = analytics.totalTokens > 0 
    ? (analytics.omittedTokens / analytics.totalTokens) * 100 
    : 0;

  const validExtensions = platformExtensions.filter(ext => ext.isValid);
  const invalidExtensions = platformExtensions.filter(ext => !ext.isValid);

  return (
    <VStack spacing={6} align="stretch">
      {/* Overview Stats */}
      <Card>
        <CardHeader>
          <Heading size="md">Platform Analytics Overview</Heading>
        </CardHeader>
        <CardBody>
          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
            <Stat>
              <StatLabel>Total Tokens</StatLabel>
              <StatNumber>{analytics.totalTokens}</StatNumber>
              <StatHelpText>Core data tokens</StatHelpText>
            </Stat>

            <Stat>
              <StatLabel>Platform Extensions</StatLabel>
              <StatNumber>{analytics.platformCount}</StatNumber>
              <StatHelpText>
                {validExtensions.length} valid, {invalidExtensions.length} invalid
              </StatHelpText>
            </Stat>

            <Stat>
              <StatLabel>Theme Overrides</StatLabel>
              <StatNumber>{analytics.themeCount}</StatNumber>
              <StatHelpText>Active theme overrides</StatHelpText>
            </Stat>
          </SimpleGrid>
        </CardBody>
      </Card>

      {/* Token Analysis */}
      <Card>
        <CardHeader>
          <Heading size="md">Token Analysis</Heading>
        </CardHeader>
        <CardBody>
          <VStack spacing={4} align="stretch">
            {/* Overridden Tokens */}
            <Box>
              <HStack justify="space-between" mb={2}>
                <Text fontWeight="medium">Overridden Tokens</Text>
                <Text fontSize="sm" color="gray.600">
                  {analytics.overriddenTokens} of {analytics.totalTokens}
                </Text>
              </HStack>
              <Progress 
                value={overridePercentage} 
                colorScheme="blue" 
                size="sm"
              />
              <Text fontSize="xs" color="gray.500" mt={1}>
                {overridePercentage.toFixed(1)}% of tokens have platform-specific overrides
              </Text>
            </Box>

            {/* New Tokens */}
            <Box>
              <HStack justify="space-between" mb={2}>
                <Text fontWeight="medium">New Tokens</Text>
                <Text fontSize="sm" color="gray.600">
                  {analytics.newTokens} added by platforms
                </Text>
              </HStack>
              <Progress 
                value={newTokenPercentage} 
                colorScheme="green" 
                size="sm"
              />
              <Text fontSize="xs" color="gray.500" mt={1}>
                {newTokenPercentage.toFixed(1)}% of tokens are platform-specific additions
              </Text>
            </Box>

            {/* Omitted Tokens */}
            <Box>
              <HStack justify="space-between" mb={2}>
                <Text fontWeight="medium">Omitted Tokens</Text>
                <Text fontSize="sm" color="gray.600">
                  {analytics.omittedTokens} hidden by platforms
                </Text>
              </HStack>
              <Progress 
                value={omissionPercentage} 
                colorScheme="orange" 
                size="sm"
              />
              <Text fontSize="xs" color="gray.500" mt={1}>
                {omissionPercentage.toFixed(1)}% of tokens are omitted by platforms
              </Text>
            </Box>
          </VStack>
        </CardBody>
      </Card>

      {/* Platform Extension Status */}
      <Card>
        <CardHeader>
          <Heading size="md">Platform Extension Status</Heading>
        </CardHeader>
        <CardBody>
          {platformExtensions.length === 0 ? (
            <Box textAlign="center" py={4}>
              <Text color="gray.500">No platform extensions linked</Text>
            </Box>
          ) : (
            <VStack spacing={4} align="stretch">
              {platformExtensions.map((extension) => (
                <Box key={extension.platformId}>
                  <HStack justify="space-between" mb={2}>
                    <HStack>
                      <Badge 
                        colorScheme={extension.isValid ? 'green' : 'red'}
                        variant="solid"
                      >
                        {extension.isValid ? 'Valid' : 'Invalid'}
                      </Badge>
                      <Text fontWeight="medium">{extension.platformId}</Text>
                    </HStack>
                  </HStack>
                  
                  {extension.errors.length > 0 && (
                    <Alert status="error" size="sm" mb={2}>
                      <AlertIcon />
                      <VStack align="start" spacing={1}>
                        {extension.errors.map((error, index) => (
                          <Text key={index} fontSize="xs">
                            {error}
                          </Text>
                        ))}
                      </VStack>
                    </Alert>
                  )}
                  
                  {extension.warnings.length > 0 && (
                    <Alert status="warning" size="sm">
                      <AlertIcon />
                      <VStack align="start" spacing={1}>
                        {extension.warnings.map((warning, index) => (
                          <Text key={index} fontSize="xs">
                            {warning}
                          </Text>
                        ))}
                      </VStack>
                    </Alert>
                  )}
                  
                  {extension.errors.length === 0 && extension.warnings.length === 0 && (
                    <Text fontSize="sm" color="green.600">
                      ✓ No issues found
                    </Text>
                  )}
                </Box>
              ))}
            </VStack>
          )}
        </CardBody>
      </Card>

      {/* Data Source Status */}
      <Card>
        <CardHeader>
          <Heading size="md">Data Source Status</Heading>
        </CardHeader>
        <CardBody>
          <VStack spacing={3} align="stretch">
            <HStack justify="space-between">
              <Text>Core Data</Text>
              <Badge colorScheme={hasCoreData ? 'green' : 'red'}>
                {hasCoreData ? 'Connected' : 'Not Connected'}
              </Badge>
            </HStack>
            
            <Divider />
            
            <HStack justify="space-between">
              <Text>Platform Extensions</Text>
              <Badge colorScheme={analytics.platformCount > 0 ? 'green' : 'gray'}>
                {analytics.platformCount} Connected
              </Badge>
            </HStack>
            
            <Divider />
            
            <HStack justify="space-between">
              <Text>Theme Overrides</Text>
              <Badge colorScheme={analytics.themeCount > 0 ? 'green' : 'gray'}>
                {analytics.themeCount} Connected
              </Badge>
            </HStack>
          </VStack>
        </CardBody>
      </Card>
    </VStack>
  );
}; 