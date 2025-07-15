# AI Integration with Claude API

This document describes the AI integration for the Design System Manager, powered by Anthropic's Claude API. The AI assistant provides intelligent help for design token management tasks while strictly adhering to the data-model schema.

## Overview

The AI integration consists of several key components:

1. **ClaudeService** - Main service that integrates with Claude API
2. **React Components** - UI components for AI interaction
3. **React Hooks** - Easy integration with React components

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   React App     │    │   AI Services    │    │   Claude API    │
│                 │    │                  │    │                 │
│ ┌─────────────┐ │    │ ┌──────────────┐ │    │ ┌─────────────┐ │
│ │ AI Chat UI  │ │◄──►│ │ClaudeService │ │◄──►│ │ Claude API  │ │
│ └─────────────┘ │    │ └──────────────┘ │    │ └─────────────┘ │
│                 │    │                  │    │                 │
│ ┌─────────────┐ │    │ ┌──────────────┐ │    │                 │
│ │   useAI     │ │◄──►│ │Context Mgr.  │ │    │                 │
│ └─────────────┘ │    │ └──────────────┘ │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## Key Features

### 1. Schema Adherence
- All AI suggestions are validated against the data-model schema
- Ensures tokens, collections, and dimensions follow proper structure
- Prevents invalid data from being created

### 2. Context Awareness
- AI assistant is trained on current user data
- Understands existing tokens, collections, and patterns
- Provides relevant suggestions based on context

### 3. Multiple AI Tasks
- **Token Creation**: Generate new tokens with proper validation
- **Collection Organization**: Suggest appropriate collections
- **Data Validation**: Identify and fix validation issues
- **Token Search**: Find existing tokens based on queries
- **Concept Explanation**: Explain design token concepts

### 4. User-Friendly Interface
- Chat interface for natural language interaction
- Real-time suggestions and validation feedback

## Installation

The AI integration requires the Anthropic SDK:

```bash
pnpm add @anthropic-ai/sdk
```

## Configuration

### API Key Setup

Set your Claude API key as an environment variable:

```bash
export ANTHROPIC_API_KEY="your-api-key-here"
```

Or pass it directly to the service:

```typescript
const aiHook = useAI(schema, {
  apiKey: 'your-api-key-here'
});
```

## Usage

### Basic Setup

```typescript
import { useAI } from '../hooks/useAI';
import { AIChatInterface } from '../components/AIChatInterface';

function MyComponent() {
  const aiHook = useAI(schema, {
    apiKey: process.env.ANTHROPIC_API_KEY,
    model: 'claude-3-5-sonnet-20241022',
    temperature: 0.3
  });

  return (
    <AIChatInterface
      aiService={aiHook.aiService!}
      context={aiHook.context!}
      onTokenCreated={handleTokenCreated}
    />
  );
}
```

### AI Operations

```typescript
// Create a token
const response = await aiHook.createToken('Create a primary button color');

// Suggest a collection
const response = await aiHook.suggestCollection('Where should I put this button token?');

// Find tokens
const response = await aiHook.findTokens('button colors');

// Explain concepts
const response = await aiHook.explainConcept('What are design tokens?');
```

## Components

### AIChatInterface
A chat-based interface for interacting with the AI assistant.

**Props:**
- `aiService`: ClaudeService instance
- `context`: Current AI context
- `onTokenCreated`: Callback when tokens are created
- `onCollectionSuggested`: Callback when collections are suggested

### ChatSidebar
A collapsible sidebar that contains the AI chat interface.

**Props:**
- `schema`: Current schema data
- `onTokenCreated`: Callback when tokens are created
- `onCollectionSuggested`: Callback when collections are suggested

## Services

### ClaudeService
Main service that orchestrates AI operations with Claude API.

**Key Methods:**
- `initialize()`: Initialize the Claude API client
- `createToken(userInput)`: Create tokens with AI assistance
- `suggestCollection(userInput)`: Suggest collections
- `validateData(validationErrors)`: Fix validation issues
- `findTokens(userInput)`: Search for tokens
- `explainConcept(userInput)`: Explain concepts

**Configuration Options:**
- `apiKey`: Claude API key
- `model`: Claude model to use (default: claude-3-5-sonnet-20241022)
- `maxTokens`: Maximum response length (default: 4000)
- `temperature`: Response creativity (default: 0.3)

## Hooks

### useAI
Main hook for AI integration.

**Options:**
- `apiKey`: Claude API key
- `model`: Claude model to use
- `maxTokens`: Maximum response length
- `temperature`: Response creativity (0-1)
- `autoInitialize`: Auto-initialize on mount

**Returns:**
- `aiService`: ClaudeService instance
- `context`: Current AI context
- `createToken`, `suggestCollection`, etc.: AI operation methods
- `isInitialized`, `isLoading`, `error`: Status information

### useAIContextSync
Hook for syncing AI context with data manager changes.

## Error Handling

The AI integration includes comprehensive error handling:

```typescript
if (aiHook.error) {
  // Handle initialization errors
  return <ErrorComponent error={aiHook.error} />;
}

try {
  const response = await aiHook.createToken('Create a token');
  if (!response.success) {
    // Handle AI operation errors
    console.error('AI Error:', response.error);
  }
} catch (error) {
  // Handle unexpected errors
  console.error('Unexpected error:', error);
}
```

## Validation

All AI suggestions are automatically validated:

```typescript
const response = await aiHook.createToken('Create a token');

if (response.validationResult && !response.validationResult.isValid) {
  // Handle validation errors
  response.validationResult.errors.forEach(error => {
    console.error(`${error.path}: ${error.message}`);
  });
}
```

## Performance Considerations

1. **API Rate Limits**: Claude API has rate limits, consider implementing caching
2. **Response Caching**: Consider implementing response caching for repeated queries
3. **Batch Operations**: Group multiple AI operations when possible
4. **Model Selection**: Choose appropriate model size for your use case

## Security

1. **API Key Management**: Store API keys securely using environment variables
2. **Data Transmission**: User data is sent to Claude API for processing
3. **Schema Validation**: All suggestions are validated against the schema
4. **Input Sanitization**: User inputs are sanitized before processing

## Troubleshooting

### Common Issues

1. **API Key Missing**
   - Check that ANTHROPIC_API_KEY environment variable is set
   - Verify the API key is valid and has sufficient credits

2. **Network Errors**
   - Check internet connection
   - Verify Claude API is accessible from your network

3. **Rate Limit Errors**
   - Implement exponential backoff for retries
   - Consider caching responses

4. **Schema Validation Errors**
   - Ensure the schema is properly formatted
   - Check that all required fields are present

## Migration from Transformers.js

This implementation replaces the previous Transformers.js-based AI integration. Key changes:

1. **Removed Dependencies**: No longer requires @xenova/transformers
2. **API-Based**: Uses Claude API instead of local model inference
3. **Better Performance**: Faster response times and higher quality
4. **Improved Reliability**: No more model loading issues or CORS problems
5. **Simplified Architecture**: Removed complex model management code

## Future Enhancements

1. **MCP Integration**: Implement Model Context Protocol for structured interactions
2. **Multiple AI Providers**: Support for other AI services (OpenAI, etc.)
3. **Advanced Caching**: Implement intelligent response caching
4. **Streaming Responses**: Real-time streaming of AI responses
5. **Custom Prompts**: Allow users to customize AI prompts 