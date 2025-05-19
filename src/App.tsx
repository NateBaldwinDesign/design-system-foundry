import React, { useState } from 'react';
import { Box, CssBaseline, Drawer, List, ListItem, ListItemButton, ListItemText, Toolbar, AppBar, Typography } from '@mui/material';

const drawerWidth = 260;

const FEATURES = [
  { key: 'import', label: 'Import Wizard' },
  { key: 'mapping', label: 'Mapping' },
  { key: 'transformation', label: 'Dimensional Transformation' },
  { key: 'validation', label: 'Validation & Cleanup' },
  { key: 'export', label: 'Export & Integration' },
  { key: 'versioning', label: 'Version Management' },
];

function FeaturePlaceholder({ feature }: { feature: string }) {
  switch (feature) {
    case 'import':
      return <Typography>Import tokens from Style Dictionary, Figma Variables, and more. Start your migration here.</Typography>;
    case 'mapping':
      return <Typography>Map your existing token structure to the new schema. Connect patterns to schema concepts.</Typography>;
    case 'transformation':
      return <Typography>Convert flat or hierarchical tokens to a dimensional model. Get suggestions for dimensions and modes.</Typography>;
    case 'validation':
      return <Typography>Validate your migrated data, resolve duplicates, and ensure schema compliance.</Typography>;
    case 'export':
      return <Typography>Export to design tools, code repositories, and manage change tracking.</Typography>;
    case 'versioning':
      return <Typography>Compare snapshots, rollback changes, and generate migration documentation.</Typography>;
    default:
      return <Typography>Welcome to the Schema Migrator!</Typography>;
  }
}

export default function App() {
  const [selected, setSelected] = useState('import');

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <Toolbar>
          <Typography variant="h6" noWrap component="div">
            Schema Migrator
          </Typography>
        </Toolbar>
      </AppBar>
      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: { width: drawerWidth, boxSizing: 'border-box' },
        }}
      >
        <Toolbar />
        <Box sx={{ overflow: 'auto' }}>
          <List>
            {FEATURES.map((f) => (
              <ListItem key={f.key} disablePadding>
                <ListItemButton selected={selected === f.key} onClick={() => setSelected(f.key)}>
                  <ListItemText primary={f.label} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Box>
      </Drawer>
      <Box component="main" sx={{ flexGrow: 1, bgcolor: 'background.default', p: 4, mt: 8 }}>
        <FeaturePlaceholder feature={selected} />
      </Box>
    </Box>
  );
} 