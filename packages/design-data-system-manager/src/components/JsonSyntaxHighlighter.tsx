import React from 'react';
import { useColorMode, useToken } from '@chakra-ui/react';
import { Light as SyntaxHighlighter } from 'react-syntax-highlighter';
import json from 'react-syntax-highlighter/dist/esm/languages/hljs/json';
import { atomOneDark, atomOneLight } from 'react-syntax-highlighter/dist/esm/styles/hljs';
import { Box } from '@chakra-ui/react';

// Register JSON language
SyntaxHighlighter.registerLanguage('json', json);

interface JsonSyntaxHighlighterProps {
  code: string;
  showLineNumbers?: boolean;
}

export const JsonSyntaxHighlighter: React.FC<JsonSyntaxHighlighterProps> = ({
  code,
  showLineNumbers = false,
}) => {
  const { colorMode } = useColorMode();
  const [gray900, white, gray700, gray200] = useToken(
    'colors',
    ['gray.900', 'white', 'gray.700', 'gray.200']
  );

  return (
    <Box
      p={4}
      mb={4}
      borderWidth={1}
      borderRadius="md"
      bg={colorMode === 'dark' ? gray900 : white}
      borderColor={colorMode === 'dark' ? gray700 : gray200}
    >
      <SyntaxHighlighter
        language="json"
        showLineNumbers={showLineNumbers}
        style={colorMode === 'dark' ? atomOneDark : atomOneLight}
        customStyle={{
          background: 'transparent',
          padding: 0,
          margin: 0,
          fontSize: '0.875rem',
          lineHeight: '1.5',
          fontFamily: 'monospace',
        }}
      >
        {code}
      </SyntaxHighlighter>
    </Box>
  );
}; 