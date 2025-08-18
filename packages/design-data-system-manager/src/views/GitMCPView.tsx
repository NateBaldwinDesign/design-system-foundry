/**
 * GitMCP View
 * Provides conversational AI interface for design system knowledge
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  useColorMode,
  useToast,
  Badge,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Grid,
  GridItem,
  Divider,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription
} from '@chakra-ui/react';
import { LuBot, LuRefreshCw, LuDatabase, LuMessageCircle } from 'react-icons/lu';
import { PageTemplate } from '../components/PageTemplate';
import { GitMCPChatbot } from '../components/gitmcp/GitMCPChatbot';
import { useGitMCP } from '../contexts/GitMCPContext';

interface GitMCPViewProps {
  canEdit?: boolean;
}

export const GitMCPView: React.FC<GitMCPViewProps> = ({ canEdit = false }) => {
  const { colorMode } = useColorMode();
  const toast = useToast();
  const gitmcp = useGitMCP();
  
  const [status, setStatus] = useState<{
    isAvailable: boolean;
    isTrained: boolean;
    documentCount: number;
    lastUpdated?: string;
  }>({
    isAvailable: false,
    isTrained: false,
    documentCount: 0
  });

  const [cacheStats, setCacheStats] = useState({
    memoryCacheSize: 0,
    localStorageEntries: 0,
    totalSize: 0
  });

  // Suggested questions for the chatbot
  const suggestions = [
    "What tokens are available in my design system?",
    "How do I create a new component?",
    "What are the current dimensions and modes?",
    "How do I organize tokens with taxonomies?",
    "What platforms does my design system support?",
    "How do I export tokens for different platforms?",
    "What are the best practices for naming tokens?",
    "How do I manage theme overrides?"
  ];

  // Update status and cache stats
  useEffect(() => {
    const updateStats = async () => {
      try {
        const newStatus = await gitmcp.getStatus();
        setStatus(newStatus);
        
        const newCacheStats = gitmcp.getCacheStats();
        setCacheStats(newCacheStats);
      } catch (error) {
        console.error('[GitMCPView] Failed to update stats:', error);
      }
    };

    updateStats();
    
    // Update stats every 30 seconds
    const interval = setInterval(updateStats, 30000);
    return () => clearInterval(interval);
  }, [gitmcp]);

  const handleRefresh = async () => {
    try {
      await gitmcp.refreshKnowledgeBase();
      toast({
        title: 'Knowledge Base Refreshed',
        description: 'The knowledge base has been updated with the latest data.',
        status: 'success',
        duration: 3000,
        isClosable: true
      });
    } catch (error) {
      console.error('[GitMCPView] Refresh failed:', error);
      toast({
        title: 'Refresh Failed',
        description: 'Failed to refresh the knowledge base.',
        status: 'error',
        duration: 5000,
        isClosable: true
      });
    }
  };

  const getStatusColor = () => {
    if (!status.isAvailable) return 'red';
    if (!status.isTrained) return 'yellow';
    return 'green';
  };

  const getStatusText = () => {
    if (!status.isAvailable) return 'Service Unavailable';
    if (!status.isTrained) return 'Not Trained';
    return 'Ready';
  };

  return (
    <PageTemplate
      title="AI Assistant"
      description="Ask questions about your design system and get intelligent answers powered by GitMCP."
    >
      <VStack spacing={6} align="stretch">
        {/* Status Overview */}
        <Box
          p={6}
          borderWidth={1}
          borderRadius="lg"
          bg={colorMode === 'dark' ? 'gray.800' : 'white'}
          borderColor={colorMode === 'dark' ? 'gray.600' : 'gray.200'}
        >
          <HStack justify="space-between" align="start" mb={4}>
            <VStack align="start" spacing={1}>
              <HStack spacing={2}>
                <LuBot size={24} />
                <Text fontSize="xl" fontWeight="bold">
                  Design System AI Assistant
                </Text>
              </HStack>
              <Text fontSize="sm" color="gray.500">
                Powered by GitMCP - Your conversational knowledge base
              </Text>
            </VStack>
            
            <HStack spacing={3}>
              <Badge colorScheme={getStatusColor()} variant="subtle" fontSize="sm">
                {getStatusText()}
              </Badge>
              <Button
                leftIcon={<LuRefreshCw />}
                size="sm"
                variant="outline"
                onClick={handleRefresh}
                isLoading={!status.isAvailable}
              >
                Refresh
              </Button>
            </HStack>
          </HStack>

          {/* Status Grid */}
          <Grid templateColumns="repeat(auto-fit, minmax(200px, 1fr))" gap={4}>
            <GridItem>
              <Stat>
                <StatLabel>Service Status</StatLabel>
                <StatNumber>
                  <Badge colorScheme={getStatusColor()} variant="subtle">
                    {getStatusText()}
                  </Badge>
                </StatNumber>
                <StatHelpText>
                  {status.isAvailable ? 'GitMCP service is running' : 'GitMCP service is not available'}
                </StatHelpText>
              </Stat>
            </GridItem>
            
            <GridItem>
              <Stat>
                <StatLabel>Knowledge Base</StatLabel>
                <StatNumber>{status.documentCount}</StatNumber>
                <StatHelpText>Documents indexed</StatHelpText>
              </Stat>
            </GridItem>
            
            <GridItem>
              <Stat>
                <StatLabel>Cache Size</StatLabel>
                <StatNumber>{(cacheStats.totalSize / 1024).toFixed(1)} KB</StatNumber>
                <StatHelpText>Local storage used</StatHelpText>
              </Stat>
            </GridItem>
            
            <GridItem>
              <Stat>
                <StatLabel>Last Updated</StatLabel>
                <StatNumber>
                  {status.lastUpdated 
                    ? new Date(status.lastUpdated).toLocaleDateString()
                    : 'Never'
                  }
                </StatNumber>
                <StatHelpText>
                  {status.lastUpdated 
                    ? new Date(status.lastUpdated).toLocaleTimeString()
                    : 'No data available'
                  }
                </StatHelpText>
              </Stat>
            </GridItem>
          </Grid>
        </Box>

        {/* Service Status Alert */}
        {!status.isAvailable && (
          <Alert status="warning">
            <AlertIcon />
            <Box>
              <AlertTitle>GitMCP Service Not Available</AlertTitle>
              <AlertDescription>
                The GitMCP service is not running or not accessible. Please ensure GitMCP is installed and running on localhost:3001.
                You can still use the interface, but AI features will not be available.
              </AlertDescription>
            </Box>
          </Alert>
        )}

        {/* Chatbot Interface */}
        <Box
          borderWidth={1}
          borderRadius="lg"
          bg={colorMode === 'dark' ? 'gray.800' : 'white'}
          borderColor={colorMode === 'dark' ? 'gray.600' : 'gray.200'}
          minHeight="600px"
        >
          <GitMCPChatbot
            suggestions={suggestions}
            maxHeight="600px"
            showStatus={false}
          />
        </Box>

        {/* Information Panel */}
        <Box
          p={6}
          borderWidth={1}
          borderRadius="lg"
          bg={colorMode === 'dark' ? 'gray.800' : 'white'}
          borderColor={colorMode === 'dark' ? 'gray.600' : 'gray.200'}
        >
          <VStack align="start" spacing={4}>
            <HStack spacing={2}>
              <LuMessageCircle />
              <Text fontSize="lg" fontWeight="bold">
                How to Use the AI Assistant
              </Text>
            </HStack>
            
            <Text fontSize="sm" color="gray.600">
              The AI Assistant can help you understand and manage your design system by answering questions about:
            </Text>
            
            <Grid templateColumns="repeat(auto-fit, minmax(250px, 1fr))" gap={4} w="100%">
              <VStack align="start" spacing={2}>
                <Text fontWeight="semibold" fontSize="sm">Design Tokens</Text>
                <Text fontSize="xs" color="gray.500">
                  • Available tokens and their values<br/>
                  • Token organization and naming<br/>
                  • Token relationships and dependencies
                </Text>
              </VStack>
              
              <VStack align="start" spacing={2}>
                <Text fontWeight="semibold" fontSize="sm">Components</Text>
                <Text fontSize="xs" color="gray.500">
                  • Component definitions and properties<br/>
                  • Component categories and organization<br/>
                  • Component usage patterns
                </Text>
              </VStack>
              
              <VStack align="start" spacing={2}>
                <Text fontWeight="semibold" fontSize="sm">System Architecture</Text>
                <Text fontSize="xs" color="gray.500">
                  • Dimensions and modes<br/>
                  • Platform support and exports<br/>
                  • Theme overrides and customization
                </Text>
              </VStack>
              
              <VStack align="start" spacing={2}>
                <Text fontWeight="semibold" fontSize="sm">Best Practices</Text>
                <Text fontSize="xs" color="gray.500">
                  • Naming conventions<br/>
                  • Organization strategies<br/>
                  • Export and usage guidelines
                </Text>
              </VStack>
            </Grid>
            
            <Divider />
            
            <Text fontSize="xs" color="gray.500">
              <strong>Note:</strong> The AI Assistant uses GitMCP to analyze your repository data and provide contextual answers. 
              Make sure your repository is connected and the knowledge base is up to date for the best experience.
            </Text>
          </VStack>
        </Box>
      </VStack>
    </PageTemplate>
  );
};
