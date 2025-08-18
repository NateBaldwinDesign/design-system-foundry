# Gemini AI Integration Documentation

## Overview
The Gemini AI integration provides conversational AI capabilities for the design system application using Google's Gemini API. This feature allows users to ask natural language questions about their design system data and receive contextual, helpful responses.

## Features

### Core Capabilities
- **Natural Language Processing**: Ask questions about design system concepts in plain English
- **Schema-Compliant Responses**: All AI responses respect the schema.json structure
- **Cost-Optimized Implementation**: Monthly budget of $5.00 for typical usage
- **Real-Time Conversation Interface**: Interactive chat interface with message history
- **Project Philosophy Alignment**: AI understands core design system concepts

### Cost Management
- **Budget Controls**: Automatic budget tracking and limits
- **Cost Transparency**: Real-time cost display and usage statistics
- **Budget Alerts**: Warnings when approaching monthly limits
- **Feature Availability**: AI features disabled when budget exceeded

### User Experience
- **Suggestion System**: Pre-built questions to help users get started
- **Loading States**: Visual feedback during AI processing
- **Error Handling**: Graceful error messages and recovery
- **Responsive Design**: Works across different screen sizes

## Architecture

### Service Layer
- **GeminiAIService**: Handles API communication with Google Gemini
- **GeminiContextBuilder**: Builds optimized context for AI queries
- **GeminiCostManager**: Manages cost tracking and budget controls

### React Integration
- **GeminiAIContext**: Provides AI functionality throughout the app
- **useGeminiAI Hook**: Easy access to AI features in components
- **Error Boundaries**: Graceful error handling and recovery

### UI Components
- **GeminiChatbot**: Main conversation interface
- **MessageBubble**: Individual message display
- **SuggestionButtons**: Clickable question suggestions
- **CostDisplay**: Budget and usage information

## Usage

### Getting Started
1. Navigate to "AI Assistant" in the sidebar
2. Review the status bar to ensure AI is available
3. Use suggestion buttons or type your own question
4. Monitor costs in the cost display section

### Example Questions
- "What tokens are available in my design system?"
- "How do I create a new component?"
- "What are the current dimensions and modes?"
- "How do I organize tokens with taxonomies?"
- "What platforms does my design system support?"
- "Explain the relationship between dimensions and modes"
- "How do aliases work in this design system?"
- "What resolved value types are supported?"

### Core Concepts the AI Understands
1. **Resolved Value Types**: Fundamental types like "color", "font", "gap", "shadow"
2. **Dimensions**: Groups of mutually exclusive modes with common themes
3. **Modes**: Specific options within a dimension
4. **Token Collections**: Categorization groups for tokens
5. **Aliases**: Token references to other tokens

## Configuration

### Environment Variables
```env
# Gemini AI Configuration
GEMINI_API_KEY=your-gemini-api-key
GEMINI_BASE_URL=https://generativelanguage.googleapis.com
GEMINI_MODEL=gemini-1.5-flash
GEMINI_MONTHLY_BUDGET=5.00
```

### Budget Settings
- **Monthly Budget**: $5.00 (configurable)
- **Cost Per Query**: ~$0.001 per 1,000 tokens
- **Typical Usage**: 100+ queries per month
- **Budget Reset**: 1st of each month

### API Configuration
- **Model**: Gemini 1.5 Flash (optimized for speed and cost)
- **Temperature**: 0.3 (balanced creativity and accuracy)
- **Max Output**: 1,000 tokens per response
- **Rate Limiting**: Built-in exponential backoff

## Cost Management

### Pricing Structure
- **Input Tokens**: $0.001 per 1,000 tokens
- **Output Tokens**: $0.001 per 1,000 tokens
- **Typical Query**: 500-1,500 total tokens
- **Cost Per Query**: $0.0005 - $0.0015

### Budget Alerts
- **80% Warning**: Alert when approaching budget
- **90% Warning**: Stronger alert with usage reduction suggestion
- **100% Exceeded**: AI features disabled until next month

### Usage Tracking
- **Monthly Queries**: Count of queries per month
- **Monthly Cost**: Total cost for current month
- **Average Cost**: Average cost per query
- **Budget Status**: Current usage vs. budget

## Security and Privacy

### Data Handling
- **Local Processing**: Design system data processed locally
- **API Communication**: Only query text sent to Google Gemini
- **No Data Storage**: No design system data stored on external servers
- **Encrypted Communication**: All API calls use HTTPS

### Privacy Features
- **Query Anonymization**: No user identification in API calls
- **Data Minimization**: Only necessary context sent to API
- **Local Storage**: Usage data stored locally in browser
- **User Control**: Users can clear conversation history

## Troubleshooting

### Common Issues

#### AI Not Available
- **Cause**: Monthly budget exceeded
- **Solution**: Wait until next month or increase budget
- **Prevention**: Monitor usage and set appropriate limits

#### Slow Responses
- **Cause**: Large design system context
- **Solution**: Ask more specific questions
- **Prevention**: Context optimization is automatic

#### API Errors
- **Cause**: Network issues or API limits
- **Solution**: Retry the query
- **Prevention**: Built-in retry logic and error handling

#### Budget Warnings
- **Cause**: Approaching monthly limit
- **Solution**: Reduce usage or wait for reset
- **Prevention**: Monitor cost display regularly

### Error Messages
- **"Monthly budget exceeded"**: AI features disabled
- **"This query would exceed your monthly budget"**: Try a more specific question
- **"AI features are currently disabled"**: Budget limit reached
- **"Network error"**: Check internet connection and retry

## Best Practices

### For Users
1. **Be Specific**: Ask targeted questions for better responses
2. **Monitor Costs**: Check cost display regularly
3. **Use Suggestions**: Start with provided question suggestions
4. **Understand Concepts**: Learn the 5 core design system concepts

### For Developers
1. **Schema Compliance**: Always validate against schema.json
2. **Cost Optimization**: Monitor context size and token usage
3. **Error Handling**: Implement graceful error recovery
4. **User Feedback**: Provide clear status and progress indicators

## Future Enhancements

### Planned Features
- **Conversation History**: Persistent chat history across sessions
- **Advanced Analytics**: Detailed usage and cost analytics
- **Custom Prompts**: User-defined question templates
- **Multi-Language Support**: Support for additional languages

### Performance Improvements
- **Context Caching**: Cache frequently used contexts
- **Response Optimization**: Faster response times
- **Smart Suggestions**: AI-powered question suggestions
- **Predictive Loading**: Pre-load common contexts

## Support

### Getting Help
- **Documentation**: This guide and inline help
- **Error Messages**: Clear error descriptions and solutions
- **Cost Display**: Real-time usage and budget information
- **Status Indicators**: Visual feedback on AI availability

### Reporting Issues
- **Console Logs**: Check browser console for detailed errors
- **Network Tab**: Monitor API calls in browser dev tools
- **Cost Tracking**: Verify usage in cost display
- **Error Messages**: Note specific error text for support

## Technical Details

### API Integration
- **Endpoint**: Google Gemini 1.5 Flash API
- **Authentication**: API key-based authentication
- **Rate Limiting**: Exponential backoff for retries
- **Error Handling**: Comprehensive error categorization

### Context Building
- **Schema Compliance**: All contexts respect schema.json
- **Cost Optimization**: Automatic context size management
- **Priority System**: Important data prioritized in context
- **Token Estimation**: Accurate token counting for cost prediction

### State Management
- **React Context**: Centralized AI state management
- **Local Storage**: Persistent usage and settings data
- **Real-Time Updates**: Live cost and status updates
- **Error Boundaries**: Graceful error handling

This integration provides a powerful, cost-effective way to interact with design system data using natural language, while maintaining strict adherence to project philosophies and technical constraints.
