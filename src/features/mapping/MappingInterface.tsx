import React from 'react';
import { Box, Typography, Paper } from '@mui/material';

export default function MappingInterface() {
  return (
    <Paper sx={{ p: 4 }}>
      <Typography variant="h5" gutterBottom>Mapping</Typography>
      <Typography variant="body1" gutterBottom>
        Map your existing token structure to the new schema. Connect patterns to schema concepts.
      </Typography>
      {/* TODO: Add mapping table, drag-and-drop, and schema concept selection */}
      <Box sx={{ mt: 2, color: 'text.disabled' }}>
        <Typography variant="caption">Feature coming soon...</Typography>
      </Box>
    </Paper>
  );
} 