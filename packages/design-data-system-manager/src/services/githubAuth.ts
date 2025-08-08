import { GITHUB_CONFIG } from '../config/github';
import type { GitHubUser } from '../config/github';
import { SecureStorage } from './secureStorage';

export class GitHubAuthService {
  private static refreshInProgress = false;
  private static refreshTokenInterval: NodeJS.Timeout | null = null;
  
  /**
   * Generate a random state parameter for CSRF protection
   */
  private static generateState(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }
  
  /**
   * Generate a random code verifier for PKCE
   */
  private static generateCodeVerifier(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return btoa(String.fromCharCode(...array))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }
  
  /**
   * Generate code challenge from code verifier
   */
  private static async generateCodeChallenge(verifier: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode(...new Uint8Array(digest)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }
  
  /**
   * Initiate GitHub OAuth flow with PKCE
   */
  static async initiateAuth(): Promise<void> {
    const state = this.generateState();
    const codeVerifier = this.generateCodeVerifier();
    const codeChallenge = await this.generateCodeChallenge(codeVerifier);
    
    // Store state and code verifier in localStorage for verification
    localStorage.setItem('github_oauth_state', state);
    localStorage.setItem('github_oauth_code_verifier', codeVerifier);
    
    // Store current URL parameters to restore after authentication
    const currentUrlParams = new URLSearchParams(window.location.search);
    const urlContext = {
      repo: currentUrlParams.get('repo'),
      branch: currentUrlParams.get('branch'),
      path: currentUrlParams.get('path'),
      platform: currentUrlParams.get('platform'),
      theme: currentUrlParams.get('theme')
    };
    
    // Only store if we have meaningful URL parameters (not just callback params)
    if (urlContext.repo || urlContext.platform || urlContext.theme) {
      localStorage.setItem('github_oauth_original_url_context', JSON.stringify(urlContext));
      console.log('[GitHubAuthService] Storing original URL context for OAuth flow:', urlContext);
    }
    
    const params = new URLSearchParams({
      client_id: GITHUB_CONFIG.clientId,
      redirect_uri: GITHUB_CONFIG.redirectUri,
      scope: GITHUB_CONFIG.scope,
      state: state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256'
    });
    
    window.location.href = `${GITHUB_CONFIG.authUrl}?${params}`;
  }
  
  /**
   * Handle OAuth callback and exchange code for access token using PKCE
   */
  static async handleCallback(code: string, state: string): Promise<GitHubUser> {
    // Verify state parameter
    const storedState = localStorage.getItem('github_oauth_state');
    const codeVerifier = localStorage.getItem('github_oauth_code_verifier');
    
    // Add more detailed logging for debugging
    console.log('OAuth callback - Received state:', state);
    console.log('OAuth callback - Stored state:', storedState);
    console.log('OAuth callback - Code verifier exists:', !!codeVerifier);
    
    if (!storedState) {
      throw new Error('No stored state parameter found. The OAuth flow may have been interrupted.');
    }
    
    if (!codeVerifier) {
      throw new Error('No stored code verifier found. The OAuth flow may have been interrupted.');
    }
    
    if (state !== storedState) {
      console.error('State mismatch - Received:', state, 'Stored:', storedState);
      throw new Error('Invalid state parameter - possible CSRF attack or OAuth flow interruption');
    }
    
    // Clear state and code verifier from localStorage
    localStorage.removeItem('github_oauth_state');
    localStorage.removeItem('github_oauth_code_verifier');
    
    try {
      // Exchange code for access token using PKCE
      const token = await this.exchangeCodeForTokenWithPKCE(code, codeVerifier);
      SecureStorage.storeGitHubToken(token);
      
      // Get user information
      const user = await this.fetchCurrentUser(token);
      SecureStorage.storeGitHubUser(user);
      
      // Start token refresh monitoring
      this.startTokenRefreshMonitor();
      
      return user;
    } catch (error) {
      console.error('Failed to handle OAuth callback:', error);
      throw error;
    }
  }
  
  /**
   * Exchange authorization code for access token using PKCE
   */
  private static async exchangeCodeForTokenWithPKCE(code: string, codeVerifier: string): Promise<string> {
    // Use Vite dev server proxy to avoid CORS issues
    const tokenUrl = '/api/github/token';
    
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: GITHUB_CONFIG.clientId,
        client_secret: GITHUB_CONFIG.clientSecret,
        code: code,
        redirect_uri: GITHUB_CONFIG.redirectUri,
        code_verifier: codeVerifier,
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Token exchange failed:', response.status, errorText);
      throw new Error(`Failed to get access token: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (data.error) {
      throw new Error(`OAuth error: ${data.error_description || data.error}`);
    }
    
    return data.access_token;
  }
  
  /**
   * Exchange authorization code for access token (legacy method)
   */
  private static async exchangeCodeForToken(code: string): Promise<string> {
    const response = await fetch(GITHUB_CONFIG.tokenUrl, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: GITHUB_CONFIG.clientId,
        client_secret: GITHUB_CONFIG.clientSecret,
        code: code,
        redirect_uri: GITHUB_CONFIG.redirectUri,
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to get access token: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (data.error) {
      throw new Error(`OAuth error: ${data.error_description || data.error}`);
    }
    
    return data.access_token;
  }
  
  /**
   * Get current user information
   */
  private static async fetchCurrentUser(accessToken: string): Promise<GitHubUser> {
    const response = await fetch(`${GITHUB_CONFIG.apiBaseUrl}/user`, {
      headers: {
        'Authorization': `token ${accessToken}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`Failed to get user info: ${response.statusText}`);
    }
    
    return response.json();
  }
  
  /**
   * Check if there are any stale OAuth state parameters
   */
  static hasStaleOAuthState(): boolean {
    return localStorage.getItem('github_oauth_state') !== null;
  }
  
  /**
   * Check if user is authenticated
   */
  static isAuthenticated(): boolean {
    return SecureStorage.getGitHubToken() !== null;
  }
  
  /**
   * Get current user
   */
  static getCurrentUser(): GitHubUser | null {
    return SecureStorage.getGitHubUser();
  }
  
  /**
   * Clear any stale OAuth state parameters
   */
  static clearOAuthState(): void {
    localStorage.removeItem('github_oauth_state');
    localStorage.removeItem('github_oauth_code_verifier');
    localStorage.removeItem('github_oauth_original_url_context');
  }
  
  /**
   * Logout user
   */
  static logout(): void {
    SecureStorage.clearAllGitHubData();
    this.clearOAuthState();
    this.stopTokenRefreshMonitor();
  }
  
  /**
   * Start monitoring token refresh
   */
  static startTokenRefreshMonitor(): void {
    // Check token every 30 minutes
    this.refreshTokenInterval = setInterval(() => {
      this.handleTokenRefresh();
    }, 30 * 60 * 1000);
  }
  
  /**
   * Stop monitoring token refresh
   */
  static stopTokenRefreshMonitor(): void {
    if (this.refreshTokenInterval) {
      clearInterval(this.refreshTokenInterval);
      this.refreshTokenInterval = null;
    }
  }
  
  /**
   * Handle token refresh with notification
   */
  static async handleTokenRefresh(): Promise<void> {
    if (this.refreshInProgress) {
      return;
    }
    
    this.refreshInProgress = true;
    
    try {
      const token = SecureStorage.getGitHubToken();
      if (!token) {
        return;
      }
      
      // For now, we'll just check if the token is still valid
      // GitHub OAuth tokens don't expire unless revoked
      const user = await this.fetchCurrentUser(token);
      SecureStorage.storeGitHubUser(user);
      
    } catch (error) {
      console.error('Token refresh failed:', error);
      // Token is invalid, require re-authentication
      this.logout();
    } finally {
      this.refreshInProgress = false;
    }
  }
  
  /**
   * Get a valid access token, refreshing if necessary
   */
  static async getValidAccessToken(): Promise<string> {
    const token = SecureStorage.getGitHubToken();
    if (!token) {
      throw new Error('No GitHub token available');
    }
    
    try {
      // Test if token is still valid
      await this.fetchCurrentUser(token);
      return token;
    } catch (error) {
      // Token is invalid, require re-authentication
      this.logout();
      throw new Error('GitHub token is invalid - please re-authenticate');
    }
  }
} 