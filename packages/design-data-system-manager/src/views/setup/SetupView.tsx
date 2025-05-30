import React, { useState } from 'react';
import { VerticalTabsLayout } from '../../components/VerticalTabsLayout';
import { DimensionsTab } from './DimensionsTab';
import { ValueTypesTab } from './ValueTypesTab';
import { ClassificationTab } from './ClassificationTab';
import { NamingRulesTab } from './NamingRulesTab';
import { Dimension, Taxonomy, ResolvedValueType } from '@token-model/data-model';

interface SetupViewProps {
  dimensions: Dimension[];
  setDimensions: (dimensions: Dimension[]) => void;
  taxonomies: Taxonomy[];
  setTaxonomies: (taxonomies: Taxonomy[]) => void;
  taxonomyOrder: string[];
  setTaxonomyOrder: (order: string[]) => void;
  resolvedValueTypes: ResolvedValueType[];
  setResolvedValueTypes: (types: ResolvedValueType[]) => void;
  activeTab?: number;
  setActiveTab?: (tab: number) => void;
}

const SetupView: React.FC<SetupViewProps> = (props: SetupViewProps) => {
  const {
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
  } = props;
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
            <DimensionsTab
              dimensions={dimensions}
              setDimensions={setDimensions}
            />
          )
        },
        {
          id: 'classification',
          label: 'Classification',
          content: (
            <ClassificationTab
              taxonomies={taxonomies}
              setTaxonomies={setTaxonomies}
            />
          )
        },
        {
          id: 'naming-rules',
          label: 'Naming Rules',
          content: (
            <NamingRulesTab
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
            <ValueTypesTab
              valueTypes={resolvedValueTypes}
              onUpdate={setResolvedValueTypes}
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