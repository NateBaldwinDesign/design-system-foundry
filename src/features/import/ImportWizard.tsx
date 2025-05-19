import React from 'react';
import { Box, Typography, Paper } from '@mui/material';

export default function ImportWizard() {
  return (
    <Paper sx={{ p: 4 }}>
      <Typography variant="h5" gutterBottom>Import Wizard</Typography>
      <Typography variant="body1" gutterBottom>
        Import tokens from Style Dictionary, Figma Variables, and more. This wizard will guide you through uploading and mapping your existing token data.
      </Typography>
      {/* TODO: Add file upload, format selection, and structure detection steps */}
      <Box sx={{ mt: 2, color: 'text.disabled' }}>
        <Typography variant="caption">Feature coming soon...</Typography>
      </Box>
    </Paper>
  );
} 