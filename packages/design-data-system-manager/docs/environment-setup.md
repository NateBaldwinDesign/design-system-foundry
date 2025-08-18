# Environment Setup for Gemini AI Integration

## Required Environment Variables

To use the Gemini AI integration, you need to set up the following environment variables:

### Core Configuration

```env
# Gemini AI Configuration
GEMINI_API_KEY=your-gemini-api-key
GEMINI_BASE_URL=https://generativelanguage.googleapis.com
GEMINI_MODEL=gemini-1.5-flash
GEMINI_MONTHLY_BUDGET=5.00
```

### Optional Feature Flags

```env
# Feature Flags
VITE_ENABLE_AI_ASSISTANT=true
VITE_ENABLE_COST_TRACKING=true
VITE_ENABLE_BUDGET_ALERTS=true
```

## Getting Your Gemini API Key

1. **Visit Google AI Studio**: Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. **Sign In**: Use your Google account to sign in
3. **Create API Key**: Click "Create API Key" to generate a new key
4. **Copy Key**: Copy the generated API key to your environment variables

## Configuration Details

### GEMINI_API_KEY
- **Required**: Yes
- **Type**: String
- **Description**: Your Google Gemini API key for authentication
- **Example**: `AIzaSyC...` (starts with "AIza")

### GEMINI_BASE_URL
- **Required**: No (has default)
- **Type**: String
- **Description**: Base URL for Gemini API endpoints
- **Default**: `https://generativelanguage.googleapis.com`

### GEMINI_MODEL
- **Required**: No (has default)
- **Type**: String
- **Description**: Gemini model to use for AI responses
- **Default**: `gemini-1.5-flash`
- **Options**: `gemini-1.5-flash`, `gemini-1.5-pro`, `gemini-pro`

### GEMINI_MONTHLY_BUDGET
- **Required**: No (has default)
- **Type**: Number
- **Description**: Monthly budget limit in USD
- **Default**: `5.00`
- **Range**: `0.01` to `100.00`

## Local Development Setup

1. **Create .env file**: Create a `.env` file in the project root
2. **Add Variables**: Add the required environment variables
3. **Restart Dev Server**: Restart your development server
4. **Verify Setup**: Check that AI Assistant appears in the sidebar

## Production Deployment

### Vercel
```bash
# Add environment variables in Vercel dashboard
GEMINI_API_KEY=your-production-api-key
GEMINI_MONTHLY_BUDGET=5.00
```

### Netlify
```bash
# Add environment variables in Netlify dashboard
GEMINI_API_KEY=your-production-api-key
GEMINI_MONTHLY_BUDGET=5.00
```

### GitHub Pages
```bash
# Add environment variables in GitHub repository secrets
GEMINI_API_KEY=your-production-api-key
GEMINI_MONTHLY_BUDGET=5.00
```

## Security Considerations

### API Key Security
- **Never commit API keys** to version control
- **Use environment variables** for all API keys
- **Rotate keys regularly** for security
- **Monitor usage** to detect unauthorized access

### Budget Management
- **Set appropriate limits** based on expected usage
- **Monitor costs** regularly
- **Enable alerts** for budget warnings
- **Review usage patterns** monthly

## Troubleshooting

### Common Issues

#### "API Key Not Found"
- **Cause**: Missing or invalid GEMINI_API_KEY
- **Solution**: Verify API key is set correctly
- **Check**: Environment variable is loaded

#### "Budget Exceeded"
- **Cause**: Monthly usage limit reached
- **Solution**: Wait for reset or increase budget
- **Check**: Current usage in cost display

#### "Network Error"
- **Cause**: API endpoint unreachable
- **Solution**: Check internet connection
- **Check**: GEMINI_BASE_URL is correct

#### "Feature Not Available"
- **Cause**: Feature flag disabled
- **Solution**: Enable VITE_ENABLE_AI_ASSISTANT
- **Check**: All required environment variables set

## Cost Optimization

### Budget Planning
- **Typical Usage**: 100-200 queries per month
- **Cost Per Query**: $0.0005 - $0.0015
- **Monthly Cost**: $0.05 - $0.30 for typical usage
- **Budget Buffer**: Set 2-3x expected usage

### Usage Monitoring
- **Track Queries**: Monitor query count and patterns
- **Analyze Costs**: Review cost per query trends
- **Optimize Usage**: Use specific questions to reduce tokens
- **Set Alerts**: Enable budget warning notifications

## Support

### Getting Help
- **Documentation**: Check this guide and inline help
- **Console Logs**: Review browser console for errors
- **Network Tab**: Monitor API calls in dev tools
- **Cost Display**: Verify usage and budget status

### Contact
- **Issues**: Report bugs via GitHub issues
- **Questions**: Check documentation first
- **Support**: Contact development team for assistance
