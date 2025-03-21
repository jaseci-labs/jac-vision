import React, { useState } from 'react';
import { Box, Button, TextField, Typography, CircularProgress, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';
import { searchModels, downloadModel } from '../utils/api';
import { toast } from 'react-toastify';

interface SearchProps {
  toast: typeof toast;
  themeMode: 'light' | 'dark';
}

const Search: React.FC<SearchProps> = ({ toast, themeMode }) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [searchLoading, setSearchLoading] = useState<boolean>(false);
  const [downloadLoading, setDownloadLoading] = useState<{ [key: string]: boolean }>({});
  const [error, setError] = useState<string>('');

  const handleSearch = async () => {
    if (!searchQuery) {
      setError('Please enter a search query.');
      toast.error('Please enter a search query.');
      return;
    }
    setSearchLoading(true);
    setError('');
    setSearchResults([]);
    try {
      const response = await searchModels(searchQuery);
      setSearchResults(response.data.models || []);
      toast.success('Search completed successfully!');
    } catch (error) {
      setError('Error searching for models. Check the console.');
      toast.error('Error searching for models. Check the console.');
      console.error(error);
    }
    setSearchLoading(false);
  };

  const handleDownload = async (model: string) => {
    setDownloadLoading((prev) => ({ ...prev, [model]: true }));
    try {
      const response = await downloadModel(model);
      toast.success(response.data.message || `Model ${model} downloaded successfully!`);
    } catch (error: any) {
      console.error('Download Error', error);
      toast.error(error.response?.data?.message || 'Failed to download model.');
    }
    setDownloadLoading((prev) => ({ ...prev, [model]: false }));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
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
        Search for a Model
      </Typography>
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2, mb: 2 }}>
        <TextField
          label="Search for a model (e.g., LLaVA)"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyPress={handleKeyPress}
          fullWidth
          margin="normal"
          variant="outlined"
          sx={{
            flex: 1,
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
          onClick={handleSearch}
          disabled={searchLoading}
          sx={{
            mt: { xs: 0, sm: 2 },
            backgroundColor: '#5B21B6',
            '&:hover': {
              backgroundColor: '#8B5CF6',
              transform: 'scale(1.05)',
              transition: 'all 0.2s ease-in-out',
            },
            borderRadius: '8px',
            textTransform: 'none',
            fontWeight: 500,
            height: '56px',
            px: 3,
          }}
        >
          {searchLoading ? <CircularProgress size={24} /> : 'Search'}
        </Button>
      </Box>
      {error && (
        <Typography variant="body1" color="error" sx={{ mt: 2, textAlign: 'center' }}>
          {error}
        </Typography>
      )}
      {searchResults.length > 0 && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="body1" sx={{ color: '#E2E8F0', mb: 2, textAlign: { xs: 'center', sm: 'left' } }}>
            Search Results:
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
                {searchResults.map((model, index) => (
                  <TableRow key={index}>
                    <TableCell sx={{ color: '#E2E8F0' }}>{model}</TableCell>
                    <TableCell>
                      <Button
                        variant="contained"
                        onClick={() => handleDownload(model)}
                        disabled={downloadLoading[model]}
                        sx={{
                          backgroundColor: '#10B981',
                          '&:hover': {
                            backgroundColor: '#059669',
                          },
                          borderRadius: '8px',
                          textTransform: 'none',
                          fontWeight: 500,
                          px: 2,
                        }}
                      >
                        {downloadLoading[model] ? <CircularProgress size={20} /> : 'Download'}
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

export default Search;