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

export const AlgorithmDataPropertiesTab: React.FC = () => {
  return (
    <VStack spacing={6} align="stretch">
      <Box>
        <Heading size="md" mb={4}>Schema Version & Profile</Heading>
        <Text mb={2}>
          <b>schemaVersion</b> (required): Semantic version of the algorithm schema, following semantic versioning (e.g., 5.0.0).<br />
          <b>profile</b> (optional): Complexity profile determining available features and validation strictness. Options are <Code colorScheme="purple">basic</Code>, <Code colorScheme="purple">standard</Code>, or <Code colorScheme="purple">advanced</Code>.<br /><br />
          The profile determines which features are available and how strict validation should be. Basic profiles have simpler validation rules, while advanced profiles support complex mathematical operations and conditional logic.
        </Text>
        <JsonSyntaxHighlighter code={JSON.stringify({
          schemaVersion: "5.0.0",
          profile: "basic"
        }, null, 2)} />
      </Box>

      <Box>
        <Heading size="md" mb={4}>Metadata</Heading>
        <Text mb={2}>
          <b>metadata</b> (optional): Information about the algorithm collection including name, description, version, and author.<br />
          This provides context and documentation for the algorithm collection, making it easier to understand its purpose and maintain it over time.
        </Text>
        <JsonSyntaxHighlighter code={JSON.stringify({
          metadata: {
            name: "Design System Algorithm Collection",
            description: "Algorithms for generating design tokens programmatically",
            version: "1.0.0",
            author: "Design System Team"
          }
        }, null, 2)} />
      </Box>

      <Box>
        <Heading size="md" mb={4}>System Variables</Heading>
        <Text mb={2}>
          <b>config.systemVariables</b> (optional): Global variables that can be referenced by algorithms across the collection.<br />
          System variables can be mode-based, allowing different values for different contexts (e.g., viewport sizes, text size indices).<br /><br />
          <b>Mode-Based Variables:</b> Variables with <Code colorScheme="purple">modeBased: true</Code> use the same <Code colorScheme="purple">valuesByMode</Code> structure as tokens, with <Code colorScheme="purple">modeIds</Code> arrays and mode-specific values.
        </Text>
        <JsonSyntaxHighlighter code={JSON.stringify({
          config: {
            systemVariables: [
              {
                id: "viewport-width",
                name: "viewportWidth",
                type: "number",
                defaultValue: 320,
                description: "Current viewport width for responsive calculations",
                modeBased: true,
                dimensionId: "dimension-viewport",
                valuesByMode: [
                  {
                    modeIds: ["mode-mobile"],
                    value: 320
                  },
                  {
                    modeIds: ["mode-tablet"],
                    value: 768
                  },
                  {
                    modeIds: ["mode-desktop"],
                    value: 1200
                  }
                ]
              },
              {
                id: "text-size-index",
                name: "textSizeIndex",
                type: "number",
                defaultValue: 0,
                description: "Text size index for typography scaling",
                constraints: {
                  min: -2,
                  max: 2,
                  step: 1
                }
              }
            ]
          }
        }, null, 2)} />
      </Box>

      <Box>
        <Heading size="md" mb={4}>Algorithms</Heading>
        <Text mb={2}>
          <b>algorithms</b> (required): Array of algorithm definitions for generating design tokens programmatically.<br />
          Each algorithm specifies variables, formulas, conditions, and execution steps to produce token values.<br /><br />
          <b>Key Components:</b>
          <UnorderedList mt={1} mb={1}>
            <ListItem><Code colorScheme="purple">resolvedValueTypeId</Code>: References the value type this algorithm generates (must match core schema)</ListItem>
            <ListItem><Code colorScheme="purple">variables</Code>: Input variables with types, defaults, and constraints</ListItem>
            <ListItem><Code colorScheme="purple">formulas</Code>: Mathematical expressions in multiple formats (LaTeX, JavaScript, AST)</ListItem>
            <ListItem><Code colorScheme="purple">conditions</Code>: Validation and conditional logic</ListItem>
            <ListItem><Code colorScheme="purple">steps</Code>: Execution order of formulas and conditions</ListItem>
          </UnorderedList>
        </Text>
        <JsonSyntaxHighlighter code={JSON.stringify({
          algorithms: [
            {
              id: "typography-scale-algorithm",
              name: "Typography Scale Algorithm",
              description: "Generates font sizes using modular scale",
              resolvedValueTypeId: "fontSize",
              variables: [
                {
                  id: "base",
                  name: "Base",
                  type: "number",
                  defaultValue: "16",
                  description: "Base font size"
                },
                {
                  id: "ratio",
                  name: "Ratio",
                  type: "number",
                  defaultValue: "1.25",
                  description: "Modular scale ratio"
                }
              ],
              formulas: [
                {
                  id: "font-size-calculation",
                  name: "Font Size Calculation",
                  description: "Calculate font size using modular scale",
                  expressions: {
                    latex: {
                      value: "fontSize = base \\times ratio^n"
                    },
                    javascript: {
                      value: "fontSize = base * Math.pow(ratio, n)",
                      metadata: {
                        allowedOperations: ["math"]
                      }
                    },
                    ast: {
                      type: "assignment",
                      variableName: "fontSize",
                      expression: {
                        type: "binary",
                        operator: "*",
                        left: {
                          type: "variable",
                          variableName: "base"
                        },
                        right: {
                          type: "function",
                          functionName: "Math.pow",
                          arguments: [
                            {
                              type: "variable",
                              variableName: "ratio"
                            },
                            {
                              type: "variable",
                              variableName: "n"
                            }
                          ]
                        }
                      }
                    }
                  },
                  variableIds: ["base", "ratio"]
                }
              ],
              conditions: [
                {
                  id: "validate-ratio",
                  name: "Validate Ratio",
                  expression: "ratio > 0 && ratio <= 2",
                  variableIds: ["ratio"]
                }
              ],
              steps: [
                {
                  type: "condition",
                  id: "validate-ratio",
                  name: "Validate Ratio"
                },
                {
                  type: "formula",
                  id: "font-size-calculation",
                  name: "Calculate Font Size"
                }
              ]
            }
          ]
        }, null, 2)} />
      </Box>

      <Box>
        <Heading size="md" mb={4}>Expression Formats</Heading>
        <Text mb={2}>
          <b>expressions</b>: Each formula supports multiple expression formats for different use cases and validation.<br /><br />
          <b>LaTeX:</b> Mathematical notation for documentation and display purposes.<br />
          <b>JavaScript:</b> Executable code with metadata about allowed operations.<br />
          <b>AST:</b> Abstract Syntax Tree for validation, analysis, and transformation.<br /><br />
          <b>Technical note:</b> All expressions must produce the same result regardless of format. The AST format enables advanced validation and optimization.
        </Text>
        <JsonSyntaxHighlighter code={JSON.stringify({
          expressions: {
            latex: {
              value: "result = base \\times multiplier^n"
            },
            javascript: {
              value: "result = base * Math.pow(multiplier, n)",
              metadata: {
                allowedOperations: ["math"]
              }
            },
            ast: {
              type: "assignment",
              variableName: "result",
              expression: {
                type: "binary",
                operator: "*",
                left: {
                  type: "variable",
                  variableName: "base"
                },
                right: {
                  type: "function",
                  functionName: "Math.pow",
                  arguments: [
                    {
                      type: "variable",
                      variableName: "multiplier"
                    },
                    {
                      type: "variable",
                      variableName: "n"
                    }
                  ]
                }
              },
              metadata: {
                astVersion: "1.0.0",
                validationErrors: [],
                complexity: "medium"
              }
            }
          }
        }, null, 2)} />
      </Box>

      <Box>
        <Heading size="md" mb={4}>Execution Configuration</Heading>
        <Text mb={2}>
          <b>execution</b> (optional): Configuration for algorithm execution including order, parallel processing, and error handling.<br /><br />
          <b>Key Features:</b>
          <UnorderedList mt={1} mb={1}>
            <ListItem><Code colorScheme="purple">order</Code>: Explicit execution order for algorithms (optional if auto-detected)</ListItem>
            <ListItem><Code colorScheme="purple">parallel</Code>: Enable parallel execution if supported</ListItem>
            <ListItem><Code colorScheme="purple">onError</Code>: Error handling strategy (stop, skip, warn)</ListItem>
          </UnorderedList>
        </Text>
        <JsonSyntaxHighlighter code={JSON.stringify({
          execution: {
            order: ["typography-scale-algorithm", "spacing-scale-algorithm"],
            parallel: false,
            onError: "stop"
          }
        }, null, 2)} />
      </Box>

      <Box>
        <Heading size="md" mb={4}>Integration Settings</Heading>
        <Text mb={2}>
          <b>integration</b> (optional): Settings for integrating with the main token schema and output generation.<br /><br />
          <b>Key Features:</b>
          <UnorderedList mt={1} mb={1}>
            <ListItem><Code colorScheme="purple">targetSchema</Code>: URI or path to the target token schema</ListItem>
            <ListItem><Code colorScheme="purple">outputFormat</Code>: Format for generated tokens (design-tokens, custom)</ListItem>
            <ListItem><Code colorScheme="purple">mergeStrategy</Code>: How to handle existing tokens (replace, merge, append)</ListItem>
            <ListItem><Code colorScheme="purple">validation</Code>: Whether to validate generated tokens against the target schema</ListItem>
          </UnorderedList>
        </Text>
        <JsonSyntaxHighlighter code={JSON.stringify({
          integration: {
            targetSchema: "https://designsystem.org/schemas/tokens/v1.0.0",
            outputFormat: "design-tokens",
            mergeStrategy: "merge",
            validation: true
          }
        }, null, 2)} />
      </Box>

      <Box>
        <Heading size="md" mb={4}>Examples</Heading>
        <Text mb={2}>
          <b>examples</b> (optional): Use case examples for testing and validation of algorithms.<br />
          Each example includes configuration, algorithms, and expected output to help users understand how to use the algorithms effectively.
        </Text>
        <JsonSyntaxHighlighter code={JSON.stringify({
          examples: [
            {
              name: "Basic Typography Scale",
              description: "Generate font sizes for a typography scale",
              useCase: "Typography system generation",
              config: {
                baseFontSize: 16,
                ratio: 1.25
              },
              algorithms: [
                {
                  id: "typography-scale-algorithm",
                  variables: {
                    base: 16,
                    ratio: 1.25
                  }
                }
              ],
              expectedOutput: {
                tokens: [
                  {
                    name: "font-size-0",
                    value: 16,
                    description: "Base font size"
                  },
                  {
                    name: "font-size-1",
                    value: 20,
                    description: "Font size with ratio applied once"
                  }
                ]
              }
            }
          ]
        }, null, 2)} />
      </Box>
    </VStack>
  );
}; 