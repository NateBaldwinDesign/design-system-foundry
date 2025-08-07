import { GitHubApiService } from './githubApi';
import type { DataSourceContext } from './dataSourceManager';

export interface GitHubRelease {
  id: number;
  name: string;
  tag_name: string;
  published_at: string;
  html_url: string;
  body?: string;
}

export interface GitHubCommit {
  sha: string;
  commit: {
    message: string;
    author: {
      name: string;
      email: string;
      date: string;
    };
  };
  html_url: string;
}

export interface GitHubAnalyticsData {
  releases: GitHubRelease[];
  commits: GitHubCommit[];
  sourceName: string;
  repositoryUrl: string;
}

export class GitHubAnalyticsService {
  private static instance: GitHubAnalyticsService;
  private cache = new Map<string, { data: GitHubAnalyticsData; timestamp: number }>();
  private CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  static getInstance(): GitHubAnalyticsService {
    if (!GitHubAnalyticsService.instance) {
      GitHubAnalyticsService.instance = new GitHubAnalyticsService();
    }
    return GitHubAnalyticsService.instance;
  }

  async getCachedGitHubAnalytics(dataSourceContext: DataSourceContext, systemName: string): Promise<GitHubAnalyticsData | null> {
    // Determine the target repository based on data source context
    let targetRepository: { fullName: string; branch: string } | null = null;
    let sourceName: string;

    if (dataSourceContext.editMode.isActive) {
      // Edit mode: use the edit target repository
      const { editMode } = dataSourceContext;
      if (editMode.targetRepository) {
        targetRepository = {
          fullName: editMode.targetRepository.fullName,
          branch: editMode.targetRepository.branch
        };
        
        // Determine source name based on edit mode
        if (editMode.sourceType === 'platform-extension' && editMode.sourceId) {
          const platform = dataSourceContext.availablePlatforms.find(p => p.id === editMode.sourceId);
          sourceName = `${systemName} - ${platform?.displayName || editMode.sourceId}`;
        } else if (editMode.sourceType === 'theme-override' && editMode.sourceId) {
          const theme = dataSourceContext.availableThemes.find(t => t.id === editMode.sourceId);
          sourceName = `${systemName} - ${theme?.displayName || editMode.sourceId}`;
        } else {
          sourceName = `${systemName} (core)`;
        }
      } else {
        return null;
      }
    } else {
      // View mode: use current platform/theme selection
      if (dataSourceContext.currentPlatform && dataSourceContext.currentPlatform !== 'none') {
        const platform = dataSourceContext.availablePlatforms.find(p => p.id === dataSourceContext.currentPlatform);
        const platformRepo = dataSourceContext.repositories.platforms[dataSourceContext.currentPlatform];
        if (platformRepo) {
          targetRepository = {
            fullName: platformRepo.fullName,
            branch: platformRepo.branch
          };
          sourceName = `${systemName} - ${platform?.displayName || dataSourceContext.currentPlatform}`;
        } else {
          return null;
        }
      } else if (dataSourceContext.currentTheme && dataSourceContext.currentTheme !== 'none') {
        const theme = dataSourceContext.availableThemes.find(t => t.id === dataSourceContext.currentTheme);
        const themeRepo = dataSourceContext.repositories.themes[dataSourceContext.currentTheme];
        if (themeRepo) {
          targetRepository = {
            fullName: themeRepo.fullName,
            branch: themeRepo.branch
          };
          sourceName = `${systemName} - ${theme?.displayName || dataSourceContext.currentTheme}`;
        } else {
          return null;
        }
      } else {
        // Core data
        const coreRepo = dataSourceContext.repositories.core;
        if (coreRepo) {
          targetRepository = {
            fullName: coreRepo.fullName,
            branch: coreRepo.branch
          };
          sourceName = `${systemName} (core)`;
        } else {
          return null;
        }
      }
    }

    if (!targetRepository) {
      return null;
    }

    // Create cache key
    const cacheKey = `github-analytics-${targetRepository.fullName}-${targetRepository.branch}`;
    
    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return {
        ...cached.data,
        sourceName // Update source name in case it changed
      };
    }

    try {
      const analytics = await this.fetchGitHubAnalytics(targetRepository);
      
      // Cache the result
      this.cache.set(cacheKey, { 
        data: { ...analytics, sourceName }, 
        timestamp: Date.now() 
      });
      
      return { ...analytics, sourceName };
    } catch (error) {
      console.error('Failed to fetch GitHub analytics:', error);
      return null;
    }
  }

  private async fetchGitHubAnalytics(repository: { fullName: string; branch: string }): Promise<Omit<GitHubAnalyticsData, 'sourceName'>> {
    const [releases, commits] = await Promise.all([
      this.fetchReleases(repository.fullName),
      this.fetchCommits(repository.fullName, repository.branch)
    ]);

    return {
      releases,
      commits,
      repositoryUrl: `https://github.com/${repository.fullName}`
    };
  }

  private async fetchReleases(repositoryFullName: string): Promise<GitHubRelease[]> {
    try {
      const response = await fetch(`https://api.github.com/repos/${repositoryFullName}/releases?per_page=10&page=1`);
      
      if (!response.ok) {
        if (response.status === 404) {
          return []; // No releases found
        }
        throw new Error(`Failed to fetch releases: ${response.status} ${response.statusText}`);
      }
      
      const releases = await response.json();
      return releases.map((release: any) => ({
        id: release.id,
        name: release.name || release.tag_name,
        tag_name: release.tag_name,
        published_at: release.published_at,
        html_url: release.html_url,
        body: release.body
      }));
    } catch (error) {
      console.error('Error fetching releases:', error);
      return [];
    }
  }

  private async fetchCommits(repositoryFullName: string, branch: string): Promise<GitHubCommit[]> {
    try {
      const response = await fetch(`https://api.github.com/repos/${repositoryFullName}/commits?sha=${branch}&per_page=10&page=1`);
      
      if (!response.ok) {
        if (response.status === 404) {
          return []; // No commits found
        }
        throw new Error(`Failed to fetch commits: ${response.status} ${response.statusText}`);
      }
      
      const commits = await response.json();
      return commits.map((commit: any) => ({
        sha: commit.sha,
        commit: {
          message: commit.commit.message,
          author: {
            name: commit.commit.author.name,
            email: commit.commit.author.email,
            date: commit.commit.author.date
          }
        },
        html_url: commit.html_url
      }));
    } catch (error) {
      console.error('Error fetching commits:', error);
      return [];
    }
  }

  clearCache(): void {
    this.cache.clear();
  }

  clearCacheForRepository(repositoryFullName: string): void {
    for (const [key] of this.cache) {
      if (key.includes(repositoryFullName)) {
        this.cache.delete(key);
      }
    }
  }
} 