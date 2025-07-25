import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardBody,
  CardHeader,
  Heading,
  Text,
  VStack,
  HStack,
  Button,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Alert,
  AlertIcon,
  useToast,
  Collapse,
  Badge,
  SimpleGrid
} from '@chakra-ui/react';
import { GitHubCacheService } from '../services/githubCache';

interface CacheStats {
  totalEntries: number;
  expiredEntries: number;
  validEntries: number;
  totalSize: number;
  availableStorage: number;
}

export const CacheDebugPanel: React.FC = () => {
  const [stats, setStats] = useState<CacheStats | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const toast = useToast();

  const updateStats = () => {
    const cacheStats = GitHubCacheService.getCacheStats();
    setStats(cacheStats);
  };

  useEffect(() => {
    updateStats();
    // Update stats every 5 seconds
    const interval = setInterval(updateStats, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleClearCache = async () => {
    setIsClearing(true);
    try {
      GitHubCacheService.forceClearAll();
      updateStats();
      toast({
        title: 'Cache Cleared',
        description: 'All GitHub cache has been cleared successfully.',
        status: 'success',
        duration: 3000,
        isClosable: true
      });
    } catch (error) {
      toast({
        title: 'Cache Clear Failed',
        description: 'Failed to clear cache. Please try again.',
        status: 'error',
        duration: 5000,
        isClosable: true
      });
    } finally {
      setIsClearing(false);
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStorageStatus = (): 'good' | 'warning' | 'critical' => {
    if (!stats) return 'good';
    
    const usagePercentage = (stats.totalSize / (stats.totalSize + stats.availableStorage)) * 100;
    
    if (usagePercentage > 80) return 'critical';
    if (usagePercentage > 60) return 'warning';
    return 'good';
  };

  const getStatusColor = (status: 'good' | 'warning' | 'critical') => {
    switch (status) {
      case 'good': return 'green';
      case 'warning': return 'yellow';
      case 'critical': return 'red';
    }
  };

  if (!stats) {
    return (
      <Card>
        <CardBody>
          <Text>Loading cache statistics...</Text>
        </CardBody>
      </Card>
    );
  }

  const storageStatus = getStorageStatus();

  return (
    <Card>
      <CardHeader>
        <HStack justify="space-between">
          <Box>
            <Heading size="sm">GitHub Cache Debug</Heading>
            <Text fontSize="sm" color="gray.600" mt={1}>
              Monitor and manage GitHub API cache storage
            </Text>
          </Box>
          <Badge colorScheme={getStatusColor(storageStatus)}>
            {storageStatus.toUpperCase()}
          </Badge>
        </HStack>
      </CardHeader>
      <CardBody>
        <VStack spacing={4} align="stretch">
          {/* Storage Status Alert */}
          {storageStatus !== 'good' && (
            <Alert status={storageStatus === 'critical' ? 'error' : 'warning'}>
              <AlertIcon />
              {storageStatus === 'critical' 
                ? 'Storage usage is critical. Consider clearing cache to free space.'
                : 'Storage usage is high. Monitor cache size.'
              }
            </Alert>
          )}

          {/* Basic Stats */}
          <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={4}>
            <Stat>
              <StatLabel>Total Entries</StatLabel>
              <StatNumber>{stats.totalEntries}</StatNumber>
              <StatHelpText>Cache entries</StatHelpText>
            </Stat>

            <Stat>
              <StatLabel>Valid Entries</StatLabel>
              <StatNumber color="green.500">{stats.validEntries}</StatNumber>
              <StatHelpText>Not expired</StatHelpText>
            </Stat>

            <Stat>
              <StatLabel>Expired Entries</StatLabel>
              <StatNumber color="red.500">{stats.expiredEntries}</StatNumber>
              <StatHelpText>Ready for cleanup</StatHelpText>
            </Stat>

            <Stat>
              <StatLabel>Total Size</StatLabel>
              <StatNumber>{formatBytes(stats.totalSize)}</StatNumber>
              <StatHelpText>Cache storage used</StatHelpText>
            </Stat>
          </SimpleGrid>

          {/* Available Storage */}
          <Box>
            <Text fontWeight="medium" mb={2}>Available Storage</Text>
            <Text fontSize="lg" color={getStatusColor(storageStatus)}>
              {formatBytes(stats.availableStorage)}
            </Text>
            <Text fontSize="sm" color="gray.600">
              Estimated available localStorage space
            </Text>
          </Box>

          {/* Actions */}
          <HStack spacing={3}>
            <Button
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              variant="outline"
            >
              {isExpanded ? 'Hide' : 'Show'} Details
            </Button>
            <Button
              size="sm"
              colorScheme="blue"
              onClick={updateStats}
            >
              Refresh Stats
            </Button>
            <Button
              size="sm"
              colorScheme="red"
              onClick={handleClearCache}
              isLoading={isClearing}
              loadingText="Clearing..."
            >
              Clear All Cache
            </Button>
          </HStack>

          {/* Detailed Information */}
          <Collapse in={isExpanded}>
            <Box mt={4} p={4} bg="gray.50" borderRadius="md">
              <Text fontSize="sm" fontWeight="medium" mb={2}>Cache Details:</Text>
              <VStack spacing={2} align="stretch">
                <Text fontSize="xs">
                  <strong>Cache Prefix:</strong> github_cache_
                </Text>
                <Text fontSize="xs">
                  <strong>Storage Limit:</strong> ~5MB (varies by browser)
                </Text>
                <Text fontSize="xs">
                  <strong>Repository Cache:</strong> Max 1000 entries, 1MB
                </Text>
                <Text fontSize="xs">
                  <strong>Branch Cache:</strong> Max 100KB per repository
                </Text>
                <Text fontSize="xs">
                  <strong>Organization Cache:</strong> Max 50KB
                </Text>
                <Text fontSize="xs">
                  <strong>TTL:</strong> Repos 5min, Branches 2min, Orgs 10min
                </Text>
              </VStack>
            </Box>
          </Collapse>
        </VStack>
      </CardBody>
    </Card>
  );
}; 