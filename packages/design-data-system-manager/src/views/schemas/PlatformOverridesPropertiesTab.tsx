import React from 'react';
import {
  Box,
  VStack,
  Heading,
  Text,
  Code,
} from '@chakra-ui/react';
import { JsonSyntaxHighlighter } from '../../components/JsonSyntaxHighlighter';

export const PlatformOverridesPropertiesTab: React.FC = () => {
  return (
    <VStack spacing={6} align="stretch">
      <Box>
        <Heading size="md" mb={4}>System & Platform Identification</Heading>
        <Text mb={2}>
          <b>systemId</b> (required): ID of the core system this extension belongs to.<br />
          <b>platformId</b> (required): ID of the platform this extension is for.<br />
          <b>version</b> (required): Version of this platform extension.<br />
          <b>status</b> (optional): Lifecycle status - &quot;active&quot; or &quot;deprecated&quot;.<br /><br />
          These fields ensure proper identification and versioning of platform extensions, linking them to the correct core system and platform.
        </Text>
        <JsonSyntaxHighlighter code={JSON.stringify({
          systemId: "acme-design-system",
          platformId: "platform-ios",
          version: "1.0.0",
          status: "active"
        }, null, 2)} />
      </Box>

      <Box>
        <Heading size="md" mb={4}>Figma Configuration</Heading>
        <Text mb={2}>
          <b>figmaFileKey</b> (required): Unique Figma file key for this platform extension.<br />
          This key must be unique across all platform extensions and cannot be overridden.<br />
          <b>Technical note:</b> Each platform extension must have its own unique Figma file for platform-specific publishing.
        </Text>
        <JsonSyntaxHighlighter code={JSON.stringify({
          figmaFileKey: "ios-platform-figma-file-key"
        }, null, 2)} />
      </Box>

      <Box>
        <Heading size="md" mb={4}>Syntax Patterns</Heading>
        <Text mb={2}>
          <b>syntaxPatterns</b> (optional): Platform-specific syntax patterns for code generation.<br />
          These patterns are used for generating platform-specific code syntax, not for Figma.<br />
          <b>Technical note:</b> Figma uses the core <Code colorScheme="purple">figmaConfiguration.syntaxPatterns</Code> for consistency.
        </Text>
        <JsonSyntaxHighlighter code={JSON.stringify({
          syntaxPatterns: {
            prefix: "",
            suffix: "",
            delimiter: "_",
            capitalization: "camel",
            formatString: ""
          }
        }, null, 2)} />
      </Box>

      <Box>
        <Heading size="md" mb={4}>Value Formatters</Heading>
        <Text mb={2}>
          <b>valueFormatters</b> (optional): Platform-specific value formatting rules.<br />
          Defines how values should be formatted for this platform (colors, dimensions, precision).<br />
          <b>Technical note:</b> These formatters are applied when generating platform-specific code.
        </Text>
        <JsonSyntaxHighlighter code={JSON.stringify({
          valueFormatters: {
            color: "hex",
            dimension: "dp",
            numberPrecision: 2
          }
        }, null, 2)} />
      </Box>

      <Box>
        <Heading size="md" mb={4}>Token Overrides</Heading>
        <Text mb={2}>
          <b>tokenOverrides</b> (optional): Platform-specific token overrides and additions.<br />
          Each override can modify existing tokens or add new platform-specific tokens.<br />
          <b>omit</b>: If true, the token is omitted from this platform (hidden, not deleted).<br />
          <b>Technical note:</b> Token overrides maintain the same structure as core tokens but allow platform-specific customization.
        </Text>
        <JsonSyntaxHighlighter code={JSON.stringify({
          tokenOverrides: [
            {
              id: "token-blue-500",
              displayName: "iOS Blue 500",
              description: "iOS-specific blue color with different value",
              themeable: true,
              private: false,
              status: "stable",
              tokenTier: "PRIMITIVE",
              resolvedValueTypeId: "color",
              generatedByAlgorithm: false,
              valuesByMode: [
                {
                  modeIds: ["mode-light"],
                  value: {
                    value: "#007AFF"
                  }
                },
                {
                  modeIds: ["mode-dark"],
                  value: {
                    value: "#0A84FF"
                  }
                }
              ],
              omit: false
            }
          ]
        }, null, 2)} />
      </Box>

      <Box>
        <Heading size="md" mb={4}>Algorithm Variable Overrides</Heading>
        <Text mb={2}>
          <b>algorithmVariableOverrides</b> (optional): Platform-specific algorithm variable overrides.<br />
          Allows platforms to customize algorithm variables (not formulas) for platform-specific needs.<br />
          <b>Technical note:</b> Only variable values can be overridden, not the algorithm formulas themselves.
        </Text>
        <JsonSyntaxHighlighter code={JSON.stringify({
          algorithmVariableOverrides: [
            {
              algorithmId: "algorithm-spacing-scale",
              variableId: "base-spacing",
              valuesByMode: [
                {
                  modeIds: ["mode-light"],
                  value: 8
                },
                {
                  modeIds: ["mode-dark"],
                  value: 10
                }
              ]
            }
          ]
        }, null, 2)} />
      </Box>

      <Box>
        <Heading size="md" mb={4}>Omissions</Heading>
        <Text mb={2}>
          <b>omittedModes</b> (optional): List of mode IDs omitted from this platform (hidden, not deleted).<br />
          <b>omittedDimensions</b> (optional): List of dimension IDs omitted from this platform (hidden, not deleted).<br />
          <b>Technical note:</b> Omissions allow platforms to hide certain modes or dimensions without affecting the core data structure.
        </Text>
        <JsonSyntaxHighlighter code={JSON.stringify({
          omittedModes: ["mode-high-contrast"],
          omittedDimensions: ["dimension-accessibility"]
        }, null, 2)} />
      </Box>
    </VStack>
  );
}; 