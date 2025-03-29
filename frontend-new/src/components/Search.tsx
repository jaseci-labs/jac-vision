// import React, { useState, useEffect } from 'react';
// import {
//   Box,
//   Button,
//   TextField,
//   Typography,
//   CircularProgress,
//   Table,
//   TableBody,
//   TableCell,
//   TableContainer,
//   TableHead,
//   TableRow,
//   Paper,
//   Link,
//   IconButton,
//   InputAdornment,
//   Select,
//   MenuItem,
//   FormControl,
//   InputLabel,
// } from '@mui/material';
// import { Visibility, VisibilityOff } from '@mui/icons-material';
// import { searchModels, downloadModel, checkModelAccess, Model } from '../utils/api';
// import { toast } from 'react-toastify';

// interface SearchProps {
//   toast: typeof toast;
//   themeMode: 'light' | 'dark';
// }

// const Search: React.FC<SearchProps> = ({ toast, themeMode }) => {
//   const [searchQuery, setSearchQuery] = useState<string>('');
//   const [searchResults, setSearchResults] = useState<Model[]>([]);
//   const [allResults, setAllResults] = useState<Model[]>([]);
//   const [totalModels, setTotalModels] = useState<number>(0);
//   const [offset, setOffset] = useState<number>(0);
//   const [limit] = useState<number>(50);
//   const [searchLoading, setSearchLoading] = useState<boolean>(false);
//   const [loadMoreLoading, setLoadMoreLoading] = useState<boolean>(false);
//   const [downloadLoading, setDownloadLoading] = useState<{ [key: string]: boolean }>({});
//   const [error, setError] = useState<string>('');
//   const [tokenInput, setTokenInput] = useState<string>('');
//   const [token, setToken] = useState<string>(() => {
//     return localStorage.getItem('hf_token') || '';
//   });
//   const [showToken, setShowToken] = useState<boolean>(false);
//   const [modelAccess, setModelAccess] = useState<{
//     [key: string]: { restricted: boolean; has_access: boolean; message?: string; action?: string };
//   }>({});
//   const [modelTypeFilter, setModelTypeFilter] = useState<string>('all');
//   const [sortBy, setSortBy] = useState<string>('default');

//   const handleTokenSubmit = () => {
//     setToken(tokenInput);
//     localStorage.setItem('hf_token', tokenInput);
//     toast.success('Hugging Face token submitted successfully!');
//   };

//   const handleClearToken = () => {
//     setToken('');
//     setTokenInput('');
//     localStorage.removeItem('hf_token');
//     toast.info('Hugging Face token cleared.');
//   };

//   const handleSearch = async (newOffset: number = 0, append: boolean = false) => {
//     if (!searchQuery) {
//       setError('Please enter a search query.');
//       toast.error('Please enter a search query.');
//       return;
//     }
//     if (newOffset === 0) {
//       setSearchLoading(true);
//     } else {
//       setLoadMoreLoading(true);
//     }
//     setError('');

//     try {
//       const response = await searchModels(searchQuery, limit, newOffset);
//       const { models, total } = response; // response is already SearchModelsResponse
//       setTotalModels(total);

//       const newModels = append ? [...searchResults, ...models] : models;
//       setSearchResults(newModels);
//       setAllResults(newModels);
//       setOffset(newOffset + models.length);

//       const accessPromises = models.map(async (model: Model) => {
//         try {
//           console.log(`Checking access for ${model.id} with token: ${token}`);
//           const accessResponse = await checkModelAccess(model.id, token);
//           return { model: model.id, access: accessResponse }; // accessResponse is CheckModelAccessResponse
//         } catch (error: any) {
//           console.error(`Error checking access for ${model.id}:`, error);
//           const errorMessage = error.message || `Unable to check access for ${model.id}.`;
//           return {
//             model: model.id,
//             access: {
//               restricted: true,
//               has_access: false,
//               message: errorMessage,
//               action: `Visit https://huggingface.co/${model.id} to request access.`,
//             },
//           };
//         }
//       });

//       const accessResults = await Promise.all(accessPromises);
//       const accessMap = accessResults.reduce(
//         (acc: any, { model, access }: any) => {
//           acc[model] = access;
//           return acc;
//         },
//         { ...modelAccess }
//       );
//       setModelAccess(accessMap);

//       toast.success('Search completed successfully!');
//     } catch (error: any) {
//       const errorMessage = error.message || 'Error searching for models. Check the console.';
//       setError(errorMessage);
//       toast.error(errorMessage);
//       console.error(error);
//     }
//     setSearchLoading(false);
//     setLoadMoreLoading(false);
//   };

//   const handleDownload = async (model: string) => {
//     if (!model || typeof model !== 'string') {
//       toast.error('Invalid model name. Please select a valid model.');
//       return;
//     }

//     console.log(`Attempting to download ${model} with token: ${token}`);

//     const accessInfo = modelAccess[model];
//     if (accessInfo && accessInfo.restricted && !accessInfo.has_access) {
//       toast.error(
//         <>
//           {accessInfo.message}{' '}
//           <Link href={accessInfo.action?.split('Visit ')[1]} target="_blank" rel="noopener noreferrer">
//             Request Access
//           </Link>
//         </>,
//         {
//           autoClose: false,
//           closeOnClick: false,
//         }
//       );
//       return;
//     }

//     setDownloadLoading((prev) => ({ ...prev, [model]: true }));
//     try {
//       const response = await downloadModel(model, token);
//       toast.success(response.message || `Model ${model} downloaded successfully!`); // response is DownloadModelResponse
//     } catch (error: any) {
//       console.error('Download Error:', error);
//       if (error.message.includes('403')) {
//         const errorMessage = error.message || 'Model is restricted or your token is invalid.';
//         const action = `Visit https://huggingface.co/${model} to request access.`;
//         toast.error(
//           <>
//             {errorMessage}{' '}
//             <Link href={action.split('Visit ')[1]} target="_blank" rel="noopener noreferrer">
//               Request Access
//             </Link>
//           </>,
//           {
//             autoClose: false,
//             closeOnClick: false,
//           }
//         );
//       } else {
//         toast.error(error.message || 'Failed to download model. Check the console for details.');
//       }
//     }
//     setDownloadLoading((prev) => ({ ...prev, [model]: false }));
//   };

//   const handleLoadMore = () => {
//     handleSearch(offset, true);
//   };

//   useEffect(() => {
//     let filteredModels = [...allResults];

//     if (modelTypeFilter !== 'all') {
//       filteredModels = filteredModels.filter((model) =>
//         model.tags.includes(modelTypeFilter)
//       );
//     }

//     if (sortBy === 'likes') {
//       filteredModels.sort((a, b) => b.likes - a.likes);
//     } else if (sortBy === 'downloads') {
//       filteredModels.sort((a, b) => b.downloads - a.downloads);
//     }

//     setSearchResults(filteredModels);
//   }, [modelTypeFilter, sortBy, allResults]);

//   const handleKeyPress = (e: React.KeyboardEvent) => {
//     if (e.key === 'Enter') {
//       handleSearch();
//     }
//   };

//   const handleToggleTokenVisibility = () => {
//     setShowToken((prev) => !prev);
//   };

//   return (
//     <Box
//       className="content-section"
//       sx={{
//         p: { xs: 2, sm: 3, md: 4 },
//         maxWidth: '1200px',
//         mx: 'auto',
//         width: '100%',
//       }}
//     >
//       <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, textAlign: { xs: 'center', sm: 'left' } }}>
//         Search for a Model
//       </Typography>

//       <Box sx={{ mb: 3, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
//         <TextField
//           label="Hugging Face Access Token (optional, required for restricted models)"
//           value={tokenInput}
//           onChange={(e) => setTokenInput(e.target.value)}
//           fullWidth
//           margin="normal"
//           variant="outlined"
//           placeholder="e.g., hf_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
//           type={showToken ? 'text' : 'password'}
//           InputProps={{
//             endAdornment: (
//               <InputAdornment position="end">
//                 <IconButton onClick={handleToggleTokenVisibility} edge="end">
//                   {showToken ? <VisibilityOff /> : <Visibility />}
//                 </IconButton>
//               </InputAdornment>
//             ),
//           }}
//           sx={{
//             flex: 1,
//             '& .MuiOutlinedInput-root': {
//               '& fieldset': {
//                 borderColor: '#4B5563',
//               },
//               '&:hover fieldset': {
//                 borderColor: '#5B21B6',
//               },
//               '&.Mui-focused fieldset': {
//                 borderColor: '#5B21B6',
//               },
//             },
//             '& .MuiInputLabel-root': {
//               color: '#9CA3AF',
//             },
//             '& .MuiInputBase-input': {
//               color: '#E2E8F0',
//             },
//           }}
//         />
//         <Button
//           variant="contained"
//           onClick={handleTokenSubmit}
//           sx={{
//             mt: { xs: 0, sm: 2 },
//             backgroundColor: '#5B21B6',
//             '&:hover': {
//               backgroundColor: '#8B5CF6',
//               transform: 'scale(1.05)',
//               transition: 'all 0.2s ease-in-out',
//             },
//             borderRadius: '8px',
//             textTransform: 'none',
//             fontWeight: 500,
//             height: '56px',
//             px: 3,
//           }}
//         >
//           Submit Token
//         </Button>
//         <Button
//           variant="outlined"
//           onClick={handleClearToken}
//           sx={{
//             mt: { xs: 0, sm: 2 },
//             borderColor: '#EF4444',
//             color: '#EF4444',
//             '&:hover': {
//               borderColor: '#DC2626',
//               color: '#DC2626',
//               transform: 'scale(1.05)',
//               transition: 'all 0.2s ease-in-out',
//             },
//             borderRadius: '8px',
//             textTransform: 'none',
//             fontWeight: 500,
//             height: '56px',
//             px: 3,
//           }}
//         >
//           Clear Token
//         </Button>
//       </Box>
//       <Typography variant="body2" sx={{ color: '#9CA3AF', mt: 1, mb: 3 }}>
//         Get your token from{' '}
//         <Link
//           href="https://huggingface.co/settings/tokens"
//           target="_blank"
//           rel="noopener noreferrer"
//           sx={{ color: '#5B21B6', textDecoration: 'underline' }}
//         >
//           Hugging Face Settings
//         </Link>
//         . Required for restricted models.
//       </Typography>

//       <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2, mb: 2, alignItems: 'center' }}>
//         <TextField
//           label="Search for a model (e.g., LLaVA)"
//           value={searchQuery}
//           onChange={(e) => setSearchQuery(e.target.value)}
//           onKeyPress={handleKeyPress}
//           fullWidth
//           margin="normal"
//           variant="outlined"
//           sx={{
//             flex: 1,
//             '& .MuiOutlinedInput-root': {
//               '& fieldset': {
//                 borderColor: '#4B5563',
//               },
//               '&:hover fieldset': {
//                 borderColor: '#5B21B6',
//               },
//               '&.Mui-focused fieldset': {
//                 borderColor: '#5B21B6',
//               },
//             },
//             '& .MuiInputLabel-root': {
//               color: '#9CA3AF',
//             },
//             '& .MuiInputBase-input': {
//               color: '#E2E8F0',
//             },
//           }}
//         />
//         <FormControl sx={{ minWidth: 150, mt: { xs: 0, sm: 2 } }}>
//           <InputLabel sx={{ color: '#9CA3AF' }}>Model Type</InputLabel>
//           <Select
//             value={modelTypeFilter}
//             onChange={(e) => setModelTypeFilter(e.target.value as string)}
//             sx={{
//               color: '#E2E8F0',
//               '& .MuiOutlinedInput-notchedOutline': {
//                 borderColor: '#4B5563',
//               },
//               '&:hover .MuiOutlinedInput-notchedOutline': {
//                 borderColor: '#5B21B6',
//               },
//               '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
//                 borderColor: '#5B21B6',
//               },
//             }}
//           >
//             <MenuItem value="all">All</MenuItem>
//             <MenuItem value="text-generation">Text Generation</MenuItem>
//             <MenuItem value="vision-language">Vision-Language</MenuItem>
//             <MenuItem value="image-classification">Image Classification</MenuItem>
//           </Select>
//         </FormControl>
//         <FormControl sx={{ minWidth: 150, mt: { xs: 0, sm: 2 } }}>
//           <InputLabel sx={{ color: '#9CA3AF' }}>Sort By</InputLabel>
//           <Select
//             value={sortBy}
//             onChange={(e) => setSortBy(e.target.value as string)}
//             sx={{
//               color: '#E2E8F0',
//               '& .MuiOutlinedInput-notchedOutline': {
//                 borderColor: '#4B5563',
//               },
//               '&:hover .MuiOutlinedInput-notchedOutline': {
//                 borderColor: '#5B21B6',
//               },
//               '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
//                 borderColor: '#5B21B6',
//               },
//             }}
//           >
//             <MenuItem value="default">Default</MenuItem>
//             <MenuItem value="likes">Likes</MenuItem>
//             <MenuItem value="downloads">Downloads</MenuItem>
//           </Select>
//         </FormControl>
//         <Button
//           variant="contained"
//           onClick={() => handleSearch()}
//           disabled={searchLoading}
//           sx={{
//             mt: { xs: 0, sm: 2 },
//             backgroundColor: '#5B21B6',
//             '&:hover': {
//               backgroundColor: '#8B5CF6',
//               transform: 'scale(1.05)',
//               transition: 'all 0.2s ease-in-out',
//             },
//             borderRadius: '8px',
//             textTransform: 'none',
//             fontWeight: 500,
//             height: '56px',
//             px: 3,
//           }}
//         >
//           {searchLoading ? <CircularProgress size={24} /> : 'Search'}
//         </Button>
//       </Box>

//       {error && (
//         <Typography variant="body1" color="error" sx={{ mt: 2, textAlign: 'center' }}>
//           {error}
//         </Typography>
//       )}

//       {searchResults.length > 0 && (
//         <Box sx={{ mt: 3 }}>
//           <Typography variant="body1" sx={{ color: '#E2E8F0', mb: 2, textAlign: { xs: 'center', sm: 'left' } }}>
//             Search Results ({searchResults.length}/{totalModels}):
//           </Typography>
//           <TableContainer component={Paper} sx={{ backgroundColor: '#1E293B', overflowX: 'auto' }}>
//             <Table>
//               <TableHead>
//                 <TableRow>
//                   <TableCell sx={{ color: '#E2E8F0', fontWeight: 600 }}>Model Name</TableCell>
//                   <TableCell sx={{ color: '#E2E8F0', fontWeight: 600 }}>Size</TableCell>
//                   <TableCell sx={{ color: '#E2E8F0', fontWeight: 600 }}>Access Status</TableCell>
//                   <TableCell sx={{ color: '#E2E8F0', fontWeight: 600 }}>Action</TableCell>
//                 </TableRow>
//               </TableHead>
//               <TableBody>
//                 {searchResults.map((model, index) => (
//                   <TableRow key={index}>
//                     <TableCell sx={{ color: '#E2E8F0' }}>{model.id}</TableCell>
//                     <TableCell sx={{ color: '#E2E8F0' }}>{model.size}</TableCell>
//                     <TableCell sx={{ color: '#E2E8F0' }}>
//                       {modelAccess[model.id] ? (
//                         <>
//                           {modelAccess[model.id].restricted ? 'Restricted' : 'Public'}
//                           {modelAccess[model.id].restricted && modelAccess[model.id].has_access ? ', Access Granted' : ''}
//                         </>
//                       ) : (
//                         'Checking...'
//                       )}
//                     </TableCell>
//                     <TableCell>
//                       <Button
//                         variant="contained"
//                         onClick={() => window.open(`https://huggingface.co/${model.id}`, '_blank')}
//                         sx={{
//                           backgroundColor: '#3B82F6',
//                           '&:hover': {
//                             backgroundColor: '#2563EB',
//                           },
//                           borderRadius: '8px',
//                           textTransform: 'none',
//                           fontWeight: 500,
//                           px: 2,
//                           mr: 1,
//                         }}
//                       >
//                         Request Access
//                       </Button>
//                       <Button
//                         variant="contained"
//                         onClick={() => handleDownload(model.id)}
//                         disabled={downloadLoading[model.id]}
//                         sx={{
//                           backgroundColor: '#10B981',
//                           '&:hover': {
//                             backgroundColor: '#059669',
//                           },
//                           borderRadius: '8px',
//                           textTransform: 'none',
//                           fontWeight: 500,
//                           px: 2,
//                         }}
//                       >
//                         {downloadLoading[model.id] ? <CircularProgress size={20} /> : 'Download'}
//                       </Button>
//                     </TableCell>
//                   </TableRow>
//                 ))}
//               </TableBody>
//             </Table>
//           </TableContainer>
//           {searchResults.length < totalModels && (
//             <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
//               <Button
//                 variant="contained"
//                 onClick={handleLoadMore}
//                 disabled={loadMoreLoading}
//                 sx={{
//                   backgroundColor: '#5B21B6',
//                   '&:hover': {
//                     backgroundColor: '#8B5CF6',
//                     transform: 'scale(1.05)',
//                     transition: 'all 0.2s ease-in-out',
//                   },
//                   borderRadius: '8px',
//                   textTransform: 'none',
//                   fontWeight: 500,
//                   px: 3,
//                 }}
//               >
//                 {loadMoreLoading ? <CircularProgress size={24} /> : 'Load More'}
//               </Button>
//             </Box>
//           )}
//         </Box>
//       )}
//     </Box>
//   );
// };

// export default Search;















import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Link,
  IconButton,
  InputAdornment,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { searchModels, downloadModel, checkModelAccess, Model } from '../utils/api';
import { toast } from 'react-toastify';
import Chatbot from './Chatbot';

interface SearchProps {
  toast: typeof toast;
  themeMode: 'light' | 'dark';
}

const Search: React.FC<SearchProps> = ({ toast, themeMode }) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<Model[]>([]);
  const [allResults, setAllResults] = useState<Model[]>([]);
  const [totalModels, setTotalModels] = useState<number>(0);
  const [offset, setOffset] = useState<number>(0);
  const [limit] = useState<number>(50);
  const [searchLoading, setSearchLoading] = useState<boolean>(false);
  const [loadMoreLoading, setLoadMoreLoading] = useState<boolean>(false);
  const [downloadLoading, setDownloadLoading] = useState<{ [key: string]: boolean }>({});
  const [error, setError] = useState<string>('');
  const [tokenInput, setTokenInput] = useState<string>('');
  const [token, setToken] = useState<string>(() => {
    return localStorage.getItem('hf_token') || '';
  });
  const [showToken, setShowToken] = useState<boolean>(false);
  const [modelAccess, setModelAccess] = useState<{
    [key: string]: { restricted: boolean; has_access: boolean; message?: string; action?: string };
  }>({});
  const [modelTypeFilter, setModelTypeFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('default');
  const [apiKey, setApiKey] = useState<string>(localStorage.getItem('chatbotApiKey') || '');
  const [showApiKey, setShowApiKey] = useState<boolean>(false);

  const handleTokenSubmit = () => {
    setToken(tokenInput);
    localStorage.setItem('hf_token', tokenInput);
    toast.success('Hugging Face token submitted successfully!');
  };

  const handleClearToken = () => {
    setToken('');
    setTokenInput('');
    localStorage.removeItem('hf_token');
    toast.info('Hugging Face token cleared.');
  };

  const handleSearch = async (newOffset: number = 0, append: boolean = false) => {
    if (!searchQuery) {
      setError('Please enter a search query.');
      toast.error('Please enter a search query.');
      return;
    }
    if (newOffset === 0) {
      setSearchLoading(true);
    } else {
      setLoadMoreLoading(true);
    }
    setError('');

    try {
      const response = await searchModels(searchQuery, limit, newOffset);
      const { models, total } = response;
      setTotalModels(total);

      const newModels = append ? [...searchResults, ...models] : models;
      setSearchResults(newModels);
      setAllResults(newModels);
      setOffset(newOffset + models.length);

      const accessPromises = models.map(async (model: Model) => {
        try {
          console.log(`Checking access for ${model.id} with token: ${token}`);
          const accessResponse = await checkModelAccess(model.id, token);
          return { model: model.id, access: accessResponse };
        } catch (error: any) {
          console.error(`Error checking access for ${model.id}:`, error);
          const errorMessage = error.message || `Unable to check access for ${model.id}.`;
          return {
            model: model.id,
            access: {
              restricted: true,
              has_access: false,
              message: errorMessage,
              action: `Visit https://huggingface.co/${model.id} to request access.`,
            },
          };
        }
      });

      const accessResults = await Promise.all(accessPromises);
      const accessMap = accessResults.reduce(
        (acc: any, { model, access }: any) => {
          acc[model] = access;
          return acc;
        },
        { ...modelAccess }
      );
      setModelAccess(accessMap);

      toast.success('Search completed successfully!');
    } catch (error: any) {
      const errorMessage = error.message || 'Error searching for models. Check the console.';
      setError(errorMessage);
      toast.error(errorMessage);
      console.error(error);
    }
    setSearchLoading(false);
    setLoadMoreLoading(false);
  };

  const handleDownload = async (model: string) => {
    if (!model || typeof model !== 'string') {
      toast.error('Invalid model name. Please select a valid model.');
      return;
    }

    console.log(`Attempting to download ${model} with token: ${token}`);

    const accessInfo = modelAccess[model];
    if (accessInfo && accessInfo.restricted && !accessInfo.has_access) {
      toast.error(
        <>
          {accessInfo.message}{' '}
          <Link href={accessInfo.action?.split('Visit ')[1]} target="_blank" rel="noopener noreferrer">
            Request Access
          </Link>
        </>,
        {
          autoClose: false,
          closeOnClick: false,
        }
      );
      return;
    }

    setDownloadLoading((prev) => ({ ...prev, [model]: true }));
    try {
      const response = await downloadModel(model, token);
      toast.success(response.message || `Model ${model} downloaded successfully!`);
    } catch (error: any) {
      console.error('Download Error:', error);
      if (error.message.includes('403')) {
        const errorMessage = error.message || 'Model is restricted or your token is invalid.';
        const action = `Visit https://huggingface.co/${model} to request access.`;
        toast.error(
          <>
            {errorMessage}{' '}
            <Link href={action.split('Visit ')[1]} target="_blank" rel="noopener noreferrer">
              Request Access
            </Link>
          </>,
          {
            autoClose: false,
            closeOnClick: false,
          }
        );
      } else {
        toast.error(error.message || 'Failed to download model. Check the console for details.');
      }
    }
    setDownloadLoading((prev) => ({ ...prev, [model]: false }));
  };

  const handleLoadMore = () => {
    handleSearch(offset, true);
  };

  useEffect(() => {
    let filteredModels = [...allResults];

    if (modelTypeFilter !== 'all') {
      filteredModels = filteredModels.filter((model) =>
        model.tags.includes(modelTypeFilter)
      );
    }

    if (sortBy === 'likes') {
      filteredModels.sort((a, b) => b.likes - a.likes);
    } else if (sortBy === 'downloads') {
      filteredModels.sort((a, b) => b.downloads - a.downloads);
    }

    setSearchResults(filteredModels);
  }, [modelTypeFilter, sortBy, allResults]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleToggleTokenVisibility = () => {
    setShowToken((prev) => !prev);
  };

  useEffect(() => {
    localStorage.setItem('chatbotApiKey', apiKey);
  }, [apiKey]);

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

      <Box sx={{ mb: 3, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
        <TextField
          label="Hugging Face Access Token (optional, required for restricted models)"
          value={tokenInput}
          onChange={(e) => setTokenInput(e.target.value)}
          fullWidth
          margin="normal"
          variant="outlined"
          placeholder="e.g., hf_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
          type={showToken ? 'text' : 'password'}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton onClick={handleToggleTokenVisibility} edge="end">
                  {showToken ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            ),
          }}
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
          onClick={handleTokenSubmit}
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
          Submit Token
        </Button>
        <Button
          variant="outlined"
          onClick={handleClearToken}
          sx={{
            mt: { xs: 0, sm: 2 },
            borderColor: '#EF4444',
            color: '#EF4444',
            '&:hover': {
              borderColor: '#DC2626',
              color: '#DC2626',
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
          Clear Token
        </Button>
      </Box>
      <Typography variant="body2" sx={{ color: '#9CA3AF', mt: 1, mb: 3 }}>
        Get your token from{' '}
        <Link
          href="https://huggingface.co/settings/tokens"
          target="_blank"
          rel="noopener noreferrer"
          sx={{ color: '#5B21B6', textDecoration: 'underline' }}
        >
          Hugging Face Settings
        </Link>
        . Required for restricted models.
      </Typography>

      <Box sx={{ mb: 3 }}>
        <Typography variant="body1" sx={{ color: '#E2E8F0', mb: 2 }}>
          Chatbot Settings (Required to use the assistant)
        </Typography>
        <TextField
          label="Gemini API Key"
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
        <Typography variant="body2" sx={{ color: '#9CA3AF', mt: 1, mb: 3 }}>
          Get your API key from{' '}
          <Link
            href="https://ai.google.dev"
            target="_blank"
            rel="noopener noreferrer"
            sx={{ color: '#5B21B6', textDecoration: 'underline' }}
          >
            Google AI
          </Link>
          . Required to use the chatbot assistant.
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2, mb: 2, alignItems: 'center' }}>
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
        <FormControl sx={{ minWidth: 150, mt: { xs: 0, sm: 2 } }}>
          <InputLabel sx={{ color: '#9CA3AF' }}>Model Type</InputLabel>
          <Select
            value={modelTypeFilter}
            onChange={(e) => setModelTypeFilter(e.target.value as string)}
            sx={{
              color: '#E2E8F0',
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
            <MenuItem value="all">All</MenuItem>
            <MenuItem value="text-generation">Text Generation</MenuItem>
            <MenuItem value="vision-language">Vision-Language</MenuItem>
            <MenuItem value="image-classification">Image Classification</MenuItem>
          </Select>
        </FormControl>
        <FormControl sx={{ minWidth: 150, mt: { xs: 0, sm: 2 } }}>
          <InputLabel sx={{ color: '#9CA3AF' }}>Sort By</InputLabel>
          <Select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as string)}
            sx={{
              color: '#E2E8F0',
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
            <MenuItem value="default">Default</MenuItem>
            <MenuItem value="likes">Likes</MenuItem>
            <MenuItem value="downloads">Downloads</MenuItem>
          </Select>
        </FormControl>
        <Button
          variant="contained"
          onClick={() => handleSearch()}
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
            Search Results ({searchResults.length}/{totalModels}):
          </Typography>
          <TableContainer component={Paper} sx={{ backgroundColor: '#1E293B', overflowX: 'auto' }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ color: '#E2E8F0', fontWeight: 600 }}>Model Name</TableCell>
                  <TableCell sx={{ color: '#E2E8F0', fontWeight: 600 }}>Size</TableCell>
                  <TableCell sx={{ color: '#E2E8F0', fontWeight: 600 }}>Access Status</TableCell>
                  <TableCell sx={{ color: '#E2E8F0', fontWeight: 600 }}>Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {searchResults.map((model, index) => (
                  <TableRow key={index}>
                    <TableCell sx={{ color: '#E2E8F0' }}>{model.id}</TableCell>
                    <TableCell sx={{ color: '#E2E8F0' }}>{model.size}</TableCell>
                    <TableCell sx={{ color: '#E2E8F0' }}>
                      {modelAccess[model.id] ? (
                        <>
                          {modelAccess[model.id].restricted ? 'Restricted' : 'Public'}
                          {modelAccess[model.id].restricted && modelAccess[model.id].has_access ? ', Access Granted' : ''}
                        </>
                      ) : (
                        'Checking...'
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="contained"
                        onClick={() => window.open(`https://huggingface.co/${model.id}`, '_blank')}
                        sx={{
                          backgroundColor: '#3B82F6',
                          '&:hover': {
                            backgroundColor: '#2563EB',
                          },
                          borderRadius: '8px',
                          textTransform: 'none',
                          fontWeight: 500,
                          px: 2,
                          mr: 1,
                        }}
                      >
                        Request Access
                      </Button>
                      <Button
                        variant="contained"
                        onClick={() => handleDownload(model.id)}
                        disabled={downloadLoading[model.id]}
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
                        {downloadLoading[model.id] ? <CircularProgress size={20} /> : 'Download'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          {searchResults.length < totalModels && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
              <Button
                variant="contained"
                onClick={handleLoadMore}
                disabled={loadMoreLoading}
                sx={{
                  backgroundColor: '#5B21B6',
                  '&:hover': {
                    backgroundColor: '#8B5CF6',
                    transform: 'scale(1.05)',
                    transition: 'all 0.2s ease-in-out',
                  },
                  borderRadius: '8px',
                  textTransform: 'none',
                  fontWeight: 500,
                  px: 3,
                }}
              >
                {loadMoreLoading ? <CircularProgress size={24} /> : 'Load More'}
              </Button>
            </Box>
          )}
        </Box>
      )}

      <Chatbot apiKey={apiKey} /> {/* Removed apiType prop */}
    </Box>
  );
};

export default Search;