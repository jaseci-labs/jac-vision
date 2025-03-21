import React from 'react';
import { Typography, FormControlLabel, Switch } from '@mui/material';

interface SettingsProps {
  themeMode: 'light' | 'dark';
  setThemeMode: (mode: 'light' | 'dark') => void;
}

const Settings: React.FC<SettingsProps> = ({ themeMode, setThemeMode }) => {
  const handleThemeToggle = () => {
    setThemeMode(themeMode === 'dark' ? 'light' : 'dark');
  };

  return (
    <div className={`content-section ${themeMode}`}>
      <Typography variant="h6">Settings</Typography>
      <FormControlLabel
        control={
          <Switch
            checked={themeMode === 'dark'}
            onChange={handleThemeToggle}
            color="primary"
          />
        }
        label="Dark Mode"
        style={{ marginTop: '20px' }}
      />
    </div>
  );
};

export default Settings;