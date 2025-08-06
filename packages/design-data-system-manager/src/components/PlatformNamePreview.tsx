import React, { useMemo, useState, useEffect } from 'react';
import {
  Box,
  Text,
  VStack,
  HStack,
  Badge,
  useColorMode,
  Alert,
  AlertIcon
} from '@chakra-ui/react';
import { CodeSyntaxGenerator } from '@token-model/data-transformations';
import { PlatformSyntaxPatternService } from '../services/platformSyntaxPatternService';
import { DataSourceManager } from '../services/dataSourceManager';
import { StorageService } from '../services/storage';
import type { Token, Platform, Taxonomy } from '@token-model/data-model';

export interface PlatformNamePreviewProps {
  token: Token;
  platforms: Platform[];
  taxonomies: Taxonomy[];
  dataSourceContext?: any; // DataSourceContext type
}

// Helper function to generate platform names using taxonomy data and syntax patterns
function generatePlatformName(
  token: Token,
  platformId: string,
  syntaxPatterns: Record<string, any>,
  taxonomies: Taxonomy[],
  taxonomyOrder: string[]
): string {
  console.log('[generatePlatformName] Generating name for:', {
    tokenId: token.id,
    tokenDisplayName: token.displayName,
    platformId,
    hasTaxonomies: !!token.taxonomies,
    taxonomyCount: token.taxonomies?.length || 0,
    taxonomyOrder,
    syntaxPatterns: syntaxPatterns[platformId]
  });

  // If no taxonomies, return empty string
  if (!token.taxonomies || token.taxonomies.length === 0) {
    console.log('[generatePlatformName] No taxonomies found for token');
    return '';
  }

  // Get the syntax patterns for this platform
  const patterns = syntaxPatterns[platformId];
  if (!patterns) {
    console.log('[generatePlatformName] No syntax patterns found for platform:', platformId);
    return '';
  }

  // Create a map of taxonomy assignments for quick lookup
  const taxonomyMap = new Map<string, string>();
  token.taxonomies.forEach(taxonomyRef => {
    taxonomyMap.set(taxonomyRef.taxonomyId, taxonomyRef.termId);
  });

  console.log('[generatePlatformName] Taxonomy map:', Object.fromEntries(taxonomyMap));

  // Get ordered terms based on taxonomyOrder
  const orderedTerms: string[] = [];
  taxonomyOrder.forEach(taxonomyId => {
    const termId = taxonomyMap.get(taxonomyId);
    if (termId) {
      // Find the taxonomy and term
      const taxonomy = taxonomies.find(t => t.id === taxonomyId);
      const term = taxonomy?.terms.find(term => term.id === termId);
      if (term) {
        orderedTerms.push(term.name);
        console.log('[generatePlatformName] Added term:', { taxonomyId, termId, termName: term.name });
      } else {
        console.warn('[generatePlatformName] Term not found:', { taxonomyId, termId });
      }
    }
  });

  console.log('[generatePlatformName] Ordered terms:', orderedTerms);

  // If no terms found, return empty string
  if (orderedTerms.length === 0) {
    console.log('[generatePlatformName] No ordered terms found');
    return '';
  }

  // Join terms with delimiter
  const delimiter = patterns.delimiter || '_';
  let joinedTerms = orderedTerms.join(delimiter);

  // Apply capitalization
  switch (patterns.capitalization) {
    case 'camel':
      joinedTerms = joinedTerms.replace(/(?:^|[-_\s]+)([a-z])/g, (_, letter) => letter.toUpperCase());
      break;
    case 'uppercase':
      joinedTerms = joinedTerms.toUpperCase();
      break;
    case 'lowercase':
      joinedTerms = joinedTerms.toLowerCase();
      break;
    case 'capitalize':
      joinedTerms = joinedTerms.replace(/\b\w/g, letter => letter.toUpperCase());
      break;
    default:
      // No capitalization change
      break;
  }

  // Apply prefix and suffix
  const prefix = patterns.prefix || '';
  const suffix = patterns.suffix || '';
  const finalName = prefix + joinedTerms + suffix;

  console.log('[generatePlatformName] Final name:', {
    joinedTerms,
    prefix,
    suffix,
    finalName
  });

  return finalName;
}

export function PlatformNamePreview({ 
  token, 
  platforms, 
  taxonomies, 
  dataSourceContext 
}: PlatformNamePreviewProps) {
  const { colorMode } = useColorMode();
  const platformSyntaxPatternService = PlatformSyntaxPatternService.getInstance();
  const dataSourceManager = DataSourceManager.getInstance();

  // Get syntax patterns based on current context
  const [syntaxPatterns, setSyntaxPatterns] = useState<Record<string, any>>({});
  const [isLoadingPatterns, setIsLoadingPatterns] = useState(true);

  useEffect(() => {
    console.log('[PlatformNamePreview] useEffect triggered - getting syntax patterns');
    const loadPatterns = async () => {
      try {
        setIsLoadingPatterns(true);
        const patterns = await platformSyntaxPatternService.getSyntaxPatternsForCurrentContext();
        console.log('[PlatformNamePreview] Retrieved syntax patterns:', {
          patterns,
          patternsKeys: Object.keys(patterns),
          patternsCount: Object.keys(patterns).length
        });
        setSyntaxPatterns(patterns);
      } catch (error) {
        console.error('[PlatformNamePreview] Error loading syntax patterns:', error);
        setSyntaxPatterns({});
      } finally {
        setIsLoadingPatterns(false);
      }
    };
    
    loadPatterns();
  }, [platformSyntaxPatternService]);

  // Generate platform names using our custom function
  const platformNames = useMemo(() => {
    if (!token || !platforms.length || !taxonomies.length || Object.keys(syntaxPatterns).length === 0) {
      console.log('[PlatformNamePreview] Missing required data for name generation:', {
        hasToken: !!token,
        platformsCount: platforms.length,
        taxonomiesCount: taxonomies.length,
        syntaxPatternsCount: Object.keys(syntaxPatterns).length
      });
      return {};
    }

    try {
      // Get taxonomyOrder from core data
      const coreData = StorageService.getCoreData();
      const taxonomyOrder = coreData?.taxonomyOrder || [];
      
      console.log('[PlatformNamePreview] Core data for name generation:', {
        taxonomyOrder,
        hasTaxonomyOrder: !!coreData?.taxonomyOrder,
        coreDataKeys: coreData ? Object.keys(coreData) : 'no core data'
      });

      const generatedNames: Record<string, string> = {};
      
      // Generate names for each platform that has syntax patterns
      Object.keys(syntaxPatterns).forEach(platformId => {
        try {
          const platformName = generatePlatformName(token, platformId, syntaxPatterns, taxonomies, taxonomyOrder);
          if (platformName) {
            generatedNames[platformId] = platformName;
            console.log(`[PlatformNamePreview] Generated name for ${platformId}:`, platformName);
          } else {
            console.log(`[PlatformNamePreview] No name generated for ${platformId}`);
          }
        } catch (error) {
          console.warn(`[PlatformNamePreview] Error generating name for platform ${platformId}:`, error);
        }
      });

      console.log('[PlatformNamePreview] Final generated names:', generatedNames);
      return generatedNames;
    } catch (error) {
      console.error('[PlatformNamePreview] Error generating platform names:', error);
      return {};
    }
  }, [token, platforms, taxonomies, syntaxPatterns]);

  // Get current source context
  const currentContext = dataSourceManager.getCurrentContext();
  const isCoreMode = !currentContext.currentPlatform || currentContext.currentPlatform === 'none';

  if (isLoadingPatterns) {
    return (
      <Box flex={1} minW={0}>
        <Text fontSize="sm" fontWeight="medium" mb={1}>Platform Names</Text>
        <Alert status="info" borderRadius="md">
          <AlertIcon />
          <Text fontSize="sm">
            Loading platform syntax patterns...
          </Text>
        </Alert>
      </Box>
    );
  }

  if (Object.keys(syntaxPatterns).length === 0) {
    return (
      <Box flex={1} minW={0}>
        <Text fontSize="sm" fontWeight="medium" mb={1}>Platform Names</Text>
        <Alert status="info" borderRadius="md">
          <AlertIcon />
          <Text fontSize="sm">
            No platform syntax patterns found. Platform names will be generated when syntax patterns are configured.
          </Text>
        </Alert>
      </Box>
    );
  }

  return (
    <Box flex={1} minW={0}>
      <Text fontSize="sm" fontWeight="medium" mb={1}>
        Platform Names {isCoreMode ? '(All Platforms)' : '(Current Platform)'}
      </Text>
      <VStack spacing={2} align="stretch">
        {Object.entries(platformNames).map(([platformId, generatedName]) => {
          const platform = platforms.find(p => p.id === platformId);
          const platformDisplayName = platform?.displayName || platformId;
          
          return (
            <HStack key={platformId} spacing={2} justify="space-between">
              <Badge 
                colorScheme="blue" 
                variant="subtle"
                fontSize="xs"
              >
                {platformDisplayName}
              </Badge>
              <Text 
                fontSize="sm" 
                fontFamily="mono"
                color={colorMode === 'dark' ? 'gray.300' : 'gray.700'}
                bg={colorMode === 'dark' ? 'gray.800' : 'gray.100'}
                px={2}
                py={1}
                borderRadius="md"
                flex={1}
                textAlign="right"
              >
                {generatedName}
              </Text>
            </HStack>
          );
        })}
        
        {Object.keys(platformNames).length === 0 && (
          <Alert status="warning" borderRadius="md">
            <AlertIcon />
            <VStack align="start" spacing={1}>
              <Text fontSize="sm" fontWeight="medium">
                No platform names could be generated.
              </Text>
              <Text fontSize="xs">
                Check that the token has valid taxonomy assignments and that taxonomy order is configured in the core data.
              </Text>
              <Text fontSize="xs" color="gray.500">
                Debug info: Token has {token.taxonomies?.length || 0} taxonomies, {Object.keys(syntaxPatterns).length} platforms with patterns
              </Text>
            </VStack>
          </Alert>
        )}
      </VStack>
      
      {isCoreMode && (
        <Text fontSize="xs" color="gray.500" mt={2}>
          Showing all available platforms. Switch to a specific platform to see only that platform's naming.
        </Text>
      )}
    </Box>
  );
} 