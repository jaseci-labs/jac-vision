import React, { useState, useEffect } from 'react';
import Select from 'react-select';
import { Box, Button, TextField, Typography, CircularProgress, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';
import { finetuneModel, fetchModels, deleteModel } from '../utils/api';
import { ModelOption } from '../types';
import { toast } from 'react-toastify';

interface FineTuneProps {
  selectedModel: string | null;
  setSelectedModel: (model: string | null) => void;
  toast: typeof toast;
}

const FineTune: React.FC<FineTuneProps> = ({ selectedModel, setSelectedModel, toast }) => {
  const [datasetLink, setDatasetLink] = useState<string>('');
  const [fineTuneStatus, setFineTuneStatus] = useState<string>('');
  const [fineTuneLoading, setFineTuneLoading] = useState<boolean>(false);
  const [deleteLoading, setDeleteLoading] = useState<{ [key: string]: boolean }>({});
  const [error, setError] = useState<string>('');
  const [modelOptions, setModelOptions] = useState<ModelOption[]>([]);

  const loadModels = async () => {
    try {
      const response = await fetchModels();
      const models = response.models || []; // Access response.models directly
      const options = models.map((model: string) => ({
        value: model,
        label: model,
      }));
      setModelOptions(options);
    } catch (error: any) {
      const errorMessage = error.message || 'Error loading models. Check the console.';
      setError(errorMessage);
      toast.error(errorMessage);
      console.error(error);
    }
  };

  useEffect(() => {
    loadModels();
  }, []);

  const customStyles = {
    control: (provided: any, state: any) => ({
      ...provided,
      backgroundColor: state.isFocused ? '#2D3748' : '#1E293B',
      borderColor: state.isFocused ? '#5B21B6' : '#4B5563',
      boxShadow: state.isFocused ? '0 0 5px #5B21B6' : 'none',
      '&:hover': {
        borderColor: '#5B21B6',
      },
    }),
    menu: (provided: any) => ({
      ...provided,
      backgroundColor: '#1E293B',
    }),
    option: (provided: any, state: any) => ({
      ...provided,
      backgroundColor: state.isSelected ? '#5B21B6' : state.isFocused ? '#2D3748' : '#1E293B',
      color: '#E2E8F0',
      '&:hover': {
        backgroundColor: '#2D3748',
      },
    }),
    singleValue: (provided: any) => ({
      ...provided,
      color: '#E2E8F0',
    }),
    placeholder: (provided: any) => ({
      ...provided,
      color: '#9CA3AF',
    }),
  };

  const handleFinetune = async () => {
    if (!selectedModel || !datasetLink) {
      setError('Please select a model and provide a dataset link.');
      toast.error('Please select a model and provide a dataset link.');
      return;
    }
    setFineTuneLoading(true);
    setError('');
    setFineTuneStatus('Starting fine-tuning...');
    try {
      const response = await finetuneModel(selectedModel, datasetLink);
      setFineTuneStatus(response.message); // Access response.message directly
      toast.success(response.message);
      await loadModels();
    } catch (error: any) {
      const errorMessage = error.message || 'Error during fine-tuning. Check the console.';
      setError(errorMessage);
      setFineTuneStatus('');
      toast.error(errorMessage);
      console.error(error);
    }
    setFineTuneLoading(false);
  };

  const handleDelete = async (model: string) => {
    setDeleteLoading((prev) => ({ ...prev, [model]: true }));
    try {
      const response = await deleteModel(model);
      toast.success(response.message || `Model ${model} deleted successfully!`); // Access response.message directly
      await loadModels();
      if (selectedModel === model) {
        setSelectedModel(null);
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to delete model.';
      toast.error(errorMessage);
      console.error('Delete Error', error);
    }
    setDeleteLoading((prev) => ({ ...prev, [model]: false }));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleFinetune();
    }
  };

  return (
    <Box
      className="content-section"
      sx={{
        p: { xs: 2, sm: 3, md: 4 },
        maxWidth: '1200px',
        mx: 'auto',
        width: '100%',
      }}
    >
      <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, textAlign: { xs: 'center', sm: 'left' } }}>
        Fine-Tune a Model
      </Typography>
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2, mb: 3 }}>
        <Box sx={{ flex: 1 }}>
          <Select
            options={modelOptions}
            onChange={(option) => setSelectedModel(option?.value || null)}
            placeholder="Select a model"
            value={modelOptions.find((option) => option.value === selectedModel)}
            styles={{
              ...customStyles,
              control: (base, state) => ({
                ...base,
                height: '56px',
                minHeight: '56px',
                borderColor: state.isFocused ? '#5B21B6' : '#4B5563',
                boxShadow: 'none',
                '&:hover': {
                  borderColor: '#5B21B6',
                },
                backgroundColor: 'transparent',
                color: '#E2E8F0',
              }),
              singleValue: (base) => ({
                ...base,
                color: '#E2E8F0',
              }),
              placeholder: (base) => ({
                ...base,
                color: '#9CA3AF',
              }),
            }}
          />
        </Box>

        <TextField
          label="Dataset Link (e.g., Hugging Face dataset)"
          value={datasetLink}
          onChange={(e) => setDatasetLink(e.target.value)}
          variant="outlined"
          fullWidth
          sx={{
            flex: 1,
            '& .MuiOutlinedInput-root': {
              height: '56px',
              '& fieldset': { borderColor: '#4B5563' },
              '&:hover fieldset': { borderColor: '#5B21B6' },
              '&.Mui-focused fieldset': { borderColor: '#5B21B6' },
            },
            '& .MuiInputLabel-root': { color: '#9CA3AF' },
            '& .MuiInputBase-input': { color: '#E2E8F0' },
          }}
        />
      </Box>

      <Button
        variant="contained"
        onClick={handleFinetune}
        disabled={fineTuneLoading}
        sx={{
          mb: 1,
          backgroundColor: '#5B21B6',
          '&:hover': {
            backgroundColor: '#8B5CF6',
            transform: 'scale(1.05)',
            transition: 'all 0.2s ease-in-out',
          },
          borderRadius: '8px',
          textTransform: 'none',
          fontWeight: 500,
          width: { xs: '100%', sm: 'auto' },
        }}
      >
        {fineTuneLoading ? <CircularProgress size={24} /> : 'Start Fine-Tuning'}
      </Button>
      {error && (
        <Typography variant="body1" color="error" sx={{ mt: 2, textAlign: 'center' }}>
          {error}
        </Typography>
      )}
      {fineTuneStatus && !error && (
        <Typography variant="body1" sx={{ mt: 2, color: '#E2E8F0', textAlign: 'center' }}>
          {fineTuneStatus}
        </Typography>
      )}
    </Box>
  );
};

export default FineTune;