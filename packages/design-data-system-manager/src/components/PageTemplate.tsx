import React from 'react';
import {
  Box,
  Container,
  VStack,
  HStack,
  Heading,
  Text,
} from '@chakra-ui/react';

interface PageTemplateProps {
  title: string;
  description?: string;
  headerComponent?: React.ReactNode;
  children: React.ReactNode;
  maxWidth?: string;
  padding?: number | string;
}

export const PageTemplate: React.FC<PageTemplateProps> = ({
  title,
  description,
  headerComponent,
  children,
  maxWidth = "container.xl",
  padding = 12,
}) => {
  return (
    <Container maxW={maxWidth} p={padding}>
      <VStack spacing={8} align="stretch">
        {/* Header */}
        <Box>
          <HStack spacing={4} align="center" mb={2} justify="space-between" width="100%">
            <Heading size="lg">{title}</Heading>
            {headerComponent}
          </HStack>
          {description && (
            <Text fontSize="sm" color="gray.600" mt={2}>
              {description}
            </Text>
          )}
        </Box>

        {/* Content */}
        {children}
      </VStack>
    </Container>
  );
}; 