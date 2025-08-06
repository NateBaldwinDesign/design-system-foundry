import React, { useState, useEffect } from 'react';
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
import { FigmaPreprocessor } from '../services/figmaPreprocessor';
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
  const [generatedNames, setGeneratedNames] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const generateNames = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Use existing data management services to get current merged data
        const mergedData = StorageService.getMergedData();
        if (!mergedData) {
          setError('No merged data available');
          return;
        }

        // Create a token system with just the current token for preview
        const tokenSystem = {
          ...mergedData,
          tokens: [token] // Only the current token for preview
        };

        // Use the preprocessor to generate code syntax
        const preprocessor = new FigmaPreprocessor();
        const result = await preprocessor.preprocessForFigma({
          includePlatformCodeSyntax: true
        });

        const enhancedToken = result.enhancedTokenSystem.tokens?.[0] as Token & { codeSyntax?: Record<string, string> };
        if (enhancedToken?.codeSyntax) {
          setGeneratedNames(enhancedToken.codeSyntax);
        }
      } catch (err) {
        console.error('[PlatformNamePreview] Error generating platform names:', err);
        setError(err instanceof Error ? err.message : 'Failed to generate platform names');
      } finally {
        setIsLoading(false);
      }
    };

    generateNames();
  }, [token, platforms]);

  if (isLoading) {
    return (
      <Box flex={1} minW={0}>
        <Text fontSize="sm" fontWeight="medium" mb={1}>Platform Names</Text>
        <Alert status="info" borderRadius="md">
          <AlertIcon />
          <Text fontSize="sm">
            Generating platform names...
          </Text>
        </Alert>
      </Box>
    );
  }

  if (error) {
    return (
      <Box flex={1} minW={0}>
        <Text fontSize="sm" fontWeight="medium" mb={1}>Platform Names</Text>
        <Alert status="error" borderRadius="md">
          <AlertIcon />
          <Text fontSize="sm">
            {error}
          </Text>
        </Alert>
      </Box>
    );
  }

  return (
    <Box flex={1} minW={0}>
      <Text fontSize="sm" fontWeight="medium" mb={1}>
        Platform Names
      </Text>
      <VStack spacing={2} align="stretch">
        {Object.entries(generatedNames).map(([platformId, generatedName]) => {
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
        
        {Object.keys(generatedNames).length === 0 && (
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
                Debug info: Token has {token.taxonomies?.length || 0} taxonomies
              </Text>
            </VStack>
          </Alert>
        )}
      </VStack>
    </Box>
  );
} 