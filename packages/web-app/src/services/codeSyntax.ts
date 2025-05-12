import type { Token } from '@token-model/data-model';

interface CodeSyntaxOptions {
  platform: string;
  prefix?: string;
  separator?: string;
  suffix?: string;
}

export class CodeSyntaxService {
  private static defaultOptions: Record<string, CodeSyntaxOptions> = {
    WEB: {
      platform: 'WEB',
      prefix: '--',
      separator: '-',
      suffix: ''
    },
    iOS: {
      platform: 'iOS',
      prefix: '',
      separator: '',
      suffix: ''
    },
    ANDROID: {
      platform: 'ANDROID',
      prefix: '',
      separator: '_',
      suffix: ''
    },
    FIGMA: {
      platform: 'Figma',
      prefix: '',
      separator: '/',
      suffix: ''
    }
  };

  static generateCodeSyntax(token: Token, platform: string): string {
    const options = this.defaultOptions[platform] || {
      platform,
      prefix: '',
      separator: '-',
      suffix: ''
    };

    // If the token already has a code syntax for this platform, use it
    if (token.codeSyntax && token.codeSyntax[platform]) {
      return token.codeSyntax[platform];
    }

    // Generate a new code syntax based on the token's properties
    const parts: string[] = [];

    // Add taxonomies in order
    if (token.taxonomies) {
      Object.entries(token.taxonomies).forEach(([key, value]) => {
        parts.push(value);
      });
    }

    // Add the display name if no taxonomies are present
    if (parts.length === 0) {
      parts.push(token.displayName);
    }

    // Join the parts with the separator
    const baseSyntax = parts.join(options.separator);

    // Add prefix and suffix
    return `${options.prefix}${baseSyntax}${options.suffix}`;
  }

  static generateAllCodeSyntaxes(token: Token): Record<string, string> {
    const syntaxes: Record<string, string> = {};

    // Generate syntax for each supported platform
    Object.keys(this.defaultOptions).forEach(platform => {
      syntaxes[platform] = this.generateCodeSyntax(token, platform);
    });

    return syntaxes;
  }

  static updateCodeSyntax(token: Token, platform: string, syntax: string): Token {
    return {
      ...token,
      codeSyntax: {
        ...token.codeSyntax,
        [platform]: syntax
      }
    };
  }
} 