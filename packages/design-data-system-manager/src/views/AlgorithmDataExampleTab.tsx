import React, { useEffect, useState } from 'react';
import {
  Box,
  Spinner,
  Text,
} from '@chakra-ui/react';
import { JsonSyntaxHighlighter } from '../components/JsonSyntaxHighlighter';
import { algorithmData } from '@token-model/data-model';

export const AlgorithmDataExampleTab: React.FC = () => {
  const [exampleData, setExampleData] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadExampleData = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await algorithmData.minimal();
        if (data) {
          setExampleData(JSON.stringify(data.default, null, 2));
        } else {
          throw new Error('No algorithm example data available');
        }
      } catch (err) {
        setError('Failed to load example data');
        console.error('Error loading algorithm example data:', err);
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