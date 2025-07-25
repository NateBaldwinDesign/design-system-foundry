import React from 'react';
import { Box, VStack, Heading, Text } from '@chakra-ui/react';
import { JsonSyntaxHighlighter } from '../../components/JsonSyntaxHighlighter';

export const PlatformOverridesExampleTab: React.FC = () => {
  const examplePlatformExtension = {
    systemId: "acme-design-system",
    platformId: "platform-ios",
    version: "1.0.0",
    status: "active",
    figmaFileKey: "ios-platform-figma-file-key",
    syntaxPatterns: {
      prefix: "",
      suffix: "",
      delimiter: "_",
      capitalization: "camel",
      formatString: ""
    },
    valueFormatters: {
      color: "hex",
      dimension: "dp",
      numberPrecision: 2
    },
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
      },
      {
        algorithmId: "algorithm-typography-scale",
        variableId: "base-font-size",
        valuesByMode: [
          {
            modeIds: ["mode-light"],
            value: 16
          },
          {
            modeIds: ["mode-dark"],
            value: 18
          }
        ]
      }
    ],
    tokenOverrides: [
      {
        id: "token-blue-500",
        displayName: "iOS Blue 500",
        description: "iOS-specific blue color optimized for iOS Human Interface Guidelines",
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
      },
      {
        id: "token-spacing-xs",
        displayName: "iOS Extra Small Spacing",
        description: "iOS-specific extra small spacing using dp units",
        themeable: false,
        private: false,
        status: "stable",
        tokenTier: "PRIMITIVE",
        resolvedValueTypeId: "spacing",
        generatedByAlgorithm: true,
        algorithmId: "algorithm-spacing-scale",
        valuesByMode: [
          {
            modeIds: ["mode-light"],
            value: {
              value: 4
            }
          },
          {
            modeIds: ["mode-dark"],
            value: {
              value: 5
            }
          }
        ],
        omit: false
      },
      {
        id: "token-button-primary",
        displayName: "iOS Primary Button",
        description: "iOS-specific primary button styling",
        themeable: true,
        private: false,
        status: "stable",
        tokenTier: "COMPONENT",
        resolvedValueTypeId: "color",
        generatedByAlgorithm: false,
        propertyTypes: [
          {
            id: "background-color",
            displayName: "Background Color",
            category: "color",
            compatibleValueTypes: ["color"],
            platformMappings: {
              ios: [".background()", ".backgroundColor"],
              android: ["background", "colorBackground"]
            }
          }
        ],
        codeSyntax: [
          {
            platformId: "platform-ios",
            formattedName: "iOSButtonPrimary"
          }
        ],
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
      },
      {
        id: "token-web-only-feature",
        displayName: "Web Only Feature",
        description: "This token is omitted from iOS platform",
        themeable: false,
        private: false,
        status: "stable",
        tokenTier: "SEMANTIC",
        resolvedValueTypeId: "color",
        generatedByAlgorithm: false,
        valuesByMode: [
          {
            modeIds: ["mode-light"],
            value: {
              value: "#FF0000"
            }
          }
        ],
        omit: true
      }
    ],
    omittedModes: ["mode-high-contrast"],
    omittedDimensions: ["dimension-accessibility"]
  };

  return (
    <VStack spacing={6} align="stretch">
      <Box>
        <Heading size="md" mb={4}>Complete Platform Extension Example</Heading>
        <Text mb={4}>
          This example shows a complete iOS platform extension file that demonstrates all the key features of the platform extension schema:
        </Text>
        <Text mb={4} fontSize="sm" color="gray.600">
          • System and platform identification<br />
          • Unique Figma file key for platform-specific publishing<br />
          • iOS-specific syntax patterns and value formatters<br />
          • Algorithm variable overrides for platform-specific customization<br />
          • Token overrides with iOS-optimized values<br />
          • Token omissions for platform-specific filtering<br />
          • Mode and dimension omissions for platform simplification
        </Text>
      </Box>

      <Box>
        <JsonSyntaxHighlighter code={JSON.stringify(examplePlatformExtension, null, 2)} />
      </Box>

      <Box>
        <Heading size="md" mb={4}>Key Features Demonstrated</Heading>
        <Text mb={2}>
          <b>Platform-Specific Customization:</b> The iOS platform extension customizes colors, spacing, and typography to match iOS Human Interface Guidelines.<br /><br />
          <b>Algorithm Integration:</b> Algorithm variable overrides allow the platform to customize the base values used by algorithms while maintaining the core algorithm logic.<br /><br />
          <b>Selective Omission:</b> The platform omits web-specific tokens and high-contrast modes that aren&apos;t relevant for iOS.<br /><br />
          <b>Figma Publishing:</b> The unique <code>figmaFileKey</code> ensures iOS tokens are published to a dedicated Figma file for platform-specific design work.
        </Text>
      </Box>
    </VStack>
  );
}; 