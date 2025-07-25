import { GitHubApiService } from './githubApi';
import { GitHubAuthService } from './githubAuth';

export interface ExportFormat {
  id: string;
  name: string;
  extension: string;
  mimeType: string;
  description: string;
}

export interface ExportTarget {
  platformId: string;
  platformName: string;
  format: ExportFormat;
  includeComments: boolean;
  includeMetadata: boolean;
  minify: boolean;
  customSettings?: Record<string, unknown>;
}

export interface BatchExportJob {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  targets: ExportTarget[];
  progress: {
    current: number;
    total: number;
    currentTarget?: string;
  };
  results: Array<{
    target: ExportTarget;
    success: boolean;
    fileUrl?: string;
    error?: string;
    size?: number;
  }>;
  createdAt: string;
  completedAt?: string;
  error?: string;
}

export interface ExportSettings {
  repositoryUri: string;
  branch: string;
  commitMessage: string;
  createPullRequest: boolean;
  pullRequestTitle?: string;
  pullRequestBody?: string;
}

export class EnhancedExportService {
  private static instance: EnhancedExportService;
  private activeJobs: Map<string, BatchExportJob> = new Map();
  private supportedFormats: ExportFormat[] = [
    {
      id: 'json',
      name: 'JSON',
      extension: '.json',
      mimeType: 'application/json',
      description: 'Standard JSON format'
    },
    {
      id: 'css',
      name: 'CSS Variables',
      extension: '.css',
      mimeType: 'text/css',
      description: 'CSS custom properties'
    },
    {
      id: 'scss',
      name: 'SCSS Variables',
      extension: '.scss',
      mimeType: 'text/x-scss',
      description: 'SCSS variables'
    },
    {
      id: 'typescript',
      name: 'TypeScript',
      extension: '.ts',
      mimeType: 'application/typescript',
      description: 'TypeScript constants'
    },
    {
      id: 'swift',
      name: 'Swift',
      extension: '.swift',
      mimeType: 'text/x-swift',
      description: 'Swift constants'
    },
    {
      id: 'kotlin',
      name: 'Kotlin',
      extension: '.kt',
      mimeType: 'text/x-kotlin',
      description: 'Kotlin constants'
    }
  ];

  private constructor() {}

  static getInstance(): EnhancedExportService {
    if (!EnhancedExportService.instance) {
      EnhancedExportService.instance = new EnhancedExportService();
    }
    return EnhancedExportService.instance;
  }

  /**
   * Get supported export formats
   */
  getSupportedFormats(): ExportFormat[] {
    return [...this.supportedFormats];
  }

  /**
   * Create a new batch export job
   */
  async createBatchExport(
    targets: ExportTarget[],
    data: unknown,
    settings: ExportSettings
  ): Promise<BatchExportJob> {
    const jobId = this.generateJobId();
    
    const job: BatchExportJob = {
      id: jobId,
      status: 'pending',
      targets,
      progress: {
        current: 0,
        total: targets.length
      },
      results: [],
      createdAt: new Date().toISOString()
    };

    this.activeJobs.set(jobId, job);

    // Start processing in background
    this.processBatchExport(jobId, data, settings);

    return job;
  }

  /**
   * Get job status
   */
  getJobStatus(jobId: string): BatchExportJob | null {
    return this.activeJobs.get(jobId) || null;
  }

  /**
   * Get all active jobs
   */
  getActiveJobs(): BatchExportJob[] {
    return Array.from(this.activeJobs.values());
  }

  /**
   * Cancel a job
   */
  cancelJob(jobId: string): boolean {
    const job = this.activeJobs.get(jobId);
    if (job && job.status === 'pending') {
      job.status = 'failed';
      job.error = 'Job cancelled by user';
      job.completedAt = new Date().toISOString();
      return true;
    }
    return false;
  }

  /**
   * Process batch export job
   */
  private async processBatchExport(
    jobId: string,
    data: unknown,
    settings: ExportSettings
  ): Promise<void> {
    const job = this.activeJobs.get(jobId);
    if (!job) return;

    job.status = 'processing';

    try {
      for (let i = 0; i < job.targets.length; i++) {
        const target = job.targets[i];
        
        // Update progress
        job.progress.current = i + 1;
        job.progress.currentTarget = target.platformName;

        try {
          // Generate export content
          const content = await this.generateExportContent(data, target);
          
          // Upload to GitHub
          const fileUrl = await this.uploadToGitHub(content, target, settings);
          
          // Record success
          job.results.push({
            target,
            success: true,
            fileUrl,
            size: content.length
          });

        } catch (error) {
          // Record failure
          job.results.push({
            target,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }

        // Small delay to prevent rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      job.status = 'completed';
      job.completedAt = new Date().toISOString();

    } catch (error) {
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : 'Unknown error';
      job.completedAt = new Date().toISOString();
    }
  }

  /**
   * Generate export content for a specific target
   */
  private async generateExportContent(data: unknown, target: ExportTarget): Promise<string> {
    const { format, includeComments, includeMetadata, minify, customSettings } = target;

    let content = '';

    // Add comments if requested
    if (includeComments) {
      content += `/*\n`;
      content += ` * Generated by Design System Foundry\n`;
      content += ` * Platform: ${target.platformName}\n`;
      content += ` * Format: ${format.name}\n`;
      content += ` * Generated: ${new Date().toISOString()}\n`;
      content += ` */\n\n`;
    }

    // Generate format-specific content
    switch (format.id) {
      case 'json':
        content += this.generateJsonContent(data, includeMetadata, minify);
        break;
      case 'css':
        content += this.generateCssContent(data, customSettings);
        break;
      case 'scss':
        content += this.generateScssContent(data, customSettings);
        break;
      case 'typescript':
        content += this.generateTypeScriptContent(data, customSettings);
        break;
      case 'swift':
        content += this.generateSwiftContent(data, customSettings);
        break;
      case 'kotlin':
        content += this.generateKotlinContent(data, customSettings);
        break;
      default:
        throw new Error(`Unsupported format: ${format.id}`);
    }

    return content;
  }

  /**
   * Generate JSON content
   */
  private generateJsonContent(data: unknown, includeMetadata: boolean, minify: boolean): string {
    const exportData = includeMetadata ? {
      metadata: {
        generatedAt: new Date().toISOString(),
        version: '1.0.0',
        source: 'design-system-foundry'
      },
      data
    } : data;

    return minify ? 
      JSON.stringify(exportData) : 
      JSON.stringify(exportData, null, 2);
  }

  /**
   * Generate CSS content
   */
  private generateCssContent(_data: unknown, customSettings?: Record<string, unknown>): string {
    // Mock CSS generation - in real implementation this would parse the data structure
    const prefix = customSettings?.prefix as string || '--token';
    
    return `:root {\n` +
           `  ${prefix}-color-primary: #007bff;\n` +
           `  ${prefix}-color-secondary: #6c757d;\n` +
           `  ${prefix}-spacing-sm: 0.25rem;\n` +
           `  ${prefix}-spacing-md: 0.5rem;\n` +
           `  ${prefix}-spacing-lg: 1rem;\n` +
           `}\n`;
  }

  /**
   * Generate SCSS content
   */
  private generateScssContent(_data: unknown, customSettings?: Record<string, unknown>): string {
    // Mock SCSS generation
    const prefix = customSettings?.prefix as string || '$token';
    
    return `${prefix}-color-primary: #007bff;\n` +
           `${prefix}-color-secondary: #6c757d;\n` +
           `${prefix}-spacing-sm: 0.25rem;\n` +
           `${prefix}-spacing-md: 0.5rem;\n` +
           `${prefix}-spacing-lg: 1rem;\n`;
  }

  /**
   * Generate TypeScript content
   */
  private generateTypeScriptContent(_data: unknown, _customSettings?: Record<string, unknown>): string {
    // Mock TypeScript generation
    return `export const tokens = {\n` +
           `  colors: {\n` +
           `    primary: '#007bff',\n` +
           `    secondary: '#6c757d',\n` +
           `  },\n` +
           `  spacing: {\n` +
           `    sm: '0.25rem',\n` +
           `    md: '0.5rem',\n` +
           `    lg: '1rem',\n` +
           `  },\n` +
           `} as const;\n`;
  }

  /**
   * Generate Swift content
   */
  private generateSwiftContent(data: unknown, customSettings?: Record<string, unknown>): string {
    // Mock Swift generation
    return `import UIKit\n\n` +
           `struct DesignTokens {\n` +
           `  static let colorPrimary = UIColor(red: 0.0, green: 0.48, blue: 1.0, alpha: 1.0)\n` +
           `  static let colorSecondary = UIColor(red: 0.42, green: 0.46, blue: 0.49, alpha: 1.0)\n` +
           `  static let spacingSmall: CGFloat = 4.0\n` +
           `  static let spacingMedium: CGFloat = 8.0\n` +
           `  static let spacingLarge: CGFloat = 16.0\n` +
           `}\n`;
  }

  /**
   * Generate Kotlin content
   */
  private generateKotlinContent(data: unknown, customSettings?: Record<string, unknown>): string {
    // Mock Kotlin generation
    return `package com.example.designsystem\n\n` +
           `object DesignTokens {\n` +
           `  val colorPrimary = Color(0xFF007BFF)\n` +
           `  val colorSecondary = Color(0xFF6C757D)\n` +
           `  val spacingSmall = 4.dp\n` +
           `  val spacingMedium = 8.dp\n` +
           `  val spacingLarge = 16.dp\n` +
           `}\n`;
  }

  /**
   * Upload content to GitHub
   */
  private async uploadToGitHub(
    content: string,
    target: ExportTarget,
    settings: ExportSettings
  ): Promise<string> {
    const accessToken = await GitHubAuthService.getValidAccessToken();
    
    const fileName = `tokens-${target.platformId}${target.format.extension}`;
    const filePath = `exports/${fileName}`;

    await GitHubApiService.createOrUpdateFile(
      settings.repositoryUri,
      filePath,
      content,
      settings.branch,
      settings.commitMessage
    );

    // Return the GitHub file URL
    return `https://github.com/${settings.repositoryUri}/blob/${settings.branch}/${filePath}`;
  }

  /**
   * Generate unique job ID
   */
  private generateJobId(): string {
    return `export-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Clean up completed jobs older than 24 hours
   */
  cleanupOldJobs(): void {
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    for (const [jobId, job] of this.activeJobs.entries()) {
      if (job.completedAt && new Date(job.completedAt) < twentyFourHoursAgo) {
        this.activeJobs.delete(jobId);
      }
    }
  }
} 