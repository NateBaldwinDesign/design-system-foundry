import type { GitHubUser, GitHubRepo } from '../config/github';

export class SecureStorage {
  private static readonly TOKEN_KEY = 'github_token_encrypted';
  private static readonly USER_KEY = 'github_user';
  private static readonly REPO_KEY = 'github_repo';
  
  /**
   * Simple encryption using base64 encoding (not truly secure but better than plaintext)
   * In production, consider using Web Crypto API for proper encryption
   */
  private static encryptToken(token: string): string {
    return btoa(token);
  }
  
  private static decryptToken(encryptedToken: string): string {
    return atob(encryptedToken);
  }
  
  static storeGitHubToken(token: string): void {
    try {
      const encrypted = this.encryptToken(token);
      localStorage.setItem(this.TOKEN_KEY, encrypted);
    } catch (error) {
      console.error('Failed to store GitHub token:', error);
      // Note: toast will be handled by the calling component
    }
  }
  
  static getGitHubToken(): string | null {
    try {
      const encrypted = localStorage.getItem(this.TOKEN_KEY);
      return encrypted ? this.decryptToken(encrypted) : null;
    } catch (error) {
      console.error('Failed to retrieve GitHub token:', error);
      return null;
    }
  }
  
  static clearGitHubToken(): void {
    localStorage.removeItem(this.TOKEN_KEY);
  }
  
  static storeGitHubUser(user: GitHubUser): void {
    try {
      localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    } catch (error) {
      console.error('Failed to store GitHub user:', error);
    }
  }
  
  static getGitHubUser(): GitHubUser | null {
    try {
      const user = localStorage.getItem(this.USER_KEY);
      return user ? JSON.parse(user) : null;
    } catch (error) {
      console.error('Failed to retrieve GitHub user:', error);
      return null;
    }
  }
  
  static clearGitHubUser(): void {
    localStorage.removeItem(this.USER_KEY);
  }
  
  static storeSelectedRepo(repo: GitHubRepo): void {
    try {
      localStorage.setItem(this.REPO_KEY, JSON.stringify(repo));
    } catch (error) {
      console.error('Failed to store selected repo:', error);
    }
  }
  
  static getSelectedRepo(): GitHubRepo | null {
    try {
      const repo = localStorage.getItem(this.REPO_KEY);
      return repo ? JSON.parse(repo) : null;
    } catch (error) {
      console.error('Failed to retrieve selected repo:', error);
      return null;
    }
  }
  
  static clearSelectedRepo(): void {
    localStorage.removeItem(this.REPO_KEY);
  }
  
  static clearAllGitHubData(): void {
    this.clearGitHubToken();
    this.clearGitHubUser();
    this.clearSelectedRepo();
  }
} 