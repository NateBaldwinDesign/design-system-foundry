import React, { useState } from 'react';
import { Box } from '@chakra-ui/react';
import { VerticalTabsLayout } from '../../components/VerticalTabsLayout';
import { DimensionsWorkflow } from '../../components/DimensionsWorkflow';
import { SettingsTaxonomiesTab } from '../settings/SettingsTaxonomiesTab';
import { SettingsNamingRulesTab } from '../settings/SettingsNamingRulesTab';
import { ValueTypesWorkflow } from '../../components/ValueTypesWorkflow';
import { Dimension, Taxonomy } from '@token-model/data-model';

interface SetupViewProps {
  dimensions: Dimension[];
  setDimensions: (dimensions: Dimension[]) => void;
  taxonomies: Taxonomy[];
  setTaxonomies: (taxonomies: Taxonomy[]) => void;
  taxonomyOrder: string[];
  setTaxonomyOrder: (order: string[]) => void;
  resolvedValueTypes: { id: string; displayName: string }[];
  setResolvedValueTypes: (types: { id: string; displayName: string }[]) => void;
  activeTab?: number;
  setActiveTab?: (tab: number) => void;
}

const SetupView: React.FC<SetupViewProps> = ({
  dimensions,
  setDimensions,
  taxonomies,
  setTaxonomies,
  taxonomyOrder,
  setTaxonomyOrder,
  resolvedValueTypes,
  setResolvedValueTypes,
  activeTab: controlledActiveTab,
  setActiveTab: controlledSetActiveTab
}) => {
  const [internalActiveTab, setInternalActiveTab] = useState(0);
  const activeTab = controlledActiveTab !== undefined ? controlledActiveTab : internalActiveTab;
  const setActiveTab = controlledSetActiveTab || setInternalActiveTab;

  return (
    <VerticalTabsLayout
      tabs={[
        {
          id: 'dimensions',
          label: 'Dimensions',
          content: (
            <DimensionsWorkflow
              dimensions={dimensions}
              setDimensions={setDimensions}
            />
          )
        },
        {
          id: 'classification',
          label: 'Classification',
          content: (
            <SettingsTaxonomiesTab
              taxonomies={taxonomies}
              setTaxonomies={setTaxonomies}
            />
          )
        },
        {
          id: 'naming-rules',
          label: 'Naming Rules',
          content: (
            <SettingsNamingRulesTab
              taxonomies={taxonomies}
              taxonomyOrder={taxonomyOrder}
              setTaxonomyOrder={setTaxonomyOrder}
            />
          )
        },
        {
          id: 'value-types',
          label: 'Value Types',
          content: (
            <ValueTypesWorkflow
              valueTypes={resolvedValueTypes.map(vt => vt.id)}
              onUpdate={types => setResolvedValueTypes(types.map(id => ({ id, displayName: id })))}
            />
          )
        }
      ]}
      activeTab={activeTab}
      onChange={setActiveTab}
    />
  );
};

export default SetupView; 