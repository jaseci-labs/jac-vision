import React, { useState, useEffect } from 'react';
import Select from 'react-select';
import { Box, Button, TextField, Typography, CircularProgress, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, FormControl, InputLabel, MenuItem, Select as MuiSelect, IconButton, InputAdornment } from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { performVqa, fetchModels, deleteModel, fetchVqaHistory, deleteVqaHistory, clearVqaHistory, testApiKey } from '../utils/api';
import { ModelOption } from '../types';
import { toast } from 'react-toastify';

interface VQAProps {
  selectedModel: string | null;
  setSelectedModel: (model: string | null) => void;
  toast: typeof toast;
}

interface VqaHistoryEntry {
  id: number;
  image_base64: string;
  question: string;
  answer: string;
  timestamp: string;
}

const VQA: React.FC<VQAProps> = ({ selectedModel, setSelectedModel, toast }) => {
  const [vqaImage, setVqaImage] = useState<File | null>(null);
  const [vqaQuestion, setVqaQuestion] = useState<string>('');
  const [vqaAnswer, setVqaAnswer] = useState<string>('');
  const [vqaLoading, setVqaLoading] = useState<boolean>(false);
  const [runModelLoading, setRunModelLoading] = useState<boolean>(false);
  const [runModelResult, setRunModelResult] = useState<string>('');
  const [deleteLoading, setDeleteLoading] = useState<{ [key: string]: boolean }>({});
  const [historyDeleteLoading, setHistoryDeleteLoading] = useState<{ [key: number]: boolean }>({});
  const [clearHistoryLoading, setClearHistoryLoading] = useState<boolean>(false);
  const [testApiKeyLoading, setTestApiKeyLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [modelOptions, setModelOptions] = useState<ModelOption[]>([]);
  const [vqaHistory, setVqaHistory] = useState<VqaHistoryEntry[]>([]);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [historyImageLoading, setHistoryImageLoading] = useState<{ [key: number]: boolean }>({});
  const [vqaMode, setVqaMode] = useState<'local' | 'api'>('local');
  const [apiKey, setApiKey] = useState<string>(localStorage.getItem('vqaApiKey') || '');
  const [apiType, setApiType] = useState<'gemini' | 'openai'>('gemini');
  const [showApiKey, setShowApiKey] = useState<boolean>(false);

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

  const loadVqaHistory = async () => {
    try {
      const response = await fetchVqaHistory();
      setVqaHistory(response.data.history || []);
    } catch (error) {
      setError('Error loading VQA history. Check the console.');
      toast.error('Error loading VQA history. Check the console.');
      console.error(error);
    }
  };

  useEffect(() => {
    loadModels();
    loadVqaHistory();
  }, []);

  useEffect(() => {
    setHistoryImageLoading(vqaHistory.reduce((acc, entry) => ({ ...acc, [entry.id]: true }), {}));
  }, [vqaHistory]);

  useEffect(() => {
    localStorage.setItem('vqaApiKey', apiKey);
  }, [apiKey]);

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

  const validateApiKey = (key: string): boolean => {
    // Basic validation: Check if the key is non-empty and has a reasonable length
    return key.trim().length > 10;
  };

  const handleTestApiKey = async () => {
    if (!validateApiKey(apiKey)) {
      setError('Invalid API key. Please enter a valid key.');
      toast.error('Invalid API key. Please enter a valid key.');
      return;
    }
    setTestApiKeyLoading(true);
    setError('');
    try {
      const response = await testApiKey(apiKey, apiType);
      toast.success('API key is valid!');
    } catch (error: any) {
      const errorMessage = error.response?.data?.answer || 'Invalid API key. Check the console.';
      setError(errorMessage);
      toast.error(errorMessage);
      console.error(error);
    }
    setTestApiKeyLoading(false);
  };

  const handleVqa = async () => {
    if (!vqaQuestion) {
      setError('Please provide a question.');
      toast.error('Please provide a question.');
      return;
    }
    if (vqaMode === 'local' && !selectedModel) {
      setError('Please select a model when using Local Model mode.');
      toast.error('Please select a model when using Local Model mode.');
      return;
    }
    if (vqaMode === 'api' && !apiKey) {
      setError('Please provide an API key when using API Key mode.');
      toast.error('Please provide an API key when using API Key mode.');
      return;
    }
    if (vqaMode === 'api' && !validateApiKey(apiKey)) {
      setError('Invalid API key. Please enter a valid key.');
      toast.error('Invalid API key. Please enter a valid key.');
      return;
    }
    setVqaLoading(true);
    setError('');
    setVqaAnswer('Processing...');
    try {
      const response = await performVqa(
        selectedModel || 'N/A',
        vqaImage,
        vqaQuestion,
        vqaMode === 'api' ? apiKey : undefined,
        vqaMode === 'api' ? apiType : undefined
      );
      setVqaAnswer(response.data.answer);
      toast.success('VQA processed successfully!');
      await loadVqaHistory();
      // Clear the question input field after successful submission
      setVqaQuestion('');
    } catch (error: any) {
      const errorMessage = error.response?.data?.answer || 'Error processing VQA. Check the console.';
      setError(errorMessage);
      setVqaAnswer('');
      toast.error(errorMessage);
      console.error(error);
    }
    setVqaLoading(false);
  };

  const handleRunModel = async () => {
    if (vqaMode === 'local' && !selectedModel) {
      setError('Please select a model to run.');
      toast.error('Please select a model to run.');
      return;
    }
    if (vqaMode === 'api' && !apiKey) {
      setError('Please provide an API key when using API Key mode.');
      toast.error('Please provide an API key when using API Key mode.');
      return;
    }
    if (vqaMode === 'api' && !validateApiKey(apiKey)) {
      setError('Invalid API key. Please enter a valid key.');
      toast.error('Invalid API key. Please enter a valid key.');
      return;
    }
    setRunModelLoading(true);
    setError('');
    setRunModelResult('Running model...');
    try {
      let testImage: File;
      try {
        const response = await fetch('/test-image.jpg');
        if (!response.ok) {
          throw new Error('Failed to fetch test image');
        }
        const blob = await response.blob();
        testImage = new File([blob], 'test-image.jpg', { type: 'image/jpeg' });
      } catch (fetchError) {
        console.error('Fetch Error:', fetchError);
        const base64Image = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAAAAAAAD/2wBDAAoHBwkHBgoJCAkLCwoMDxkQDw4ODx4WFxIZJCAmJSMgIyIOJjUoLC0nMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAb/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQABAQAAAAAAAAAAAAAAAAAAAAb/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFREBAQAAAAAAAAAAAAAAAAAAAAH/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX//Z';
        const byteString = atob(base64Image.split(',')[1]);
        const mimeString = base64Image.split(',')[0].split(':')[1].split(';')[0];
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) {
          ia[i] = byteString.charCodeAt(i);
        }
        const blob = new Blob([ab], { type: mimeString });
        testImage = new File([blob], 'test-image.jpg', { type: 'image/jpeg' });
      }
      const question = vqaQuestion || 'What is this image?';
      const vqaResponse = await performVqa(
        selectedModel || 'N/A',
        testImage,
        question,
        vqaMode === 'api' ? apiKey : undefined,
        vqaMode === 'api' ? apiType : undefined
      );
      setRunModelResult(`Model response: ${vqaResponse.data.answer}`);
      toast.success('Model ran successfully!');
      await loadVqaHistory();
      // Clear the question input field after successful "Run Model"
      setVqaQuestion('');
    } catch (error: any) {
      const errorMessage = error.response?.data?.answer || 'Error running model. Check the console.';
      setError(errorMessage);
      setRunModelResult('');
      toast.error(errorMessage);
      console.error(error);
    }
    setRunModelLoading(false);
  };

  const handleDelete = async (model: string) => {
    setDeleteLoading((prev) => ({ ...prev, [model]: true }));
    try {
      const response = await deleteModel(model);
      toast.success(response.data.message || `Model ${model} deleted successfully!`);
      await loadModels();
      if (selectedModel === model) {
        setSelectedModel(null);
      }
    } catch (error: any) {
      console.error('Delete Error', error);
      toast.error(error.response?.data?.message || 'Failed to delete model.');
    }
    setDeleteLoading((prev) => ({ ...prev, [model]: false }));
  };

  const handleDeleteHistory = async (historyId: number) => {
    setHistoryDeleteLoading((prev) => ({ ...prev, [historyId]: true }));
    try {
      const response = await deleteVqaHistory(historyId);
      toast.success(response.data.message || `History entry ${historyId} deleted successfully!`);
      await loadVqaHistory();
    } catch (error: any) {
      console.error('Delete History Error', error);
      toast.error(error.response?.data?.error || 'Failed to delete history entry.');
    }
    setHistoryDeleteLoading((prev) => ({ ...prev, [historyId]: false }));
  };

  const handleClearAllHistory = async () => {
    setClearHistoryLoading(true);
    try {
      const response = await clearVqaHistory();
      toast.success(response.data.message || 'All VQA history cleared successfully!');
      await loadVqaHistory();
    } catch (error: any) {
      console.error('Clear History Error', error);
      toast.error(error.response?.data?.error || 'Failed to clear history.');
    }
    setClearHistoryLoading(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleVqa();
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
        Visual Question Answering
      </Typography>
      <Box sx={{ mb: 3 }}>
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel sx={{ color: '#9CA3AF' }}>VQA Mode</InputLabel>
          <MuiSelect
            value={vqaMode}
            onChange={(e) => setVqaMode(e.target.value as 'local' | 'api')}
            sx={{
              '& .MuiSelect-select': {
                color: '#E2E8F0',
              },
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: '#4B5563',
              },
              '&:hover .MuiOutlinedInput-notchedOutline': {
                borderColor: '#5B21B6',
              },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                borderColor: '#5B21B6',
              },
            }}
          >
            <MenuItem value="local">Local Model</MenuItem>
            <MenuItem value="api">API Key</MenuItem>
          </MuiSelect>
        </FormControl>
        {vqaMode === 'local' ? (
          <Select
            options={modelOptions}
            onChange={(option) => setSelectedModel(option?.value || null)}
            placeholder="Select a model"
            styles={customStyles}
            value={modelOptions.find((option) => option.value === selectedModel)}
          />
        ) : (
          <Box>
            <TextField
              label="API Key"
              type={showApiKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              fullWidth
              margin="normal"
              variant="outlined"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowApiKey(!showApiKey)} edge="end">
                      {showApiKey ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
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
              variant="outlined"
              onClick={handleTestApiKey}
              disabled={testApiKeyLoading}
              sx={{
                mb: 2,
                borderColor: '#3B82F6',
                color: '#3B82F6',
                '&:hover': {
                  borderColor: '#2563EB',
                  color: '#2563EB',
                },
                borderRadius: '8px',
                textTransform: 'none',
                fontWeight: 500,
              }}
            >
              {testApiKeyLoading ? <CircularProgress size={20} /> : 'Test API Key'}
            </Button>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel sx={{ color: '#9CA3AF' }}>API Type</InputLabel>
              <MuiSelect
                value={apiType}
                onChange={(e) => setApiType(e.target.value as 'gemini' | 'openai')}
                sx={{
                  '& .MuiSelect-select': {
                    color: '#E2E8F0',
                  },
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#4B5563',
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#5B21B6',
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#5B21B6',
                  },
                }}
              >
                <MenuItem value="gemini">Gemini</MenuItem>
                <MenuItem value="openai">OpenAI</MenuItem>
              </MuiSelect>
            </FormControl>
          </Box>
        )}
      </Box>
      {(vqaMode === 'local' && selectedModel) || vqaMode === 'api' ? (
        <Box sx={{ mb: 3, display: 'flex', justifyContent: { xs: 'center', sm: 'flex-start' } }}>
          <Button
            variant="contained"
            onClick={handleRunModel}
            disabled={runModelLoading}
            sx={{
              backgroundColor: '#3B82F6',
              '&:hover': {
                backgroundColor: '#2563EB',
              },
              borderRadius: '8px',
              textTransform: 'none',
              fontWeight: 500,
              width: { xs: '100%', sm: 'auto' },
            }}
          >
            {runModelLoading ? <CircularProgress size={24} /> : 'Run Model'}
          </Button>
        </Box>
      ) : null}
      {runModelResult && !error && (
        <Box
          sx={{
            mt: 2,
            p: 2,
            backgroundColor: '#2D3748',
            borderRadius: '8px',
            textAlign: 'center',
            boxShadow: '0 2px 10px rgba(0, 0, 0, 0.3)',
          }}
        >
          <Typography variant="h6" sx={{ color: '#E2E8F0', mb: 1 }}>
            Model Response
          </Typography>
          <Typography variant="body1" sx={{ color: '#A5B4FC' }}>
            {runModelResult}
          </Typography>
        </Box>
      )}
      <Box sx={{ mb: 2 }}>
        <Typography variant="body2" sx={{ color: '#E2E8F0', mb: 1 }}>
          Upload Image (Optional):
        </Typography>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => {
            const file = e.target.files?.[0] || null;
            setVqaImage(file);
            if (file) {
              const reader = new FileReader();
              reader.onloadend = () => {
                setImagePreview(reader.result as string);
              };
              reader.readAsDataURL(file);
            } else {
              setImagePreview(null);
            }
          }}
          style={{
            margin: '20px 0',
            color: '#E2E8F0',
            width: '100%',
            display: 'block',
          }}
        />
      </Box>
      {imagePreview && (
        <Box sx={{ mb: 2, textAlign: 'center' }}>
          <Typography variant="body2" sx={{ color: '#E2E8F0', mb: 1 }}>
            Image Preview:
          </Typography>
          <img src={imagePreview} alt="Preview" style={{ maxWidth: '200px', maxHeight: '200px' }} />
        </Box>
      )}
      <TextField
        label="Ask a question"
        value={vqaQuestion}
        onChange={(e) => setVqaQuestion(e.target.value)}
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
        onClick={handleVqa}
        disabled={vqaLoading}
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
        {vqaLoading ? <CircularProgress size={24} /> : 'Get Answer'}
      </Button>
      {error && (
        <Typography variant="body1" color="error" sx={{ mt: 2, textAlign: 'center' }}>
          {error}
        </Typography>
      )}
      {vqaAnswer && !error && (
        <Box
          sx={{
            mt: 2,
            p: 2,
            backgroundColor: '#2D3748',
            borderRadius: '8px',
            textAlign: 'center',
            boxShadow: '0 2px 10px rgba(0, 0, 0, 0.3)',
          }}
        >
          <Typography variant="h6" sx={{ color: '#E2E8F0', mb: 1 }}>
            Answer
          </Typography>
          <Typography variant="body1" sx={{ color: '#A5B4FC', fontWeight: 500 }}>
            {vqaAnswer}
          </Typography>
        </Box>
      )}
      {vqaHistory.length > 0 && (
        <Box sx={{ mt: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="body1" sx={{ color: '#E2E8F0', textAlign: { xs: 'center', sm: 'left' } }}>
              VQA History:
            </Typography>
            <Button
              variant="outlined"
              color="error"
              onClick={handleClearAllHistory}
              disabled={clearHistoryLoading}
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
              {clearHistoryLoading ? <CircularProgress size={20} /> : 'Clear All History'}
            </Button>
          </Box>
          <TableContainer component={Paper} sx={{ backgroundColor: '#1E293B', overflowX: 'auto' }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ color: '#E2E8F0', fontWeight: 600 }}>Image</TableCell>
                  <TableCell sx={{ color: '#E2E8F0', fontWeight: 600 }}>Question</TableCell>
                  <TableCell sx={{ color: '#E2E8F0', fontWeight: 600 }}>Answer</TableCell>
                  <TableCell sx={{ color: '#E2E8F0', fontWeight: 600 }}>Timestamp</TableCell>
                  <TableCell sx={{ color: '#E2E8F0', fontWeight: 600 }}>Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {vqaHistory.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>
                      {entry.image_base64 ? (
                        <Box sx={{ position: 'relative', width: '100px', height: '100px' }}>
                          <img
                            src={`data:image/jpeg;base64,${entry.image_base64}`}
                            alt="VQA"
                            style={{ maxWidth: '100px', maxHeight: '100px', display: 'block' }}
                            onLoad={() => setHistoryImageLoading((prev) => ({ ...prev, [entry.id]: false }))}
                            onError={() => setHistoryImageLoading((prev) => ({ ...prev, [entry.id]: false }))}
                          />
                          {historyImageLoading[entry.id] && (
                            <CircularProgress
                              size={24}
                              sx={{
                                position: 'absolute',
                                top: '50%',
                                left: '50%',
                                transform: 'translate(-50%, -50%)',
                              }}
                            />
                          )}
                        </Box>
                      ) : (
                        <Typography sx={{ color: '#E2E8F0' }}>No Image</Typography>
                      )}
                    </TableCell>
                    <TableCell sx={{ color: '#E2E8F0' }}>{entry.question}</TableCell>
                    <TableCell sx={{ color: '#E2E8F0' }}>{entry.answer}</TableCell>
                    <TableCell sx={{ color: '#E2E8F0' }}>{entry.timestamp}</TableCell>
                    <TableCell>
                      <Button
                        variant="outlined"
                        color="error"
                        onClick={() => handleDeleteHistory(entry.id)}
                        disabled={historyDeleteLoading[entry.id]}
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
                        {historyDeleteLoading[entry.id] ? <CircularProgress size={20} /> : 'Delete'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}
      {vqaMode === 'local' && modelOptions.length > 0 && (
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

export default VQA;