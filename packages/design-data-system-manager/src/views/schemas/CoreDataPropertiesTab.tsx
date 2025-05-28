import React from 'react';
import {
  Box,
  VStack,
  Heading,
  Text,
  useColorMode,
  UnorderedList,
  ListItem,
  Code,
} from '@chakra-ui/react';
import { JsonSyntaxHighlighter } from '../../components/JsonSyntaxHighlighter';

export const CoreDataPropertiesTab: React.FC = () => {
  const { colorMode } = useColorMode();

  return (
    <VStack spacing={6} align="stretch">
      <Box>
        <Heading size="md" mb={4}>Version</Heading>
        <Text mb={2}>
          <b>Semantic version of the token set.</b> This follows the standard <a href="https://semver.org/" target="_blank" rel="noopener noreferrer">semantic versioning</a> format (e.g., 1.0.0). It is required for tracking changes, supporting migrations, and ensuring compatibility across different versions of your design token data. Each time the schema or data changes, the version should be incremented. This helps both humans and tools understand what has changed and when.
        </Text>
        <JsonSyntaxHighlighter code={JSON.stringify({ version: "1.0.0" }, null, 2)} />
      </Box>

      <Box>
        <Heading size="md" mb={4}>Token Collections</Heading>
        <Text mb={2}>
          <b>Collections of tokens grouped by type.</b> Token collections allow you to organize tokens into logical groups, such as colors, spacing, or typography. Each collection specifies which value types it supports (e.g., only color tokens). Collections can also be marked as <b>private</b> for internal use. This structure makes it easier to manage large sets of tokens and apply consistent rules or strategies to each group.<br /><br />
          <b>Why collections?</b>
          <UnorderedList mt={1} mb={1}>
            <ListItem>Improves organization and scalability for large design systems.</ListItem>
            <ListItem>Allows for different resolution strategies and value types per group.</ListItem>
            <ListItem>Supports future extensibility (e.g., new token types or grouping strategies).</ListItem>
          </UnorderedList>
          <b>Technical note:</b> The <Code colorScheme="purple">resolvedValueTypeIds</Code> field references the types of values this collection can contain, following the <b>ID field naming convention</b> for clarity and validation.
        </Text>
        <JsonSyntaxHighlighter code={JSON.stringify({
          tokenCollections: [
            {
              id: "collection-color",
              name: "Color",
              resolvedValueTypeIds: ["COLOR"],
              private: false
            }
          ]
        }, null, 2)} />
      </Box>

      <Box>
        <Heading size="md" mb={4}>Dimensions</Heading>
        <Text mb={2}>
          <b>Dimensions that can modify token values.</b> A dimension represents a context or axis along which token values can vary, such as color scheme (light/dark), device type, or brand. Each dimension contains one or more <b>modes</b> (e.g., Light, Dark for color scheme).<br /><br />
          <b>Why dimensions?</b>
          <UnorderedList mt={1} mb={1}>
            <ListItem>Enables powerful theming and adaptation for different contexts.</ListItem>
            <ListItem>Ensures tokens can be resolved for any combination of modes (e.g., dark mode on mobile).</ListItem>
            <ListItem>Supports future extensibility (e.g., adding new dimensions like density or motion).</ListItem>
          </UnorderedList>
          <b>Technical note:</b> Dimensions and modes are always arrays to support multiple options and combinations. The <Code colorScheme="purple">id</Code> and <Code colorScheme="purple">modeIds</Code> fields follow the <b>ID field naming convention</b> for referential integrity.
        </Text>
        <JsonSyntaxHighlighter code={JSON.stringify({
          dimensions: [
            {
              id: "dimension-color-scheme",
              displayName: "Color Scheme",
              modes: [
                {
                  id: "mode-light",
                  name: "Light"
                }
              ]
            }
          ]
        }, null, 2)} />
      </Box>

      <Box>
        <Heading size="md" mb={4}>Tokens</Heading>
        <Text mb={2}>
          <b>Design tokens with values that can vary by mode.</b> Each token represents a reusable design value (like a color, spacing, or font). Tokens can have a single global value or multiple values for different mode combinations, managed by the <Code colorScheme="purple">valuesByMode</Code> array.<br /><br />
          <b>Why this structure?</b>
          <UnorderedList mt={1} mb={1}>
            <ListItem>Supports both simple (global) and complex (mode-specific) token values.</ListItem>
            <ListItem>Ensures clarity: a token can have either a single global value or multiple mode-specific values, but not both (see <b>README.md</b> for validation rules).</ListItem>
            <ListItem>Allows for future extensibility, such as platform-specific overrides or metadata.</ListItem>
          </UnorderedList>
          <b>Technical note:</b> The <Code colorScheme="purple">valuesByMode</Code> field enforces a rule: if any entry has <Code colorScheme="purple">modeIds: []</Code>, it must be the only entry (global value). Otherwise, all entries must have non-empty <Code colorScheme="purple">modeIds</Code> (mode-specific values). This is validated by the schema and utility functions.
        </Text>
        <JsonSyntaxHighlighter code={JSON.stringify({
          tokens: [
            {
              id: "token-blue-500",
              displayName: "Blue 500",
              tokenCollectionId: "collection-color",
              resolvedValueType: "COLOR",
              valuesByMode: [
                {
                  modeIds: [],
                  value: {
                    type: "COLOR",
                    value: "#6afda3"
                  }
                }
              ]
            }
          ]
        }, null, 2)} />
      </Box>

      <Box>
        <Heading size="md" mb={4}>Platforms</Heading>
        <Text mb={2}>
          <b>Platforms that can be used to resolve token values.</b> Platforms define the environments (e.g., Web, iOS, Android) where tokens are used. Each platform can specify naming conventions and value formatting rules for code export.<br /><br />
          <b>Why explicit platforms?</b>
          <UnorderedList mt={1} mb={1}>
            <ListItem>Ensures tokens can be exported and used consistently across different technologies.</ListItem>
            <ListItem>Supports custom platforms and future extensibility.</ListItem>
            <ListItem>Links code syntax and formatting directly to platform IDs for referential integrity (see <b>technical-decisions.md</b>).</ListItem>
          </UnorderedList>
          <b>Technical note:</b> The <Code colorScheme="purple">syntaxPatterns</Code> field allows each platform to define its own naming and formatting rules, supporting a wide range of export scenarios.
        </Text>
        <JsonSyntaxHighlighter code={JSON.stringify({
          platforms: [
            {
              id: "platform-web",
              displayName: "Web",
              syntaxPatterns: {
                prefix: "--",
                delimiter: "-",
                capitalization: "lowercase"
              }
            }
          ]
        }, null, 2)} />
      </Box>
    </VStack>
  );
}; 