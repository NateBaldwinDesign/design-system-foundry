# GitHub Pages Deployment

This package is configured for automated deployment to GitHub Pages with a custom domain.

## Deployment Setup

### Prerequisites
- GitHub repository with GitHub Pages enabled
- Custom domain configured: `designsystemfoundry.com`
- DNS records properly configured to point to GitHub Pages

### DNS Configuration Required
For the custom domain `designsystemfoundry.com` to work with GitHub Pages, you need to configure DNS records:

1. **A Records** (point to GitHub Pages IPs):
   ```
   designsystemfoundry.com → 185.199.108.153
   designsystemfoundry.com → 185.199.109.153
   designsystemfoundry.com → 185.199.110.153
   designsystemfoundry.com → 185.199.111.153
   ```

2. **CNAME Record** (if using www subdomain):
   ```
   www.designsystemfoundry.com → designsystemfoundry.com
   ```

### Automated Deployment
The app is automatically deployed to GitHub Pages when changes are pushed to the `main` branch via GitHub Actions.

### Manual Deployment
To deploy manually:

```bash
# Install dependencies (if not already done)
pnpm install

# Deploy to GitHub Pages
pnpm run deploy

# Or deploy without pushing (preview mode)
pnpm run deploy:preview
```

## Configuration

### Package.json Scripts
- `deploy`: Builds the app and deploys to GitHub Pages
- `deploy:preview`: Builds the app and prepares for deployment without pushing

### Vite Configuration
- Base path is set to `/` for custom domain deployment
- Assets are optimized and chunked for better performance
- Source maps are disabled for production

### GitHub Actions
The workflow automatically:
1. Sets up Node.js and pnpm
2. Installs dependencies
3. Builds the application
4. Deploys to GitHub Pages (only on main branch)

## Accessing the Deployed App

The app will be available at: `https://designsystemfoundry.com`

## Troubleshooting

### Build Issues
- Ensure all dependencies are installed: `pnpm install`
- Check for TypeScript errors: `pnpm run lint`
- Verify the build works locally: `pnpm run build`

### Deployment Issues
- Check GitHub Actions logs for build errors
- Ensure the repository has GitHub Pages enabled
- Verify the `GITHUB_TOKEN` secret is available

### DNS Issues
- Verify DNS records are properly configured
- Check that the domain resolves to GitHub Pages servers
- Ensure the CNAME file in the repository contains `designsystemfoundry.com`

### Routing Issues
- The app uses React Router with HashRouter for GitHub Pages compatibility
- All routes should work correctly with the root base path `/` 