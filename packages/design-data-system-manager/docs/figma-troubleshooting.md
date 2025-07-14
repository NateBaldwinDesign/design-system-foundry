# Figma API Troubleshooting Guide

## Common Error: 403 Invalid Token

### Problem
```
POST https://api.figma.com/v1/files/{fileKey}/variables 403 (Forbidden)
{"status":403,"error":true,"message":"Invalid token"}
```

### Solutions

#### 1. Check Access Token Format
- **Length**: Should be 64 characters
- **Prefix**: Must start with `figd_`

#### 2. Verify Token Permissions
Your Figma access token needs the following scopes:
- `files:read` - To read file data
- `files:write` - To create/update variables

**To check/create a token with proper permissions:**

1. Go to [Figma Account Settings](https://www.figma.com/settings)
2. Navigate to "Personal access tokens"
3. Click "Create new token"
4. Give it a descriptive name (e.g., "Design System Export")
5. **Important**: Make sure to select both `files:read` and `files:write` scopes
6. Copy the generated token (it starts with `figd_`)

#### 3. Verify File Access
- Ensure you have access to the Figma file
- The file key should be from a file you own or have edit permissions for
- File key format: `yTy5ytxeFPRiGou5Poed8a` (alphanumeric, no special characters)

#### 4. Test Token Manually
Use the "Test Token" button in the Figma Export Settings to verify your token works before attempting export.

## Other Common Errors

### 404 File Not Found
```
Figma API error: 404 - File not found
```

**Solutions:**
- Check the file key is correct
- Ensure you have access to the file
- Verify the file exists and hasn't been deleted

### 400 Bad Request
```
Figma API error: 400 - Invalid request
```

**Solutions:**
- Check that the file key is valid
- Ensure the access token is properly formatted
- Verify the request payload structure

### Network Errors
```
Network error occurred
```

**Solutions:**
- Check your internet connection
- Try again in a few minutes
- Check if Figma API is experiencing issues

## Step-by-Step Troubleshooting

### Step 1: Validate Your Token
1. Go to [Figma Account Settings](https://www.figma.com/settings)
2. Check if your token exists and has proper scopes
3. If not, create a new token with `files:read` and `files:write` permissions

### Step 2: Test File Access
1. Open the Figma file in your browser
2. Copy the file key from the URL: `https://www.figma.com/file/{fileKey}/...`
3. Use the "Test Token" button to verify access

### Step 3: Check File Permissions
1. Ensure you're the owner or have edit permissions
2. If it's a team file, make sure you have the right role
3. Try with a file you own to test

### Step 4: Verify Token in App
1. Clear any existing token in the app
2. Paste the new token carefully (no extra spaces)
3. Test the connection before exporting

## Token Security Best Practices

### 1. Use Environment Variables
Store your token securely:
```bash
# In your environment
export FIGMA_ACCESS_TOKEN="figd_your_token_here"
```

### 2. Rotate Tokens Regularly
- Create new tokens periodically
- Delete old unused tokens
- Monitor token usage

### 3. Limit Token Scope
- Only grant necessary permissions
- Use different tokens for different purposes
- Never share tokens publicly

## Getting Help

### 1. Check Figma API Status
- Visit [Figma API Status Page](https://status.figma.com/)
- Check for any ongoing issues

### 2. Verify API Documentation
- Review [Figma Variables API Documentation](https://www.figma.com/developers/api#variables)
- Ensure you're using the correct endpoints

### 3. Test with Simple Request
Try a simple GET request to test your token:
```bash
curl -H "X-Figma-Token: YOUR_TOKEN" \
     "https://api.figma.com/v1/files/YOUR_FILE_KEY"
```

### 4. Contact Support
If issues persist:
- Check Figma Community forums
- Contact Figma support for API issues
- Review the application logs for detailed error information

## Debug Information

When reporting issues, include:
1. **Error Message**: The exact error from the console
2. **Token Format**: First eight characters 
3. **File Key**: The file key you're trying to access
4. **Steps**: What you did before the error occurred
5. **Browser**: Browser and version you're using
6. **Network**: Any network restrictions or proxies

## Quick Fix Checklist

- [ ] Token starts with `figd_`
- [ ] Token is 64 characters long
- [ ] Token has `files:read` and `files:write` scopes
- [ ] File key is correct and accessible
- [ ] You have edit permissions on the file
- [ ] No extra spaces in token or file key
- [ ] Internet connection is stable
- [ ] Figma API is operational 