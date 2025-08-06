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
import { JsonSyntaxHighlighter } from '../components/JsonSyntaxHighlighter';

export const CoreDataPropertiesTab: React.FC = () => {
  return (
    <VStack spacing={6} align="stretch">
      <Box>
        <Heading size="md" mb={4}>System Name & ID</Heading>
        <Text mb={2}>
          <b>systemName</b> (required): Human-readable name for the design token system.<br />
          <b>systemId</b> (required): Unique identifier for the design token system, using the same pattern as other IDs.<br />
          <b>description</b> (optional): Human-readable description of the design token system.<br /><br />
          These fields are required at the top level of every token data file. They ensure that every data set is uniquely and clearly identified, and provide a summary for documentation and discovery.
        </Text>
        <JsonSyntaxHighlighter code={JSON.stringify({
          systemName: "Acme Design System",
          systemId: "acme-design-system",
          description: "The canonical design token set for Acme Corp."
        }, null, 2)} />
      </Box>

      <Box>
        <Heading size="md" mb={4}>Version & Version History</Heading>
        <Text mb={2}>
          <b>version</b> (required): Semantic version of the token set, following <a href="https://semver.org/" target="_blank" rel="noopener noreferrer">semantic versioning</a> (e.g., 1.0.0).<br />
          <b>versionHistory</b> (required): Array of previous versions, each with dimension configuration and date. This supports migrations and compatibility tracking.
        </Text>
        <JsonSyntaxHighlighter code={JSON.stringify({
          version: "1.0.0",
          versionHistory: [
            {
              version: "1.0.0",
              dimensions: ["dimension-color-scheme"],
              date: "2024-06-01",
              migrationStrategy: {
                emptyModeIds: "mapToDefaults",
                preserveOriginalValues: true
              }
            }
          ]
        }, null, 2)} />
      </Box>

      <Box>
        <Heading size="md" mb={4}>Metadata & Configuration</Heading>
        <Text mb={2}>
          <b>metadata</b> (optional): Additional information about the token set including maintainers and last updated date.<br />
          <b>dimensionOrder</b> (optional): Order of dimensions to use when resolving token values.<br />
          <b>exportConfigurations</b> (optional): Platform-specific export configuration rules.
        </Text>
        <JsonSyntaxHighlighter code={JSON.stringify({
          metadata: {
            description: "Core design tokens for Acme Corp applications",
            lastUpdated: "2024-06-01",
            maintainers: ["design-team@acme.com"]
          },
          dimensionOrder: ["dimension-color-scheme", "dimension-size"],
          exportConfigurations: {
            "platform-web": {
              prefix: "--",
              delimiter: "-",
              capitalization: "lowercase"
            }
          }
        }, null, 2)} />
      </Box>

      <Box>
        <Heading size="md" mb={4}>Resolved Value Types</Heading>
        <Text mb={2}>
          <b>resolvedValueTypes</b> (required): The canonical list of value types supported by the system.<br />
          Each value type has a unique <Code colorScheme="purple">id</Code> (referenced by tokens, collections, dimensions, and taxonomies), a human-readable <Code colorScheme="purple">displayName</Code>, and an optional standard <Code colorScheme="purple">type</Code> (UPPER_CASE, for standards compliance).<br /><br />
          <b>Custom value types:</b> You may define your own custom value types by omitting the <Code colorScheme="purple">type</Code> field. Custom types must still have a unique <Code colorScheme="purple">id</Code> and <Code colorScheme="purple">displayName</Code>. These can be referenced by tokens, collections, dimensions, and taxonomies using their <Code colorScheme="purple">id</Code>.<br /><br />
          <b>Technical notes:</b>
          <UnorderedList mt={1} mb={1}>
            <ListItem>All references to value types elsewhere in the data model must use the <b>id</b> field from this array (never UPPER_CASE enums).</ListItem>
            <ListItem>Additional fields like <Code colorScheme="purple">description</Code> and <Code colorScheme="purple">validation</Code> may be present for documentation and validation purposes.</ListItem>
            <ListItem>Custom value types allow for extensibility beyond the standard set (see example below).</ListItem>
            <ListItem>See <Code colorScheme="purple">schema.json</Code> and <Code colorScheme="purple">technical-decisions.md</Code> for full structure and rationale.</ListItem>
          </UnorderedList>
        </Text>
        <JsonSyntaxHighlighter code={JSON.stringify({
          resolvedValueTypes: [
            {
              id: "color",
              displayName: "Color",
              type: "COLOR",
              description: "A color value, e.g. #RRGGBB or rgba()."
            },
            {
              id: "fontFamily",
              displayName: "Font Family",
              type: "FONT_FAMILY",
              description: "A font family name or stack."
            },
            {
              id: "dimension",
              displayName: "Dimension",
              type: "DIMENSION",
              description: "A numeric value with a unit, e.g. 16px or 1.5rem."
            },
            {
              id: "spacing",
              displayName: "Spacing",
              type: "SPACING",
              description: "A spacing value, e.g. 16px or 1rem."
            },
            // Example of a custom value type (no 'type' field)
            {
              id: "icon",
              displayName: "Icon",
              description: "A custom value type for referencing icon names in the design system.",
              validation: {
                pattern: "^[a-z0-9-]+$"
              }
            }
          ]
        }, null, 2)} />
        <Text fontSize="sm" color="gray.500" mt={2}>
          <b>Custom value type example:</b> The <Code colorScheme="purple">icon</Code> value type above is a custom type (no <Code colorScheme="purple">type</Code> field). It can be referenced by tokens, collections, dimensions, and taxonomies using <Code colorScheme="purple">resolvedValueTypeId: &quot;icon&quot;</Code> or <Code colorScheme="purple">resolvedValueTypeIds: [&quot;icon&quot;]</Code>. Custom types are validated and referenced exactly like standard types.
        </Text>
      </Box>

      <Box>
        <Heading size="md" mb={4}>Token Collections</Heading>
        <Text mb={2}>
          <b>tokenCollections</b> (required): Collections of tokens grouped by type.<br />
          Each collection specifies which value types it supports using <Code colorScheme="purple">resolvedValueTypeIds</Code> (string IDs, not enums).<br />
          <b>Technical note:</b> All reference fields use the <b>ID/Ids suffix</b> convention for clarity and validation.
        </Text>
        <JsonSyntaxHighlighter code={JSON.stringify({
          tokenCollections: [
            {
              id: "collection-color",
              name: "Color",
              description: "Color tokens for the design system",
              resolvedValueTypeIds: ["color"],
              private: false
            },
            {
              id: "collection-typography",
              name: "Typography",
              description: "Typography tokens for the design system",
              resolvedValueTypeIds: ["fontFamily", "fontSize", "fontWeight", "lineHeight"],
              private: false
            }
          ]
        }, null, 2)} />
      </Box>

      <Box>
        <Heading size="md" mb={4}>Dimensions</Heading>
        <Text mb={2}>
          <b>dimensions</b> (required): Dimensions that can modify token values.<br />
          Each dimension contains one or more <b>modes</b> (with <Code colorScheme="purple">id</Code>, <Code colorScheme="purple">name</Code>, and <Code colorScheme="purple">dimensionId</Code>), and specifies supported value types via <Code colorScheme="purple">resolvedValueTypeIds</Code>.<br />
          <b>Technical note:</b> All reference fields use the <b>ID/Ids suffix</b> convention. Value types are referenced by string ID only.
        </Text>
        <JsonSyntaxHighlighter code={JSON.stringify({
          dimensions: [
            {
              id: "dimension-color-scheme",
              displayName: "Color Scheme",
              description: "Color scheme dimension for light and dark themes",
              modes: [
                {
                  id: "mode-light",
                  name: "Light",
                  description: "Light theme mode",
                  dimensionId: "dimension-color-scheme"
                },
                {
                  id: "mode-dark",
                  name: "Dark",
                  description: "Dark theme mode",
                  dimensionId: "dimension-color-scheme"
                }
              ],
              resolvedValueTypeIds: ["color", "dimension", "spacing"],
              defaultMode: "mode-light",
              required: true
            }
          ]
        }, null, 2)} />
      </Box>

      <Box>
        <Heading size="md" mb={4}>Tokens</Heading>
        <Text mb={2}>
          <b>tokens</b> (required): Design tokens with values that can vary by mode.<br />
          Each token references its collection and value type by ID (<Code colorScheme="purple">tokenCollectionId</Code>, <Code colorScheme="purple">resolvedValueTypeId</Code>).<br />
          <b>valuesByMode</b>: Each entry must use <Code colorScheme="purple">modeIds</Code> (array of string IDs). Value type is determined by the token&apos;s <Code colorScheme="purple">resolvedValueTypeId</Code>.<br />

          <b>Technical note:</b> Never use UPPER_CASE enums for value types; always reference by string ID. Platform-specific overrides are now handled through platform extension files rather than inline <Code colorScheme="purple">platformOverrides</Code>.
        </Text>
        <JsonSyntaxHighlighter code={JSON.stringify({
          tokens: [
            {
              id: "token-blue-500",
              displayName: "Blue 500",
              description: "Primary blue color token",
              tokenCollectionId: "collection-color",
              resolvedValueTypeId: "color",
              tokenTier: "PRIMITIVE",
              private: false,
              status: "stable",
              themeable: true,
              generatedByAlgorithm: false,
              propertyTypes: ["color", "background-color"],
              valuesByMode: [
                {
                  modeIds: ["mode-light"],
                  value: {
                    value: "#3B82F6"
                  }
                },
                {
                  modeIds: ["mode-dark"],
                  value: {
                    value: "#60A5FA"
                  }
                },
                {
                  modeIds: [],
                  value: {
                    tokenId: "token-blue-400"
                  }
                }
              ]
            }
          ]
        }, null, 2)} />
      </Box>

      <Box>
        <Heading size="md" mb={4}>Figma Configuration</Heading>
        <Text mb={2}>
          <b>figmaConfiguration</b> (optional): Figma publishing configuration for design tool integration.<br />
          Contains <Code colorScheme="purple">syntaxPatterns</Code> for generating Figma token names and a <Code colorScheme="purple">fileKey</Code> for the default Figma file.<br />
          <b>Technical note:</b> Figma is now properly conceptualized as a publishing destination rather than a platform.
        </Text>
        <JsonSyntaxHighlighter code={JSON.stringify({
          figmaConfiguration: {
            syntaxPatterns: {
              prefix: "",
              suffix: "",
              delimiter: "_",
              capitalization: "camel",
              formatString: ""
            },
            fileKey: "default-design-system-figma"
          }
        }, null, 2)} />
      </Box>

      <Box>
        <Heading size="md" mb={4}>Platforms</Heading>
        <Text mb={2}>
          <b>platforms</b> (required): Runtime platforms that can be used to resolve token values.<br />
          Each platform must reference an external platform extension file via <Code colorScheme="purple">extensionSource</Code> containing platform-specific syntax patterns, value formatters, and overrides.<br />
          <b>Technical note:</b> All platform-specific configuration and data is contained in external platform extension files, keeping the core schema focused on the canonical token structure.
        </Text>
        <JsonSyntaxHighlighter code={JSON.stringify({
          platforms: [
            {
              id: "platform-web",
              displayName: "Web",
              description: "Web platform for CSS and JavaScript",
              extensionSource: {
                repositoryUri: "web-team/design-tokens-web",
                filePath: "platforms/platform-web.json"
              },
              status: "active"
            },
            {
              id: "platform-ios",
              displayName: "iOS",
              description: "iOS platform for Swift and SwiftUI",
              extensionSource: {
                repositoryUri: "ios-team/design-tokens-ios",
                filePath: "platforms/platform-ios.json"
              },
              status: "active"
            }
          ]
        }, null, 2)} />
      </Box>



      <Box>
        <Heading size="md" mb={4}>Themes</Heading>
        <Text mb={2}>
          <b>themes</b> (required): Themes that can override token values across the entire dataset.<br />
          Each theme has an <Code colorScheme="purple">overrideFileUri</Code> that points to a theme override file.<br />
          <b>Technical note:</b> Exactly one theme must be marked as <Code colorScheme="purple">isDefault: true</Code>.
        </Text>
        <JsonSyntaxHighlighter code={JSON.stringify({
          themes: [
            {
              id: "theme-default",
              displayName: "Default Theme",
              description: "The default theme for the design system",
              isDefault: true,
              overrideFileUri: "themed/default-overrides.json"
            },
            {
              id: "theme-brand-a",
              displayName: "Brand A Theme",
              description: "Brand A specific theme overrides",
              isDefault: false,
              overrideFileUri: "themed/brand-a-overrides.json"
            }
          ]
        }, null, 2)} />
      </Box>

      <Box>
        <Heading size="md" mb={4}>Taxonomies</Heading>
        <Text mb={2}>
          <b>taxonomies</b> (optional): Categorical classification system for organizing tokens.<br />
          Each taxonomy contains terms and specifies which value types it supports via <Code colorScheme="purple">resolvedValueTypeIds</Code>.<br />
          <b>Technical note:</b> Taxonomies provide flexible categorization beyond traditional grouping by value type.
        </Text>
        <JsonSyntaxHighlighter code={JSON.stringify({
          taxonomies: [
            {
              id: "taxonomy-semantic",
              name: "Semantic Classification",
              description: "Semantic classification of tokens",
              terms: [
                {
                  id: "term-primary",
                  name: "Primary",
                  description: "Primary brand colors and elements"
                },
                {
                  id: "term-secondary",
                  name: "Secondary",
                  description: "Secondary brand colors and elements"
                }
              ],
              resolvedValueTypeIds: ["color", "dimension", "spacing"]
            }
          ]
        }, null, 2)} />
      </Box>

      <Box>
        <Heading size="md" mb={4}>Naming Rules</Heading>
        <Text mb={2}>
          <b>namingRules</b> (optional): Rules for generating code syntax and naming conventions for tokens.<br />
          <Code colorScheme="purple">taxonomyOrder</Code> determines the order of taxonomy terms when generating code syntax strings.
        </Text>
        <JsonSyntaxHighlighter code={JSON.stringify({
          namingRules: {
            taxonomyOrder: ["taxonomy-semantic", "taxonomy-component"]
          }
        }, null, 2)} />
      </Box>

      <Box>
        <Heading size="md" mb={4}>Dimension Evolution</Heading>
        <Text mb={2}>
          <b>dimensionEvolution</b> (optional): Rules for handling dimension changes and migrations.<br />
          Defines how to handle empty modeIds and whether to preserve default values when mapping.
        </Text>
        <JsonSyntaxHighlighter code={JSON.stringify({
          dimensionEvolution: {
            rules: [
              {
                whenAdding: "dimension-size",
                mapEmptyModeIdsTo: ["mode-default"],
                preserveDefaultValues: true
              }
            ]
          }
        }, null, 2)} />
      </Box>
    </VStack>
  );
};