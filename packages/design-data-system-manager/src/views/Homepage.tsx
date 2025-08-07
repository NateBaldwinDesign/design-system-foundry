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
  Flex,
  Spinner,
  Popover,
  PopoverTrigger,
  IconButton,
  PopoverContent,
  PopoverArrow,
  PopoverBody,
  Avatar,
} from '@chakra-ui/react';
import { Github, ExternalLink } from 'lucide-react';
import { FindDesignSystemDialog } from '../components/FindDesignSystemDialog';
import type { GitHubUser } from '../config/github';
import { within } from '@storybook/test';
import Logo from '../components/Logo';

interface HomepageProps {
  isGitHubConnected?: boolean;
  // GitHub state and handlers from app level
  githubUser?: GitHubUser | null;
  onGitHubConnect?: () => Promise<void>;
  onGitHubDisconnect?: () => void;
  selectedRepoInfo?: {
    fullName: string;
    branch: string;
    filePath: string;
    fileType: 'schema' | 'theme-override' | 'platform-extension';
  } | null;
}

export const Homepage: React.FC<HomepageProps> = ({
  isGitHubConnected = false,
  githubUser,
  selectedRepoInfo,
  onGitHubConnect,
  onGitHubDisconnect,
}) => {
  const { colorMode } = useColorMode();
  const toast = useToast();
  const [showFindDesignSystem, setShowFindDesignSystem] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [isGitHubConnecting, setIsGitHubConnecting] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);


  const handleGitHubConnect = async () => {
    setIsGitHubConnecting(true);
    
    try {
      // Add a small delay to show loading state for better UX
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Use the app-level handler
      if (onGitHubConnect) {
        await onGitHubConnect();
      }
      
    } catch (error) {
      console.error('GitHub connection error:', error);
      setIsGitHubConnecting(false);
      
      toast({
        title: 'GitHub Connection Failed',
        description: error instanceof Error ? error.message : 'Failed to connect to GitHub. Please try again.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } 
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleGitHubDisconnect = () => {
    
    // Use the app-level handler
    if (onGitHubDisconnect) {
      onGitHubDisconnect();
    }
    
    // Clear local UI state
    setShowFindDesignSystem(false);
    setIsGitHubConnecting(false);
    setIsUserMenuOpen(false)
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
  const borderColor = colorMode === 'dark' ? 'gray.700' : 'gray.200';

  console.log('=============================')
  console.log(`Signed in? ${isGitHubConnected}`)
  console.log(`User ${githubUser}`)


  return (
    <VStack width="100%" align="stretch" gap={0}>
      <Box
        as="header"
        borderBottom="1px"
        borderColor={borderColor}
        bg={bgColor}
        px={4}
        // py={3}
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        width="100%"
      >
        <HStack spacing={2} alignItems="center" align="stretch" width="100%" justifyContent="space-between">
          {/* Logo */}
          <Box px={4} py={3} display="flex" gap={2} justifyContent="center" alignItems="center">
            <Logo size={28} color={colorMode === 'dark' ? 'white' : 'black'} />
            {/* Title */}

            {/* <Text fontSize="sm" lineHeight="1" fontWeight="bold">
              Design System<br/>Foundry
            </Text> */}

          </Box>

          {/* GitHub Connection */}
          {githubUser ? (
            <Popover 
            placement="bottom-end" 
            isOpen={isUserMenuOpen} 
            onClose={() => setIsUserMenuOpen(false)}
          >
            <PopoverTrigger>
              <IconButton
                aria-label="User Menu"
                icon={<Avatar size="xs" src={githubUser.avatar_url}/>}
                size="sm"
                variant="ghost"
                onClick={() => setIsUserMenuOpen(true)}
              />
            </PopoverTrigger>
            <PopoverContent p={0} w="auto" minW="200px">
              <PopoverArrow />
              <PopoverBody p={2}>
                <VStack spacing={0} align="stretch">
                  <HStack p={2} mb={2} w="full" justifyContent="space-between" alignItems="center">
                    <VStack spacing={0} align="flex-start">
                      <Avatar size="lg" src={githubUser.avatar_url} mb={2}/>
                      <Text fontSize="sm" fontWeight="bold">{githubUser.login}</Text>
                      <Text fontSize="xs" color="gray.500">{githubUser.email}</Text>
                    </VStack>
                  </HStack>
                  <Divider mb={2} />
                  <Button
                    variant="ghost"
                    size="sm"
                    justifyContent="flex-start"
                    borderRadius={0}
                    onClick={() => {
                      window.open(`https://github.com/${githubUser.login}`, '_blank');
                      setIsUserMenuOpen(false);
                    }}
                  >
                    View Profile
                  </Button>
                  {selectedRepoInfo && (
                    <Button
                      variant="ghost"
                      size="sm"
                      justifyContent="flex-start"
                      borderRadius={0}
                      onClick={() => {
                        window.open(`https://github.com/${selectedRepoInfo.fullName}/pulls?q=author:${githubUser.login}`, '_blank');
                        setIsUserMenuOpen(false);
                      }}
                    >
                      My Pull Requests
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    justifyContent="flex-start"
                    borderRadius={0}
                    colorScheme="red"
                    onClick={() => {
                      handleGitHubDisconnect();
                      setIsUserMenuOpen(false);
                    }}
                  >
                    Sign out
                  </Button>
                </VStack>
              </PopoverBody>
            </PopoverContent>
          </Popover>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={handleGitHubConnect}
              isLoading={isGitHubConnecting}
              isDisabled={isGitHubConnecting}
              leftIcon={isGitHubConnecting ? <Spinner size="sm" /> : <Github size={16} />}
            >
              Sign in
            </Button>
          )}
        </HStack>
      </Box>
      <Box
        minH="100vh"
        bg={bgColor}
        display="flex"
        alignItems="flex-start"
        justifyContent="center"
        p={4}
        pt={64}
      >
        <VStack spacing={8} w="full">
          {/* Header */}
          <VStack spacing={4} textAlign="center" mb={8}>
            <Heading size="2xl" fontWeight={900} color={colorMode === 'dark' ? 'white' : 'gray.800'} mb={4}>
              Design System Foundry
            </Heading>
            <Text fontSize={16} color={colorMode === 'dark' ? 'gray.300' : 'gray.600'}>
              Sophisticated design data management system for design system professionals.
            </Text>
          </VStack>

          {/* Main Content */}
          <VStack spacing={6} maxW="lg" w="full">

            {/* Load from URL */}
            <Card w="full" bg={cardBg}>
              <CardHeader pb={2}>
                <Heading size="md">Load from GitHub</Heading>
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
                    Load Design System
                  </Button>
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
    </VStack>
  );
}; 