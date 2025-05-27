import type { Token, Platform, Theme } from '@token-model/data-model';

export function getTokenStats(tokens: Token[]) {
  const total = tokens.length;
  const privateCount = tokens.filter(t => t.private).length;
  const publicCount = total - privateCount;
  const themeableCount = tokens.filter(t => t.themeable).length;
  const nonThemeableCount = total - themeableCount;
  return {
    total,
    privateCount,
    publicCount,
    privatePercent: total ? (privateCount / total) * 100 : 0,
    publicPercent: total ? (publicCount / total) * 100 : 0,
    themeableCount,
    nonThemeableCount,
    themeablePercent: total ? (themeableCount / total) * 100 : 0,
    nonThemeablePercent: total ? (nonThemeableCount / total) * 100 : 0,
  };
}

export function getPlatformOverrideStats(tokens: Token[], platforms: Platform[]) {
  // For each platform, count tokens with platformOverrides
  return platforms.map(platform => {
    const count = tokens.filter(token =>
      Array.isArray(token.valuesByMode) &&
      token.valuesByMode.some((vbm: { platformOverrides?: { platformId: string }[] }) =>
        Array.isArray(vbm.platformOverrides) &&
        vbm.platformOverrides.some((po: { platformId: string }) => po.platformId === platform.id)
      )
    ).length;
    return { platformId: platform.id, platformName: platform.displayName, count };
  });
}

export function getThemeStats(themes: Theme[]) {
  const totalThemes = themes.length;
  // For each theme, percent of tokens with a theme override (placeholder logic)
  // This will need to be updated if theme overrides are stored elsewhere
  const themeOverrides = themes.map(theme => {
    // Placeholder: count tokens with a property like theme.overrides[theme.id]
    // For now, just return 0
    return { themeId: theme.id, themeName: theme.displayName, percentWithOverride: 0 };
  });
  return { totalThemes, themeOverrides };
}

export function getLatestRelease() {
  // Placeholder for latest release info
  return { version: 'v1.0.0', date: '2024-01-01' };
}

export function getRecentActivity() {
  // Placeholder for recent activity
  return [
    { id: 1, description: 'Token "Primary Color" updated', date: '2024-06-01' },
    { id: 2, description: 'Theme "Dark" created', date: '2024-05-30' },
    { id: 3, description: 'Platform "iOS" added', date: '2024-05-28' },
  ];
} 