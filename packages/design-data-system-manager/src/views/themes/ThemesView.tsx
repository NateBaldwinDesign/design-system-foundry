import React from 'react';
import { Container, VStack } from '@chakra-ui/react';
import { useTheme } from 'next-themes';
import { ThemesTab } from './ThemesTab';

interface ThemesViewProps {
  themes: any[];
  setThemes: (themes: any[]) => void;
}

const ThemesView: React.FC<ThemesViewProps> = ({
  themes,
  setThemes
}) => {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  return (
    <VStack 
      p={4} 
      bg={isDark ? 'gray.900' : 'gray.50'}
      flex="1"
      align="stretch"
      gap={0}
    >
      <Container maxW="1000px" p={0}>
        <ThemesTab themes={themes} setThemes={setThemes} />
      </Container>
    </VStack>
  );
};

export default ThemesView; 