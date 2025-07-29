import React from 'react';
import { ThemesTab } from './ThemesTab';
import { PageTemplate } from '../components/PageTemplate';

interface Theme {
  id: string;
  displayName: string;
  description?: string;
  isDefault?: boolean;
}

interface ThemesViewProps {
  themes: Theme[];
  setThemes: (themes: Theme[]) => void;
}

const ThemesView: React.FC<ThemesViewProps> = ({
  themes,
  setThemes
}) => {
  return (
    <PageTemplate
      title="Themes"
      description="Manage design system themes and their configurations. Themes allow you to create different visual variations of your design system."
    >
      <ThemesTab themes={themes} setThemes={setThemes} />
    </PageTemplate>
  );
};

export default ThemesView; 