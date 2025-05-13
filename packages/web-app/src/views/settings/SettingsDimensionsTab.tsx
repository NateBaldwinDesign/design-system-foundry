import React from 'react';
import { DimensionsWorkflow } from '../../components/DimensionsWorkflow';
import { Dimension, Mode } from '@token-model/data-model';

interface SettingsDimensionsTabProps {
  dimensions: Dimension[];
  setDimensions: (dimensions: Dimension[]) => void;
  modes: Mode[];
  setModes: (modes: Mode[]) => void;
}

export function SettingsDimensionsTab({ dimensions, setDimensions, modes, setModes }: SettingsDimensionsTabProps) {
  return (
    <DimensionsWorkflow
      dimensions={dimensions}
      setDimensions={setDimensions}
      modes={modes}
      setModes={setModes}
    />
  );
} 