import React from 'react';
import { useColorMode, useToken } from '@chakra-ui/react';
import { Light as SyntaxHighlighter } from 'react-syntax-highlighter';
import json from 'react-syntax-highlighter/dist/esm/languages/hljs/json';
import { Box } from '@chakra-ui/react';
import type { CSSProperties } from 'react';

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
  // Resolve Chakra color tokens to real CSS values
  const [gray100, gray800, green300, green600, orange300, orange600, purple300, purple600, blue300, blue600, yellow300, yellow600, gray400, gray600, gray500, gray900, white, gray700, gray200] = useToken(
    'colors',
    [
      'gray.100', 'gray.800',
      'green.300', 'green.600',
      'orange.300', 'orange.600',
      'purple.300', 'purple.600',
      'blue.300', 'blue.600',
      'yellow.300', 'yellow.600',
      'gray.400', 'gray.600', 'gray.500',
      'gray.900', 'white', 'gray.700', 'gray.200'
    ]
  );

  // Custom theme using Chakra UI colors (resolved to CSS values)
  const customTheme: Record<string, CSSProperties> = {
    'hljs': {
      display: 'block',
      overflowX: 'auto',
      padding: '0.5em',
      color: colorMode === 'dark' ? gray100 : gray800,
      background: 'transparent',
    },
    'hljs-string': {
      color: colorMode === 'dark' ? green300 : green600,
    },
    'hljs-number': {
      color: colorMode === 'dark' ? purple300 : purple600,
    },
    'hljs-literal': {
      color: colorMode === 'dark' ? yellow300 : yellow600,
    },
    'hljs-keyword': {
      color: colorMode === 'dark' ? blue300 : blue600,
    },
    'hljs-attr': {
      color: colorMode === 'dark' ? purple300 : purple600,
    },
    'hljs-punctuation': {
      color: colorMode === 'dark' ? gray400 : gray600,
    },
    'hljs-comment': {
      color: gray500,
    },
  };

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
        style={customTheme}
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