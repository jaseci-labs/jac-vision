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
      const models = response.data.models || [];
      const options = models.map((model: string) => ({
        value: model,
        label: model,
      }));
      setModelOptions(options);
    } catch (error) {
      setError('Error loading models. Check the console.');
      toast.error('Error loading models. Check the console.');
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
      setFineTuneStatus(response.data.message);
      toast.success(response.data.message);
      await loadModels();
    } catch (error) {
      setError('Error during fine-tuning. Check the console.');
      setFineTuneStatus('');
      toast.error('Error during fine-tuning. Check the console.');
      console.error(error);
    }
    setFineTuneLoading(false);
  };

  const handleDelete = async (model: string) => {
    setDeleteLoading((prev) => ({ ...prev, [model]: true }));
    try {
      const response = await deleteModel(model);
      toast.success(response.data.message || `Model ${model} deleted successfully!`);
      await loadModels();
    } catch (error: any) {
      console.error('Delete Error', error);
      toast.error(error.response?.data?.message || 'Failed to delete model.');
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
      <Box sx={{ mb: 3 }}>
        <Select
          options={modelOptions}
          onChange={(option) => setSelectedModel(option?.value || null)}
          placeholder="Select a model"
          styles={customStyles}
          value={modelOptions.find((option) => option.value === selectedModel)}
        />
      </Box>
      <TextField
        label="Dataset Link (e.g., Hugging Face dataset)"
        value={datasetLink}
        onChange={(e) => setDatasetLink(e.target.value)}
        onKeyPress={handleKeyPress}
        fullWidth
        margin="normal"
        variant="outlined"
        sx={{
          mb: 2,
          '& .MuiOutlinedInput-root': {
            '& fieldset': {
              borderColor: '#4B5563',
            },
            '&:hover fieldset': {
              borderColor: '#5B21B6',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#5B21B6',
            },
          },
          '& .MuiInputLabel-root': {
            color: '#9CA3AF',
          },
          '& .MuiInputBase-input': {
            color: '#E2E8F0',
          },
        }}
      />
      <Button
        variant="contained"
        onClick={handleFinetune}
        disabled={fineTuneLoading}
        sx={{
          mb: 2,
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
      {modelOptions.length > 0 && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="body1" sx={{ color: '#E2E8F0', mb: 2, textAlign: { xs: 'center', sm: 'left' } }}>
            Available Models:
          </Typography>
          <TableContainer component={Paper} sx={{ backgroundColor: '#1E293B', overflowX: 'auto' }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ color: '#E2E8F0', fontWeight: 600 }}>Model Name</TableCell>
                  <TableCell sx={{ color: '#E2E8F0', fontWeight: 600 }}>Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {modelOptions.map((option) => (
                  <TableRow key={option.value}>
                    <TableCell sx={{ color: '#E2E8F0' }}>{option.label}</TableCell>
                    <TableCell>
                      <Button
                        variant="outlined"
                        color="error"
                        onClick={() => handleDelete(option.value)}
                        disabled={deleteLoading[option.value]}
                        sx={{
                          borderColor: '#EF4444',
                          color: '#EF4444',
                          '&:hover': {
                            borderColor: '#DC2626',
                            color: '#DC2626',
                          },
                          borderRadius: '8px',
                          textTransform: 'none',
                          fontWeight: 500,
                        }}
                      >
                        {deleteLoading[option.value] ? <CircularProgress size={20} /> : 'Delete'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}
    </Box>
  );
};

export default FineTune;