import React, { useState } from 'react';
import { VerticalTabsLayout, TabItem } from '../components/VerticalTabsLayout';
import CoreDataView from './CoreDataView';
import ThemeOverridesView from './ThemeOverridesView';
import PlatformOverridesView from './PlatformOverridesView';
import AlgorithmDataView from './AlgorithmDataView';

const SchemasView: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);

  const tabs: TabItem[] = [
    {
      id: 'core-data',
      label: 'Core Data',
      content: <CoreDataView />
    },
    {
      id: 'theme-overrides',
      label: 'Theme Overrides',
      content: <ThemeOverridesView />
    },
    {
      id: 'platform-extensions',
      label: 'Platform Extensions',
      content: <PlatformOverridesView />
    },
    {
      id: 'algorithm-data',
      label: 'Algorithm Data',
      content: <AlgorithmDataView />
    }
  ];

  const handleTabChange = (index: number) => {
    setActiveTab(index);
  };

  return (
    <VerticalTabsLayout 
      tabs={tabs}
      activeTab={activeTab}
      onChange={handleTabChange}
      width="100%"
      height="100%"
    />
  );
};

export default SchemasView; 