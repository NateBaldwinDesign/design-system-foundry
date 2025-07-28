import React, { useEffect, useState } from 'react';
import {
  Box,
  Spinner,
  Text,
  useColorMode,
} from '@chakra-ui/react';
import { JsonSyntaxHighlighter } from '../components/JsonSyntaxHighlighter';
import { exampleData as dataModelExamples } from '@token-model/data-model';

export const CoreDataExampleTab: React.FC = () => {
  const [exampleData, setExampleData] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { colorMode } = useColorMode();

  useEffect(() => {
    const loadExampleData = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await dataModelExamples.core();
        setExampleData(JSON.stringify(data.default, null, 2));
      } catch (err) {
        setError('Failed to load example data');
      } finally {
        setLoading(false);
      }
    };
    loadExampleData();
  }, []);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100%">
        <Spinner />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={4}>
        <Text color="red.500">{error}</Text>
      </Box>
    );
  }

  return (
    <Box overflow="auto" height="100%">
      <JsonSyntaxHighlighter code={exampleData} />
    </Box>
  );
}; 