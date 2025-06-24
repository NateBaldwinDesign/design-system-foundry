import React from 'react';
import {
  Box,
  VStack,
  Heading,
  Text,
  UnorderedList,
  ListItem,
  Code,
} from '@chakra-ui/react';
import { JsonSyntaxHighlighter } from '../../components/JsonSyntaxHighlighter';

export const ThemeOverridesPropertiesTab: React.FC = () => {
  return (
    <VStack spacing={6} align="stretch">
      <Box>
        <Heading size="md" mb={4}>System ID</Heading>
        <Text mb={2}>
          <b>systemId</b> (required): ID of the core token system this theme override is for. This field ensures that the theme override file is linked to the correct core data set. It must match the <Code colorScheme="purple">systemId</Code> in the main core data file. This guarantees referential integrity and prevents accidental overrides of the wrong system.<br /><br />
          <b>Why is this required?</b>
          <UnorderedList mt={1} mb={1}>
            <ListItem>Ensures that overrides are only applied to the intended design system.</ListItem>
            <ListItem>Prevents data corruption and accidental cross-system overrides.</ListItem>
            <ListItem>Supports validation and safe merging of theme data.</ListItem>
          </UnorderedList>
        </Text>
        <JsonSyntaxHighlighter code={JSON.stringify({ systemId: "acme-design-system" }, null, 2)} />
      </Box>

      <Box>
        <Heading size="md" mb={4}>Theme ID</Heading>
        <Text mb={2}>
          <b>themeId</b> (required): ID of the theme these overrides belong to. This field references the specific theme being customized. It must match a theme defined in the core data file&apos;s <Code colorScheme="purple">themes</Code> array. This linkage ensures that each override file is associated with a valid, existing theme.<br /><br />
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
          <b>tokenOverrides</b> (required): Overrides for tokens in this theme. This array lists all the tokens whose values are being customized for the theme. Each entry must reference a valid, themeable token from the core data set. Only tokens marked as <Code colorScheme="purple">themeable: true</Code> in the core data can be overridden.<br /><br />
          <b>valuesByMode Structure:</b> Each token override uses the same <Code colorScheme="purple">valuesByMode</Code> structure as the core schema, with <Code colorScheme="purple">modeIds</Code> arrays and support for both direct values and aliases.<br /><br />
          <b>Why this structure?</b>
          <UnorderedList mt={1} mb={1}>
            <ListItem>Ensures that only explicitly themeable tokens can be overridden, preserving the integrity of core tokens.</ListItem>
            <ListItem>Allows theme designers to safely extend or customize the design system without modifying the core data.</ListItem>
            <ListItem>Supports mode-specific overrides, enabling different values for different theme modes (e.g., light/dark).</ListItem>
            <ListItem>Supports validation: each override is checked for type and value constraints, and must reference a valid token ID.</ListItem>
          </UnorderedList>
          <b>Technical note:</b> The <Code colorScheme="purple">value</Code> object must match the type and constraints of the original token. This ensures that overrides are always valid and compatible with the core schema.
        </Text>
        <JsonSyntaxHighlighter code={JSON.stringify({
          tokenOverrides: [
            {
              tokenId: "token-primary-color",
              valuesByMode: [
                {
                  modeIds: ["mode-light"],
                  value: {
                    value: "#FF6F61"
                  }
                },
                {
                  modeIds: ["mode-dark"],
                  value: {
                    value: "#FF8A80"
                  }
                },
                {
                  modeIds: [],
                  value: {
                    tokenId: "token-accent-color"
                  }
                }
              ]
            }
          ]
        }, null, 2)} />
      </Box>

      <Box>
        <Heading size="md" mb={4}>Platform Overrides</Heading>
        <Text mb={2}>
          <b>platformOverrides</b> (optional): Platform-specific overrides within each <Code colorScheme="purple">valuesByMode</Code> entry. This allows you to specify different override values for different platforms (e.g., Web, iOS, Android) within a specific mode combination.<br /><br />
          <b>Why platform overrides?</b>
          <UnorderedList mt={1} mb={1}>
            <ListItem>Enables fine-grained control over how tokens are rendered or exported for each platform.</ListItem>
            <ListItem>Supports platform-specific design requirements and constraints.</ListItem>
            <ListItem>Ensures that overrides remain valid and consistent across all platforms.</ListItem>
            <ListItem>Allows mode-specific platform overrides (e.g., different web colors for light vs dark modes).</ListItem>
          </UnorderedList>
          <b>Technical note:</b> Each <Code colorScheme="purple">platformId</Code> must reference a valid platform defined in the core data. The <Code colorScheme="purple">value</Code> must be a string that matches the platform&apos;s expected format.
        </Text>
        <JsonSyntaxHighlighter code={JSON.stringify({
          tokenOverrides: [
            {
              tokenId: "token-primary-color",
              valuesByMode: [
                {
                  modeIds: ["mode-light"],
                  value: {
                    value: "#FF6F61"
                  },
                  platformOverrides: [
                    {
                      platformId: "platform-web",
                      value: "#FF6F61",
                      metadata: {
                        description: "Web-specific primary color override"
                      }
                    },
                    {
                      platformId: "platform-ios",
                      value: "#FF6F61",
                      metadata: {
                        description: "iOS-specific primary color override"
                      }
                    }
                  ]
                }
              ]
            }
          ]
        }, null, 2)} />
      </Box>

      <Box>
        <Heading size="md" mb={4}>Metadata</Heading>
        <Text mb={2}>
          <b>metadata</b> (optional): Additional information about specific value overrides. This can include descriptions, change reasons, or other contextual information about why a particular override was made.<br /><br />
          <b>Why metadata?</b>
          <UnorderedList mt={1} mb={1}>
            <ListItem>Provides context for why specific overrides were made.</ListItem>
            <ListItem>Supports documentation and change tracking.</ListItem>
            <ListItem>Helps maintainers understand the reasoning behind theme customizations.</ListItem>
          </UnorderedList>
        </Text>
        <JsonSyntaxHighlighter code={JSON.stringify({
          tokenOverrides: [
            {
              tokenId: "token-primary-color",
              valuesByMode: [
                {
                  modeIds: ["mode-light"],
                  value: {
                    value: "#FF6F61"
                  },
                  metadata: {
                    description: "Brand A primary color for light mode",
                    changeReason: "Brand guidelines update",
                    approvedBy: "design-team"
                  }
                }
              ]
            }
          ]
        }, null, 2)} />
      </Box>

      <Box>
        <Heading size="md" mb={4}>Complete Example</Heading>
        <Text mb={2}>
          <b>Complete theme override structure:</b> This example shows a comprehensive theme override file with all available features including mode-specific values, platform overrides, and metadata.
        </Text>
        <JsonSyntaxHighlighter code={JSON.stringify({
          systemId: "acme-design-system",
          themeId: "theme-brand-a",
          tokenOverrides: [
            {
              tokenId: "token-primary-color",
              valuesByMode: [
                {
                  modeIds: ["mode-light"],
                  value: {
                    value: "#FF6F61"
                  },
                  platformOverrides: [
                    {
                      platformId: "platform-web",
                      value: "#FF6F61"
                    }
                  ],
                  metadata: {
                    description: "Brand A primary color for light mode"
                  }
                },
                {
                  modeIds: ["mode-dark"],
                  value: {
                    value: "#FF8A80"
                  },
                  metadata: {
                    description: "Brand A primary color for dark mode"
                  }
                }
              ]
            },
            {
              tokenId: "token-accent-color",
              valuesByMode: [
                {
                  modeIds: [],
                  value: {
                    tokenId: "token-primary-color"
                  }
                }
              ]
            }
          ]
        }, null, 2)} />
      </Box>
    </VStack>
  );
}; 