import React, { useState, useEffect } from 'react';
import Select from 'react-select';
import { Box, Button, TextField, Typography, CircularProgress, Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import LinearProgress, { LinearProgressProps } from '@mui/material/LinearProgress';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { finetuneModel, fetchModels, deleteModel } from '../utils/api';
import { ModelOption } from '../types';
import { toast } from 'react-toastify';

interface FineTuneProps {
  selectedModel: string | null;
  setSelectedModel: (model: string | null) => void;
  toast: typeof toast;
}

function LinearProgressWithLabel(props: LinearProgressProps & { value: number }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center' }}>
      <Box sx={{ width: '100%', mr: 1 }}>
        <LinearProgress variant="determinate" {...props} />
      </Box>
      <Box sx={{ minWidth: 35 }}>
        <Typography
          variant="body2"
          sx={{ color: 'text.secondary' }}
        >{`${Math.round(props.value)}%`}</Typography>
      </Box>
    </Box>
  );
}

const FineTune: React.FC<FineTuneProps> = ({ selectedModel, setSelectedModel, toast }) => {
  const [datasetLink, setDatasetLink] = useState<string>('');
  const [fineTuneStatus, setFineTuneStatus] = useState<string>('');
  const [fineTuneLoading, setFineTuneLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [modelOptions, setModelOptions] = useState<ModelOption[]>([]);
  const [fineTuneProgress, setFineTuneProgress] = useState(0);
  const [logs, setLogs] = useState([]);
  const [showLogs, setShowLogs] = useState(false);

  const [datasetSize, setDatasetSize] = useState<string>('');
  const [epochs, setEpochs] = useState<string>('');
  const [steps, setSteps] = useState<string>('');
  const [learningRate, setLearningRate] = useState<string>('');
  const [batchSize, setBatchSize] = useState<string>('');
  const [sequenceLength, setSequenceLength] = useState<string>('');
  const [precision, setPrecision] = useState<string>('');

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

  return (
    <Box
      className="content-section"
      sx={{
        p: { xs: 3, sm: 4, md: 5 },
        maxWidth: '1200px',
        mx: 'auto',
        width: '100%',
        backgroundColor: '#1F2937', // Slightly darker background for a more professional feel
        borderRadius: '12px', // Rounded corners for a clean look
        boxShadow: 3, // Subtle shadow for depth
      }}
    >
      <Typography
        variant="h5"
        sx={{
          fontWeight: 700,
          mb: 3,
          textAlign: 'center',
          color: '#E2E8F0'
        }}
      >
        Fine-Tune Your Model
      </Typography>

      <Typography
        variant="body1"
        sx={{
          mb: 4,
          textAlign: 'center',
          color: '#9CA3AF',
          maxWidth: '800px',
          mx: 'auto'
        }}
      >
        Configure your model with the following parameters and start the fine-tuning process. Each setting helps improve the model's performance based on your dataset and goals.
      </Typography>

      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          gap: 3,
          mb: 4,
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Box sx={{ flex: 1 }}>
          <Select
            options={modelOptions}
            onChange={(option) => setSelectedModel(option?.value || null)}
            placeholder="Select a Model"
            value={modelOptions.find((option) => option.value === selectedModel)}
            styles={{
              ...customStyles,
              control: (base, state) => ({
                ...base,
                height: '56px',
                borderColor: state.isFocused ? '#5B21B6' : '#4B5563',
                boxShadow: 'none',
                backgroundColor: 'transparent',
                color: '#E2E8F0',
                '&:hover': { borderColor: '#5B21B6' },
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
          label="Dataset Link"
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

      {/* Expandable Parameter Section */}
      <Accordion sx={{ mb: 3, backgroundColor: '#1F2937', borderRadius: '8px' }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: '#9CA3AF' }} />} sx={{ backgroundColor: '#2D3748' }}>
          <Typography sx={{ color: '#E2E8F0', fontWeight: 500 }}>
            Adjust Fine-Tuning Parameters
          </Typography>
        </AccordionSummary>
        <AccordionDetails sx={{ backgroundColor: '#2D3748' }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: '1fr 1fr 1fr 1fr' }, flexDirection: 'column', gap: 2 }}>
            {[
              { label: 'Training Size', value: datasetSize, set: setDatasetSize },
              { label: 'Epochs', value: epochs, set: setEpochs },
              { label: 'Training Steps', value: steps, set: setSteps },
              { label: 'Learning Rate', value: learningRate, set: setLearningRate },
              { label: 'Batch Size', value: batchSize, set: setBatchSize },
              { label: 'Sequence Length', value: sequenceLength, set: setSequenceLength },
              { label: 'Mixed Precision', value: precision, set: setPrecision },
            ].map((item, index) => (
              <Box key={index} sx={{ display: 'flex', flexDirection: 'column' }}>
                <Typography variant="body2" sx={{ color: '#9CA3AF', mb: 1 }}>
                  {item.label}
                </Typography>
                <TextField
                  value={item.value}
                  onChange={(e) => item.set(e.target.value)}
                  fullWidth
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      height: '40px', // Reduced height for a cleaner look
                      '& fieldset': { borderColor: '#4B5563' },
                      '&:hover fieldset': { borderColor: '#5B21B6' },
                      '&.Mui-focused fieldset': { borderColor: '#5B21B6' },
                    },
                    '& .MuiInputLabel-root': { color: '#9CA3AF' },
                    '& .MuiInputBase-input': { color: '#E2E8F0' },
                  }}
                />
              </Box>
            ))}
          </Box>
        </AccordionDetails>
      </Accordion>

      <Button
        variant="contained"
        onClick={handleFinetune}
        disabled={fineTuneLoading}
        sx={{
          width: '100%',
          backgroundColor: '#5B21B6',
          '&:hover': {
            backgroundColor: '#8B5CF6',
            transform: 'scale(1.05)',
            transition: 'all 0.2s ease-in-out',
          },
          borderRadius: '8px',
          textTransform: 'none',
          fontWeight: 500,
          py: 1.5,
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

      <Box sx={{ mt: 3 }}>
        {/* Progress Bar */}
        <Box sx={{ width: '100%', mb: 2 }}>
          <Typography variant="body2" sx={{ color: '#E2E8F0', mb: 1 }}>
            Progress
          </Typography>
          <LinearProgressWithLabel
            variant="determinate"
            value={20}
            sx={{
              height: '8px',
              borderRadius: '4px',
              backgroundColor: '#4A5568',
              '& .MuiLinearProgress-bar': {
                backgroundColor: '#5B21B6',
              },
            }}
          />
        </Box>
      </Box>

      {/* Console/Log Section */}
      <Accordion sx={{ backgroundColor: '#2D3748', color: '#E2E8F0', mt: 3, borderRadius: 2, boxShadow: 1 }}>
        <AccordionSummary
          expandIcon={<ExpandMoreIcon sx={{ color: '#9CA3AF' }} />}
          sx={{
            backgroundColor: '#1A202C',
            color: '#E2E8F0',
            fontWeight: 600,
            padding: '12px 20px',
            '&:hover': {
              backgroundColor: '#4A5568',
            },
          }}
        >
          <Typography variant="body1" sx={{ color: '#E2E8F0' }}>
            Console Logs
          </Typography>
        </AccordionSummary>
        <AccordionDetails sx={{ padding: 2, backgroundColor: '#1A202C', maxHeight: 250, overflowY: 'auto', borderRadius: '0 0 8px 8px' }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Typography variant="body2" sx={{ color: '#9CA3AF' }}>
              Initializing fine-tuning process...
            </Typography>
            <Typography variant="body2" sx={{ color: '#9CA3AF' }}>
              Model training started...
            </Typography>
            <Typography variant="body2" sx={{ color: '#9CA3AF' }}>
              Epoch 1/5 completed...
            </Typography>
          </Box>
        </AccordionDetails>
      </Accordion>

    </Box>
  );
};

export default FineTune;