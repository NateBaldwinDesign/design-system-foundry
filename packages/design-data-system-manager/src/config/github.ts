export const GITHUB_CONFIG = {
  clientId: 'Ov23li4XeOJKztYd3mkd',
  clientSecret: '656ec47fd3d79e8d5e22af6e8b75322032fa3b92',
  redirectUri: process.env.NODE_ENV === 'production' 
    ? 'https://designsystemfoundry.com/auth/github/callback'
    : 'http://localhost:4001/auth/github/callback',
  scope: 'repo', // Full repository access
  apiBaseUrl: 'https://api.github.com',
  authUrl: 'https://github.com/login/oauth/authorize',
  tokenUrl: 'https://github.com/login/oauth/access_token',
} as const;

export interface GitHubUser {
  id: number;
  login: string;
  name: string;
  email: string;
  avatar_url: string;
}

export interface GitHubOrganization {
  id: number;
  login: string;
  name: string;
  avatar_url: string;
  type: 'Organization' | 'User';
}

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  default_branch: string;
  updated_at: string;
}

export interface GitHubBranch {
  name: string;
  commit: {
    sha: string;
    url: string;
  };
  protected: boolean;
}

export interface GitHubFile {
  name: string;
  path: string;
  content: string;
  sha: string;
  size: number;
  encoding: string;
  url: string;
  html_url: string;
  git_url: string;
  download_url: string;
  type: string;
  _links: {
    self: string;
    git: string;
    html: string;
  };
}

export interface GitHubPR {
  id: number;
  number: number;
  title: string;
  body: string;
  state: string;
  html_url: string;
  head: {
    ref: string;
    sha: string;
  };
  base: {
    ref: string;
    sha: string;
  };
} 