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
              date: "2024-06-01"
            }
          ]
        }, null, 2)} />
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
              resolvedValueTypeIds: ["color"],
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
              modes: [
                {
                  id: "mode-light",
                  name: "Light",
                  dimensionId: "dimension-color-scheme"
                },
                {
                  id: "mode-dark",
                  name: "Dark",
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
          <b>Custom value type example:</b> The <Code colorScheme="purple">icon</Code> value type above is a custom type (no <Code colorScheme="purple">type</Code> field). It can be referenced by tokens, collections, dimensions, and taxonomies using <Code colorScheme="purple">resolvedValueTypeId: "icon"</Code> or <Code colorScheme="purple">resolvedValueTypeIds: ["icon"]</Code>. Custom types are validated and referenced exactly like standard types.
        </Text>
      </Box>

      <Box>
        <Heading size="md" mb={4}>Tokens</Heading>
        <Text mb={2}>
          <b>tokens</b> (required): Design tokens with values that can vary by mode.<br />
          Each token references its collection and value type by ID (<Code colorScheme="purple">tokenCollectionId</Code>, <Code colorScheme="purple">resolvedValueTypeId</Code>).<br />
          <b>valuesByMode</b>: Each entry must use <Code colorScheme="purple">modeIds</Code> (array of string IDs). Value type is determined by the token's <Code colorScheme="purple">resolvedValueTypeId</Code>.<br />
          <b>Technical note:</b> Never use UPPER_CASE enums for value types; always reference by string ID. Do not add <Code colorScheme="purple">resolvedValueTypeId</Code> to individual values.
        </Text>
        <JsonSyntaxHighlighter code={JSON.stringify({
          tokens: [
            {
              id: "token-blue-500",
              displayName: "Blue 500",
              tokenCollectionId: "collection-color",
              resolvedValueTypeId: "color",
              valuesByMode: [
                {
                  modeIds: [],
                  value: {
                    value: "#6afda3"
                  }
                },
                {
                  modeIds: [],
                  value: {
                    tokenId: "token-id-000-000-000"
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
          <b>platforms</b> (required): Platforms that can be used to resolve token values.<br />
          Each platform can specify naming conventions and value formatting rules for code export using <Code colorScheme="purple">syntaxPatterns</Code>.<br />
          <b>Technical note:</b> All platform references use <Code colorScheme="purple">id</Code> fields. Syntax patterns and value formatters follow the schema structure.
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