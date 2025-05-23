import React from 'react';
import { Box } from '@chakra-ui/react';
import { ThemesWorkflow } from '../../components/ThemesWorkflow';

interface ThemesViewProps {
  themes: any[];
  setThemes: (themes: any[]) => void;
}

const ThemesView: React.FC<ThemesViewProps> = ({
  themes,
  setThemes
}) => {
  return (
    <Box p={3} bg="chakra-body-bg" borderRadius="md" boxShadow="md">
      <ThemesWorkflow themes={themes} setThemes={setThemes} />
    </Box>
  );
};

export default ThemesView; 