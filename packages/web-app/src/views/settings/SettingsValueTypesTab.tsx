import React from 'react';
import { Box, Typography, Chip } from '@mui/material';

export function SettingsValueTypesTab() {
  return (
    <>
      <Typography variant="h6" gutterBottom>
        Value Types
      </Typography>
      <Typography>
        Currently supported value types:
      </Typography>
      <Box sx={{ mt: 2 }}>
        <Chip label="COLOR" sx={{ mr: 1 }} />
      </Box>
    </>
  );
} 