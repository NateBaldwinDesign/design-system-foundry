import React, { useState } from 'react';
import {
  Box,
  VStack,
  Heading,
  Text,
  Button,
  Card,
  CardBody,
  CardHeader,
  useToast,
  useColorMode,
  HStack,
  Icon,
  Divider,
} from '@chakra-ui/react';
import { Github, ExternalLink } from 'lucide-react';
import { FindDesignSystemDialog } from '../components/FindDesignSystemDialog';
import type { GitHubUser } from '../config/github';
import { within } from '@storybook/test';

interface HomepageProps {
  isGitHubConnected?: boolean;
  githubUser?: GitHubUser | null;
  onGitHubConnect?: () => Promise<void>;
  onGitHubDisconnect?: () => void;
}

export const Homepage: React.FC<HomepageProps> = ({
  isGitHubConnected = false,
  githubUser,
  onGitHubConnect,
  onGitHubDisconnect,
}) => {
  const { colorMode } = useColorMode();
  const toast = useToast();
  const [showFindDesignSystem, setShowFindDesignSystem] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSignIn = async () => {
    if (onGitHubConnect) {
      setIsLoading(true);
      try {
        await onGitHubConnect();
      } catch (error) {
        console.error('GitHub connection error:', error);
        toast({
          title: 'GitHub Connection Failed',
          description: error instanceof Error ? error.message : 'Failed to connect to GitHub. Please try again.',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleSignOut = () => {
    if (onGitHubDisconnect) {
      onGitHubDisconnect();
    }
    toast({
      title: 'Signed Out',
      description: 'Successfully signed out of GitHub.',
      status: 'info',
      duration: 3000,
      isClosable: true,
    });
  };

  const handleDesignSystemSelected = (repo: string, filePath: string) => {
    // Load the design system using the existing URL-based logic
    const url = new URL(window.location.href);
    url.searchParams.set('repo', repo);
    url.searchParams.set('path', filePath);
    url.searchParams.set('branch', 'main');
    window.location.href = url.toString();
  };

  const bgColor = colorMode === 'dark' ? 'gray.900' : 'gray.50';
  const cardBg = colorMode === 'dark' ? 'gray.800' : 'white';

  return (
    <Box
      minH="100vh"
      bg={bgColor}
      display="flex"
      alignItems="center"
      justifyContent="center"
      p={4}
    >
      <VStack spacing={8} maxW="md" w="full">
        {/* Header */}
        <VStack spacing={4} textAlign="center">
          <Heading size="xl" color={colorMode === 'dark' ? 'white' : 'gray.800'}>
            Design System Foundry
          </Heading>
          <Text color={colorMode === 'dark' ? 'gray.300' : 'gray.600'}>
            View and manage design tokens from GitHub repositories
          </Text>
        </VStack>

        {/* Main Content */}
        <VStack spacing={6} w="full">
          {/* GitHub Authentication */}
          <Card w="full" bg={cardBg}>
            <CardHeader pb={2}>
              <HStack>
                <Icon as={Github} />
                <Heading size="md">Sign in with GitHub</Heading>
              </HStack>
            </CardHeader>
            <CardBody pt={0}>
              {isGitHubConnected && githubUser ? (
                <VStack spacing={4} align="stretch">
                  <HStack justify="space-between">
                    <Text>Signed in as: <strong>{githubUser.login}</strong></Text>
                    <Button size="sm" variant="outline" onClick={handleSignOut}>
                      Sign Out
                    </Button>
                  </HStack>
                  <Divider />
                  <VStack spacing={3} align="stretch">
                    <Button
                      leftIcon={<ExternalLink size={16} />}
                      onClick={() => setShowFindDesignSystem(true)}
                      colorScheme="blue"
                    >
                      Browse Design Systems
                    </Button>
                    <Text fontSize="sm" color="gray.500">
                      Find and load design systems from your repositories
                    </Text>
                  </VStack>
                </VStack>
              ) : (
                <VStack spacing={4} align="stretch">
                  <Text>Connect to GitHub to access your design systems</Text>
                  <Button
                    leftIcon={<Github size={16} />}
                    onClick={handleSignIn}
                    isLoading={isLoading}
                    loadingText="Connecting..."
                    colorScheme="blue"
                  >
                    Sign in with GitHub
                  </Button>
                </VStack>
              )}
            </CardBody>
          </Card>

          {/* Load from URL */}
          <Card w="full" bg={cardBg}>
            <CardHeader pb={2}>
              <Heading size="md">Load from URL</Heading>
            </CardHeader>
            <CardBody pt={0}>
              <VStack spacing={4} align="stretch">
                <Text fontSize="sm" color="gray.500">
                  Enter a GitHub repository URL to load its design system
                </Text>
                <Button
                  leftIcon={<ExternalLink size={16} />}
                  onClick={() => setShowFindDesignSystem(true)}
                  colorScheme="green"
                >
                  Load Repository
                </Button>
              </VStack>
            </CardBody>
          </Card>

          {/* Quick Examples */}
          <Card w="full" bg={cardBg}>
            <CardHeader pb={2}>
              <Heading size="md">Quick Examples</Heading>
            </CardHeader>
            <CardBody pt={0}>
              <VStack spacing={3} align="stretch">
                <Button
                  variant="outline"
                  onClick={() => {
                    const url = new URL(window.location.href);
                    url.searchParams.set('repo', 'NateBaldwinDesign/Test_Design_System');
                    url.searchParams.set('path', 'src/nested/whynot/test_design_system_data.json');
                    url.searchParams.set('branch', 'main');
                    window.location.href = url.toString();
                  }}
                  size="sm"
                >
                  Load Test Design System
                </Button>
                <Text fontSize="sm" color="gray.500">
                  Try the example design system to see the interface in action
                </Text>
              </VStack>
            </CardBody>
          </Card>
        </VStack>
      </VStack>

      {/* Find Design System Dialog */}
      <FindDesignSystemDialog
        isOpen={showFindDesignSystem}
        onClose={() => setShowFindDesignSystem(false)}
        onDesignSystemSelected={handleDesignSystemSelected}
      />
    </Box>
  );
}; 