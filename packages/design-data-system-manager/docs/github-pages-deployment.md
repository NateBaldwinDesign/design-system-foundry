# GitHub Pages Deployment Guide

## Overview

This guide explains how to deploy the token-model design system application to GitHub Pages while maintaining full functionality of the Gemini AI integration.

## Why .env Files Don't Work on GitHub Pages

GitHub Pages serves static files only, which means:

1. **No Server-Side Environment Variables**: Environment variables are only available during build time, not at runtime
2. **Public Repository**: Any `.env` files in the repo would be publicly visible (security risk)
3. **Static Hosting**: No server-side processing to inject environment variables

## Solution: Runtime API Key Configuration

The application has been designed to work with GitHub Pages by implementing a **runtime API key configuration system**:

### How It Works

1. **Multiple Key Sources**: The app checks for API keys in this order:
   - Environment variables (for development)
   - Window object (for runtime injection)
   - localStorage (for user-provided keys)

2. **User-Friendly Configuration**: Users can configure their API key directly in the browser
3. **Secure Storage**: API keys are stored locally in the user's browser
4. **No Server Required**: Works entirely client-side

## Deployment Options

### Option 1: Direct GitHub Pages Deployment (Recommended)

#### Prerequisites
- GitHub repository with the token-model project
- GitHub Pages enabled on your repository

#### Steps

1. **Push Code to GitHub**:
   ```bash
   git add .
   git commit -m "Add Gemini AI integration with GitHub Pages support"
   git push origin main
   ```

2. **Enable GitHub Pages**:
   - Go to your repository → Settings → Pages
   - Source: Deploy from a branch
   - Branch: `main` (or your preferred branch)
   - Folder: `/docs` or `/dist`

3. **Configure Build Output**:
   - If using `/docs`: Update `vite.config.ts` to output to `docs/`
   - If using `/dist`: Configure GitHub Actions to deploy from `dist/`

4. **Users Configure API Keys**:
   - Users visit your deployed site
   - Navigate to "AI Assistant" section
   - Follow the API key configuration prompts
   - Enter their Gemini API key from [Google AI Studio](https://makersuite.google.com/app/apikey)

### Option 2: GitHub Actions Deployment

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: |
        npm install -g pnpm
        pnpm install
    
    - name: Build application
      run: |
        cd packages/design-data-system-manager
        pnpm run build
    
    - name: Deploy to GitHub Pages
      uses: peaceiris/actions-gh-pages@v3
      with:
        github_token: ${{ secrets.GITHUB_TOKEN }}
        publish_dir: ./packages/design-data-system-manager/dist
```

## User Experience

### For End Users

1. **First Visit**: Users see a configuration screen in the AI Assistant section
2. **API Key Setup**: Users enter their Gemini API key (stored locally)
3. **Ready to Use**: AI Assistant becomes fully functional
4. **Security**: API key never leaves the user's browser

### Configuration Flow

```
User visits site → AI Assistant section → API key config → Enter key → Save → Ready to use
```

## Security Considerations

### What's Secure
- ✅ API keys stored only in user's browser localStorage
- ✅ No server-side storage of sensitive data
- ✅ Keys never transmitted to your servers
- ✅ Users control their own API usage and costs

### What to Consider
- ⚠️ API keys visible in browser dev tools (localStorage)
- ⚠️ Users responsible for their own API usage limits
- ⚠️ No centralized cost management

## Development vs Production

### Development (Local)
```bash
# Create .env.local for development
echo "VITE_GEMINI_API_KEY=your-key-here" > .env.local
npm run dev
```

### Production (GitHub Pages)
- No `.env` files needed
- Users configure keys at runtime
- Works immediately after deployment

## Troubleshooting

### Common Issues

1. **"API Key Not Found" Error**:
   - User needs to configure their API key in the AI Assistant section
   - Guide them to the configuration screen

2. **"Invalid API Key" Warning**:
   - Check that the key starts with "AIza"
   - Verify the key is from Google AI Studio

3. **Build Failures**:
   - Ensure all dependencies are installed
   - Check for TypeScript errors
   - Verify Vite configuration

### Debug Steps

1. **Check Browser Console**:
   - Look for API key configuration errors
   - Verify localStorage has the key

2. **Test API Key**:
   - Use the key in Google AI Studio to verify it works
   - Check API quotas and limits

3. **Network Issues**:
   - Verify CORS settings
   - Check if Gemini API is accessible

## Best Practices

### For Developers
- Test the runtime configuration flow thoroughly
- Provide clear error messages for users
- Document the API key setup process

### For Users
- Keep API keys secure and private
- Monitor usage to avoid unexpected costs
- Use environment-specific keys (dev vs prod)

## Alternative Solutions

### If Runtime Configuration Isn't Preferred

1. **GitHub Secrets + Actions**: Use GitHub repository secrets in CI/CD
2. **External Configuration Service**: Use a service like Firebase Config
3. **Proxy Server**: Set up a simple proxy to handle API calls
4. **Client-Side Only**: Remove AI features for static deployment

## Conclusion

The runtime API key configuration approach provides the best balance of:
- ✅ Full functionality on GitHub Pages
- ✅ User privacy and security
- ✅ No server infrastructure required
- ✅ Cost control for users
- ✅ Easy deployment and maintenance

This solution ensures that your token-model application can be deployed as a static site while maintaining all AI assistant capabilities.
