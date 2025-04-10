import React, { useState, useEffect } from 'react';
import { Typography, List, ListItem, ListItemText } from '@mui/material';
import axios from 'axios';
import { toast } from 'react-toastify';
import { API_URL } from '../utils/api';
interface ModelsProps {
  toast: typeof toast;
  themeMode: 'light' | 'dark';
}

const Models: React.FC<ModelsProps> = ({ toast, themeMode }) => {
  const [models, setModels] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const fetchModels = async () => {
      setLoading(true);
      try {
        const response = await axios.get(`${API_URL}/models/models`);
        setModels(response.data.models);
        toast.success('Models loaded successfully!');
      } catch (err) {
        setError('Error fetching models. Please try again.');
        toast.error('Error fetching models. Please try again.');
        console.error(err);
      }
      setLoading(false);
    };
    fetchModels();
  }, [toast]);

  return (
    <div className={`content-section ${themeMode}`}>
      <Typography variant="h6">Downloaded Models</Typography>
      {loading && <Typography variant="body1">Loading...</Typography>}
      {error && (
        <Typography variant="body1" color="error">
          {error}
        </Typography>
      )}
      {models.length === 0 && !loading && !error && (
        <Typography variant="body1">No models downloaded yet.</Typography>
      )}
      {models.length > 0 && (
        <List>
          {models.map((model) => (
            <ListItem key={model}>
              <ListItemText primary={model} />
            </ListItem>
          ))}
        </List>
      )}
    </div>
  );
};

export default Models;