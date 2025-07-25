import React, { useEffect, useState, useRef } from 'react';
import {
  Box,
  Spinner,
  Text,
  VStack,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Button,
} from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { GitHubAuthService } from '../services/githubAuth';
import { useToast } from '@chakra-ui/react';
import { GitHubRepoSelector } from './GitHubRepoSelector';
import { ChangeTrackingService } from '../services/changeTrackingService';

export const GitHubCallback: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState<string>('');
  const [showRepoSelector, setShowRepoSelector] = useState(false);
  const hasProcessedCallback = useRef(false);

  useEffect(() => {
    const handleCallback = async () => {
      // Prevent multiple callback processing
      if (hasProcessedCallback.current) {
        return;
      }
      
      hasProcessedCallback.current = true;
      
      try {
        // Get URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const state = urlParams.get('state');
        const error = urlParams.get('error');

        if (error) {
          throw new Error(`GitHub authorization error: ${error}`);
        }

        if (!code || !state) {
          // No OAuth parameters - user might have navigated here directly
          // Check if they're already authenticated
          if (GitHubAuthService.isAuthenticated()) {
            setStatus('success');
            setShowRepoSelector(true);
            return;
          }
          throw new Error('Missing authorization code or state parameter');
        }

        // Handle the OAuth callback
        const user = await GitHubAuthService.handleCallback(code, state);

        setStatus('success');
        
        toast({
          title: 'GitHub Connected',
          description: `Successfully connected to GitHub as ${user.login}`,
          status: 'success',
          duration: 5000,
          isClosable: true,
        });

        // Show repository selector instead of redirecting
        setShowRepoSelector(true);

      } catch (error) {
        console.error('GitHub callback error:', error);
        setError(error instanceof Error ? error.message : 'Unknown error occurred');
        setStatus('error');
        // Reset the flag on error so user can retry
        hasProcessedCallback.current = false;
      }
    };

    handleCallback();
  }, [navigate, toast]);

  const handleFileSelected = async (fileContent: Record<string, unknown>, fileType: 'schema' | 'theme-override') => {
    try {
      // Load data via DataManager to ensure it's properly stored
      const { DataManager } = await import('../services/dataManager');
      const dataManager = DataManager.getInstance();
      await dataManager.loadFromGitHub(fileContent, fileType);
      
      // Update last GitHub sync timestamp
      ChangeTrackingService.updateLastGitHubSync();
      
      // Dispatch event to notify the main app that GitHub data has been loaded
      window.dispatchEvent(new CustomEvent('github:file-loaded'));
      
      // Dispatch data change event to update change log
      window.dispatchEvent(new CustomEvent('token-model:data-change'));
      
      toast({
        title: 'Data Loaded',
        description: `Successfully loaded ${fileType === 'schema' ? 'core data' : 'theme override'} from GitHub`,
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      
      // Redirect to the main app
      navigate('/');
    } catch (error) {
      console.error('[GitHubCallback] Error loading file data:', error);
      toast({
        title: 'Error Loading Data',
        description: 'Failed to load data from GitHub. Please try again.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleRepoSelectorClose = () => {
    // If user cancels repository selection, redirect to main app
    navigate('/');
  };

  const handleRetryAuth = async () => {
    // Clear any existing auth data and stale state parameters
    GitHubAuthService.logout();
    GitHubAuthService.clearOAuthState();
    await GitHubAuthService.initiateAuth();
  };

  const handleShowRepoSelector = () => {
    setShowRepoSelector(true);
  };

  const handleClearAndRetry = async () => {
    // Clear everything and start fresh
    GitHubAuthService.logout();
    GitHubAuthService.clearOAuthState();
    // Clear any stored repository info
    localStorage.removeItem('github_selected_repo');
    // Retry authentication
    await GitHubAuthService.initiateAuth();
  };

  if (showRepoSelector) {
    return (
      <GitHubRepoSelector
        isOpen={showRepoSelector}
        onClose={handleRepoSelectorClose}
        onFileSelected={handleFileSelected}
      />
    );
  }

  if (status === 'loading') {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
        flexDirection="column"
      >
        <VStack spacing={4}>
          <Spinner size="xl" />
          <Text>Connecting to GitHub...</Text>
        </VStack>
      </Box>
    );
  }

  if (status === 'error') {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
        flexDirection="column"
        p={8}
      >
        <VStack spacing={6} maxW="md">
          <Alert status="error">
            <AlertIcon />
            <Box>
              <AlertTitle>GitHub Connection Failed</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Box>
          </Alert>
          
          <VStack spacing={3}>
            <Button
              colorScheme="blue"
              onClick={handleRetryAuth}
            >
              Retry GitHub Connection
            </Button>
            
            <Button
              variant="outline"
              onClick={handleClearAndRetry}
            >
              Clear All & Retry
            </Button>
            
            {GitHubAuthService.isAuthenticated() && (
              <Button
                variant="outline"
                onClick={handleShowRepoSelector}
              >
                Select Repository
              </Button>
            )}
            
            <Button
              variant="ghost"
              onClick={() => navigate('/')}
            >
              Return to App
            </Button>
          </VStack>
        </VStack>
      </Box>
    );
  }

  return (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      minHeight="100vh"
      flexDirection="column"
      p={8}
    >
      <VStack spacing={6} maxW="md">
        <Alert status="success">
          <AlertIcon />
          <Box>
            <AlertTitle>GitHub Connected Successfully</AlertTitle>
            <AlertDescription>
              Please select a repository and file to load.
            </AlertDescription>
          </Box>
        </Alert>
        
        <Spinner size="md" />
      </VStack>
    </Box>
  );
}; 