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

export const ThemeOverridesPropertiesTab: React.FC = () => {
  const { colorMode } = useColorMode();

  return (
    <VStack spacing={6} align="stretch">
      <Box>
        <Heading size="md" mb={4}>System ID</Heading>
        <Text mb={2}>
          <b>ID of the core token system this theme override is for.</b> This field ensures that the theme override file is linked to the correct core data set. It must match the <Code colorScheme="purple">systemId</Code> in the main core data file. This guarantees referential integrity and prevents accidental overrides of the wrong system.<br /><br />
          <b>Why is this required?</b>
          <UnorderedList mt={1} mb={1}>
            <ListItem>Ensures that overrides are only applied to the intended design system.</ListItem>
            <ListItem>Prevents data corruption and accidental cross-system overrides.</ListItem>
            <ListItem>Supports validation and safe merging of theme data.</ListItem>
          </UnorderedList>
        </Text>
        <JsonSyntaxHighlighter code={JSON.stringify({ systemId: "core-design-system" }, null, 2)} />
      </Box>

      <Box>
        <Heading size="md" mb={4}>Theme ID</Heading>
        <Text mb={2}>
          <b>ID of the theme these overrides belong to.</b> This field references the specific theme being customized. It must match a theme defined in the core data file's <Code colorScheme="purple">themes</Code> array. This linkage ensures that each override file is associated with a valid, existing theme.<br /><br />
          <b>Why is this required?</b>
          <UnorderedList mt={1} mb={1}>
            <ListItem>Guarantees that overrides are only applied to valid, pre-defined themes.</ListItem>
            <ListItem>Prevents orphaned or misapplied overrides.</ListItem>
            <ListItem>Supports validation and safe theme management.</ListItem>
          </UnorderedList>
        </Text>
        <JsonSyntaxHighlighter code={JSON.stringify({ themeId: "theme-brand-a" }, null, 2)} />
      </Box>

      <Box>
        <Heading size="md" mb={4}>Token Overrides</Heading>
        <Text mb={2}>
          <b>Overrides for tokens in this theme.</b> This array lists all the tokens whose values are being customized for the theme. Each entry must reference a valid, themeable token from the core data set. Only tokens marked as <Code colorScheme="purple">themeable: true</Code> in the core data can be overridden.<br /><br />
          <b>Why this structure?</b>
          <UnorderedList mt={1} mb={1}>
            <ListItem>Ensures that only explicitly themeable tokens can be overridden, preserving the integrity of core tokens.</ListItem>
            <ListItem>Allows theme designers to safely extend or customize the design system without modifying the core data.</ListItem>
            <ListItem>Supports validation: each override is checked for type and value constraints, and must reference a valid token ID.</ListItem>
          </UnorderedList>
          <b>Technical note:</b> The <Code colorScheme="purple">value</Code> object must match the type and constraints of the original token. This ensures that overrides are always valid and compatible with the core schema.
        </Text>
        <JsonSyntaxHighlighter code={JSON.stringify({
          tokenOverrides: [
            {
              tokenId: "token-accent-color",
              value: {
                value: "#FF6F61"
              }
            }
          ]
        }, null, 2)} />
      </Box>

      <Box>
        <Heading size="md" mb={4}>Platform Overrides</Heading>
        <Text mb={2}>
          <b>Platform-specific overrides for tokens.</b> This optional array allows you to specify different override values for different platforms (e.g., Web, iOS, Android). Each entry references a platform by its <Code colorScheme="purple">platformId</Code> and provides a value specific to that platform.<br /><br />
          <b>Why platform overrides?</b>
          <UnorderedList mt={1} mb={1}>
            <ListItem>Enables fine-grained control over how tokens are rendered or exported for each platform.</ListItem>
            <ListItem>Supports platform-specific design requirements and constraints.</ListItem>
            <ListItem>Ensures that overrides remain valid and consistent across all platforms.</ListItem>
          </UnorderedList>
          <b>Technical note:</b> Each <Code colorScheme="purple">platformId</Code> must reference a valid platform defined in the core data. The <Code colorScheme="purple">value</Code> object must match the type and constraints of the original token and platform.</Text>
        <JsonSyntaxHighlighter code={JSON.stringify({
          platformOverrides: [
            {
              platformId: "platform-web",
              value: {
                value: "#FF6F61"
              }
            }
          ]
        }, null, 2)} />
      </Box>
    </VStack>
  );
}; 