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

import { ChangeTrackingService } from '../services/changeTrackingService';
import { URLStateManager } from '../services/urlStateManager';
import { DataSourceManager } from '../services/dataSourceManager';

export const GitHubCallback: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState<string>('');

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
            // Redirect to main app - user can use "Find New Design System" from there
            navigate('/');
            return;
          }
          throw new Error('Missing authorization code or state parameter');
        }

        // Handle the OAuth callback
        const user = await GitHubAuthService.handleCallback(code, state);

        setStatus('success');
        
        // Check for URL parameters to determine next steps
        const callbackUrlParams = new URLSearchParams(window.location.search);
        const repo = callbackUrlParams.get('repo');
        const path = callbackUrlParams.get('path');
        const branch = callbackUrlParams.get('branch') || 'main';
        const platform = callbackUrlParams.get('platform');
        const theme = callbackUrlParams.get('theme');

        if (repo && path) {
          // URL parameters present - check permissions and load data directly
          console.log('[GitHubCallback] URL parameters detected, checking permissions and loading data');
          
          try {
            // Check if user has write access to the repository
            const { GitHubApiService } = await import('../services/githubApi');
            const hasWriteAccess = await GitHubApiService.hasWriteAccessToRepository(repo);
            
            if (hasWriteAccess) {
              // User has write access - load with read/write UX
              console.log('[GitHubCallback] User has write access, loading with read/write UX');
              
              // Load the file content
              const fileContent = await GitHubApiService.getFileContent(repo, path, branch);
              const parsedData = JSON.parse(fileContent.content);
              
              // Determine file type
              const fileType = path.includes('theme') ? 'theme-override' : 'schema';
              
              // Load data via DataManager
              const { DataManager } = await import('../services/dataManager');
              const dataManager = DataManager.getInstance();
              await dataManager.loadFromGitHub(parsedData, fileType);
              
              // Update last GitHub sync timestamp
              ChangeTrackingService.updateLastGitHubSync();
              
              // Dispatch events to notify the main app
              window.dispatchEvent(new CustomEvent('github:file-loaded'));
              window.dispatchEvent(new CustomEvent('token-model:data-change'));
              
              // Initialize data source context from URL parameters
              const dataSourceManager = DataSourceManager.getInstance();
              if (platform || theme) {
                console.log('[GitHubCallback] Initializing data source context from URL parameters:', { platform, theme });
                
                // Initialize data source context from URL
                dataSourceManager.initializeFromURL();
                
                // Update URL parameters to reflect data source context
                URLStateManager.updateMultipleURLParameters({
                  platform: platform || undefined,
                  theme: theme || undefined
                });
              }

              // Set repository info and permissions
              window.dispatchEvent(new CustomEvent('github:permissions-checked', {
                detail: {
                  hasWriteAccess: true,
                  repoInfo: {
                    fullName: repo,
                    branch,
                    filePath: path,
                    fileType
                  }
                }
              }));
              
              toast({
                title: 'Signed in with Write Access',
                description: `Successfully signed in as ${user.login} with write access to ${repo}`,
                status: 'success',
                duration: 5000,
                isClosable: true,
              });
              
              // Redirect to main app
              navigate('/');
              
            } else {
              // User has view-only access - load with view-only UX
              console.log('[GitHubCallback] User has view-only access, loading with view-only UX');
              
              // Load the file content
              const fileContent = await GitHubApiService.getFileContent(repo, path, branch);
              const parsedData = JSON.parse(fileContent.content);
              
              // Determine file type
              const fileType = path.includes('theme') ? 'theme-override' : 'schema';
              
              // Load data via DataManager
              const { DataManager } = await import('../services/dataManager');
              const dataManager = DataManager.getInstance();
              await dataManager.loadFromGitHub(parsedData, fileType);
              
              // Update last GitHub sync timestamp
              ChangeTrackingService.updateLastGitHubSync();
              
              // Dispatch events to notify the main app
              window.dispatchEvent(new CustomEvent('github:file-loaded'));
              window.dispatchEvent(new CustomEvent('token-model:data-change'));
              
              // Initialize data source context from URL parameters
              const dataSourceManager = DataSourceManager.getInstance();
              if (platform || theme) {
                console.log('[GitHubCallback] Initializing data source context from URL parameters (view-only):', { platform, theme });
                
                // Initialize data source context from URL
                dataSourceManager.initializeFromURL();
                
                // Update URL parameters to reflect data source context
                URLStateManager.updateMultipleURLParameters({
                  platform: platform || undefined,
                  theme: theme || undefined
                });
              }
              
              // Set repository info and permissions
              window.dispatchEvent(new CustomEvent('github:permissions-checked', {
                detail: {
                  hasWriteAccess: false,
                  repoInfo: {
                    fullName: repo,
                    branch,
                    filePath: path,
                    fileType
                  }
                }
              }));
              
              toast({
                title: 'Signed in with View-Only Access',
                description: `Successfully signed in as ${user.login} with view-only access to ${repo}`,
                status: 'info',
                duration: 5000,
                isClosable: true,
              });
              
              // Redirect to main app
              navigate('/');
            }
            
          } catch (error) {
            console.error('[GitHubCallback] Error checking permissions or loading data:', error);
            
            // Default to view-only access on error
            toast({
              title: 'Signed in with View-Only Access',
              description: `Successfully signed in as ${user.login}. Assuming view-only access due to error: ${error instanceof Error ? error.message : 'Unknown error'}`,
              status: 'warning',
              duration: 5000,
              isClosable: true,
            });
            
            // Set repository info and permissions (view-only)
            window.dispatchEvent(new CustomEvent('github:permissions-checked', {
              detail: {
                hasWriteAccess: false,
                repoInfo: {
                  fullName: repo,
                  branch,
                  filePath: path,
                  fileType: path.includes('theme') ? 'theme-override' : 'schema'
                }
              }
            }));
            
            // Redirect to main app
            navigate('/');
          }
          
        } else {
          // No URL parameters - show repository selector (current behavior)
          console.log('[GitHubCallback] No URL parameters, showing repository selector');
          
          toast({
            title: 'Signed in',
            description: `Successfully signed in as ${user.login}`,
            status: 'success',
            duration: 5000,
            isClosable: true,
          });

          // Redirect to main app - user can use "Find New Design System" from there
          navigate('/');
        }

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

  const handleRetryAuth = async () => {
    // Clear any existing auth data and stale state parameters
    GitHubAuthService.logout();
    GitHubAuthService.clearOAuthState();
    await GitHubAuthService.initiateAuth();
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
                onClick={() => navigate('/')}
              >
                Go to App
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