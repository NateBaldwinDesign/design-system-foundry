import { useState } from 'react';
import { Box, Typography } from '@mui/material';
import { ValueTypeManager } from '../components/ValueTypeManager';

export function ValueTypesPage() {
  const [valueTypes, setValueTypes] = useState<string[]>([]);

  const handleAddValueType = (valueType: string) => {
    setValueTypes([...valueTypes, valueType]);
  };

  const handleUpdateValueType = (id: string, valueType: string) => {
    setValueTypes(valueTypes.map(vt => vt === id ? valueType : vt));
  };

  const handleDeleteValueType = (id: string) => {
    setValueTypes(valueTypes.filter(type => type !== id));
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Value Types
      </Typography>
      <ValueTypeManager
        valueTypes={valueTypes}
        onAdd={handleAddValueType}
        onUpdate={handleUpdateValueType}
        onDelete={handleDeleteValueType}
      />
    </Box>
  );
} 