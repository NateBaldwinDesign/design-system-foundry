import React from 'react';
import { Container, VStack, useColorMode } from '@chakra-ui/react';
import { ThemesTab } from './ThemesTab';

interface ThemesViewProps {
  themes: any[];
  setThemes: (themes: any[]) => void;
}

const ThemesView: React.FC<ThemesViewProps> = ({
  themes,
  setThemes
}) => {
  const { colorMode } = useColorMode();
  return (
    <VStack 
      p={4} 
      bg={colorMode === 'dark' ? 'gray.900' : 'gray.50'}
      flex="1"
      align="stretch"
      spacing={0}
    >
      <Container maxW="1000px" p={0}>
        <ThemesTab themes={themes} setThemes={setThemes} />
      </Container>
    </VStack>
  );
};

export default ThemesView; 