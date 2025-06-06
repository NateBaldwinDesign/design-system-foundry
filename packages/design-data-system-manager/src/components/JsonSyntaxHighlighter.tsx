import React from 'react';
import { useTheme } from 'next-themes';
import { Light as SyntaxHighlighter } from 'react-syntax-highlighter';
import json from 'react-syntax-highlighter/dist/esm/languages/hljs/json';
import { atomOneDark, atomOneLight } from 'react-syntax-highlighter/dist/esm/styles/hljs';
import { Box } from '@chakra-ui/react';

// Register JSON language
SyntaxHighlighter.registerLanguage('json', json);

interface JsonSyntaxHighlighterProps {
  code: string;
}

export const JsonSyntaxHighlighter: React.FC<JsonSyntaxHighlighterProps> = ({ code }) => {
  const { resolvedTheme } = useTheme();
  const style = resolvedTheme === 'dark' ? atomOneDark : atomOneLight;

  return (
    <Box overflow="auto" h="100%">
      <SyntaxHighlighter
        language="json"
        style={style}
        customStyle={{
          margin: 0,
          padding: '1rem',
          height: '100%',
          background: 'transparent'
        }}
      >
        {code}
      </SyntaxHighlighter>
    </Box>
  );
}; 