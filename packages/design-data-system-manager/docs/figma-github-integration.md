# Figma GitHub Integration

## Overview

The Figma integration now supports automatic saving of mapping data to GitHub repositories. When you publish tokens to Figma, the `tempToRealIds` mapping (which maps temporary token IDs to real Figma variable IDs) is automatically saved to your GitHub repository in the `.figma/mappings/{fileKey}.json` file.

## How It Works

### 1. Publishing Workflow

When you publish tokens to Figma through the web app:

1. **Token Transformation**: Tokens are transformed to Figma Variables API format
2. **Figma API Call**: The transformed data is sent to Figma's Variables API
3. **Response Processing**: Figma returns the created/updated variables with real IDs
4. **Mapping Extraction**: The `tempToRealIds` mapping is extracted from the API response
5. **GitHub Save**: The mapping is automatically saved to your GitHub repository

### 2. File Structure

The mapping data is saved to:
```
your-repository/
├── .figma/
│   ├── mappings/
│   │   └── {fileKey}.json    # Figma mapping data
│   ├── cache/
│   └── config/
└── design-system.json
```

### 3. Mapping File Format

Each mapping file contains:

```json
{
  "fileKey": "figma-file-id",
  "systemId": "your-system-id",
  "lastUpdated": "2024-01-15T10:30:00.000Z",
  "tempToRealId": {
    "token-123": "VariableID:456:789",
    "collection-abc": "VariableCollectionID:123:456"
  },
  "metadata": {
    "figmaFileName": "Design System",
    "exportVersion": "1.0.0",
    "lastExport": "2024-01-15T10:30:00.000Z"
  },
  "repositoryContext": {
    "owner": "your-username",
    "repo": "your-repository",
    "type": "core",
    "systemId": "your-system-id"
  }
}
```

## Benefits

### 1. **Version Control**
- Mapping data is version controlled with your design system
- Track changes to Figma variable mappings over time
- Collaborate with team members on mapping updates

### 2. **Persistence**
- Mappings persist across different machines and sessions
- No need to re-export all tokens when switching devices
- Maintains mapping history for debugging and rollbacks

### 3. **Team Collaboration**
- All team members can access the same mapping data
- Prevents conflicts when multiple people work on the same Figma file
- Shared understanding of token-to-variable relationships

### 4. **Incremental Updates**
- Only new or changed tokens are updated in Figma
- Existing variables are updated rather than recreated
- Faster publishing and reduced API usage

## Requirements

### 1. **GitHub Repository**
- Must have a GitHub repository loaded in the web app
- Repository must be accessible with your GitHub token
- Repository should contain your design system data

### 2. **GitHub Authentication**
- Valid GitHub access token with repository write permissions
- Token must have access to the target repository

### 3. **Figma Access**
- Valid Figma access token
- Access to the target Figma file

## Error Handling

The system provides detailed error messages for common issues:

### GitHub Authentication Errors
- **401 Unauthorized**: Check your GitHub access token
- **403 Forbidden**: Verify repository permissions
- **404 Not Found**: Check repository name and access

### Figma API Errors
- **401 Unauthorized**: Check your Figma access token
- **403 Forbidden**: Verify file permissions
- **404 Not Found**: Check file ID and access

### Mapping Save Errors
- **409 Conflict**: File was modified by another user
- **Network Errors**: Check internet connection
- **Storage Errors**: Check localStorage quota

## Usage

### 1. **Automatic Integration**
The GitHub integration works automatically when you:
- Have a GitHub repository loaded
- Publish tokens to Figma through the web app
- Have valid GitHub and Figma access tokens

### 2. **Manual Testing**
You can test the GitHub connection:

```typescript
// Test GitHub connection
const testResult = await FigmaMappingService.testGitHubConnection();
console.log(testResult.message);

// Check if GitHub integration is available
const isAvailable = FigmaMappingService.isGitHubIntegrationAvailable();
```

### 3. **Manual Mapping Management**
You can manually save mappings:

```typescript
// Save mapping to GitHub
const repoInfo = FigmaMappingService.getCurrentRepositoryInfo();
if (repoInfo) {
  await FigmaMappingService.saveMapping(fileKey, mappingData, repoInfo);
}
```

## Troubleshooting

### Mapping Not Saved
1. Check if a GitHub repository is loaded
2. Verify GitHub authentication
3. Check repository permissions
4. Review browser console for error messages

### Mapping Conflicts
1. Pull latest changes from GitHub
2. Re-export tokens to refresh mappings
3. Resolve any merge conflicts manually

### Performance Issues
1. Check network connection
2. Verify GitHub API rate limits
3. Consider reducing token batch size

## Future Enhancements

### Planned Features
- **Mapping Visualization**: View and edit mappings in the web app
- **Conflict Resolution**: Automatic conflict detection and resolution
- **Bulk Operations**: Import/export multiple mapping files
- **Mapping Validation**: Validate mappings against current token system

### Integration Improvements
- **Real-time Sync**: Automatic mapping synchronization
- **Webhook Support**: GitHub webhooks for automatic updates
- **Branch Support**: Support for different Git branches
- **Multi-repo Support**: Support for multiple repositories per system

## Technical Details

### API Endpoints Used
- **GitHub API**: `PUT /repos/{owner}/{repo}/contents/{path}`
- **Figma API**: `POST /v1/files/{file_key}/variables`

### File Operations
- **Create**: New mapping files are created with `.gitkeep` files
- **Update**: Existing mapping files are updated with new data
- **Merge**: Local and remote mappings are merged automatically

### Security Considerations
- Access tokens are stored securely in browser storage
- Repository access is validated before operations
- File permissions are checked before writing
- Error messages don't expose sensitive information 