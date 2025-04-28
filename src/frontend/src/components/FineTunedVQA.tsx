import React, { useEffect } from 'react';
import Select from 'react-select';
import { Box, Button, TextField, Typography, CircularProgress, IconButton } from '@mui/material';
import { ThumbUp, ThumbDown } from '@mui/icons-material';
import { fetchFineTunedModels, loadFineTunedModelForInference, inferenceWithFineTunedModel } from '../utils/api';
import { toast } from 'react-toastify';
import { useFineTunedVQAStore } from '../utils/FineTunedVQAStore';

interface VQAProps {
    selectedModel: string | null;
    setSelectedModel: (model: string | null) => void;
    toast: typeof toast;
}

const FineTunedVQA: React.FC<VQAProps> = ({ selectedModel, setSelectedModel, toast }) => {
    const {
        vqaImage,
        setVqaImage,
        vqaQuestion,
        setVqaQuestion,
        vqaAnswer,
        setVqaAnswer,
        vqaLoading,
        setVqaLoading,
        runModelLoading,
        setRunModelLoading,
        error,
        setError,
        modelOptions,
        setModelOptions,
        imagePreview,
        setImagePreview
    } = useFineTunedVQAStore();

    // const [vqaImage, setVqaImage] = useState<File | null>(null);
    // const [vqaQuestion, setVqaQuestion] = useState<string>('');
    // const [vqaAnswer, setVqaAnswer] = useState<string>('');
    // const [vqaLoading, setVqaLoading] = useState<boolean>(false);
    // const [runModelLoading, setRunModelLoading] = useState<boolean>(false);
    // const [error, setError] = useState<string>('');
    // const [modelOptions, setModelOptions] = useState<ModelOption[]>([]);
    // const [imagePreview, setImagePreview] = useState<string | null>(null);

    const fetchModels = async () => {
        try {
            const response = await fetchFineTunedModels();
            const models = response.models || [];
            const options = models.map((model: string) => ({
                value: model,
                label: model,
            }));
            setModelOptions(options);
        } catch (error: any) {
            setError('Error loading models. Check the console.');
            toast.error('Error loading models. Check the console.');
            console.error(error);
        }
    };

    useEffect(() => {
        fetchModels();
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

    const extractAssistantResponse = (text: string) => {
        const match = text.match(/assistant\n([\s\S]*)$/);
        if (match) {
            console.log('Extracted response:', match[1]);
            return match[1].trim();
        }
        return text.trim();
    };

    const handleVqa = async () => {
        if (!vqaQuestion || !selectedModel) {
            toast.error('Please upload an image and ask a question.');
            return;
        }
        setVqaLoading(true);
        setError('');
        try {
            const response = await inferenceWithFineTunedModel(
                selectedModel,
                vqaImage,
                vqaQuestion
            );
            if (response.answer) {
                console.log(extractAssistantResponse(response.answer));
                setVqaAnswer(extractAssistantResponse(response.answer));
            } else {
                setError('No answer found. Please try again.');
                toast.error('No answer found. Please try again.');
            }
        } catch (error: any) {
            setError('Error during inference. Check the console.');
            toast.error('Error during inference. Check the console.');
        } finally {
            setVqaLoading(false);
        }
    };

    const handleLoadModel = async () => {
        if (!selectedModel) {
            toast.error('Please select a model first.');
            return;
        }
        setRunModelLoading(true);
        try {
            const response = await loadFineTunedModelForInference(selectedModel);
            if (response.message.endsWith('successfully')) {
                toast.success('Model loaded successfully.');
            } else {
                setError('Model loading failed. Please try again.');
                toast.error('Model loading failed. Please try again.');
            }
        } catch (error: any) {
            setError('Error loading model. Check the console.');
            toast.error('Error loading model. Check the console.');
        } finally {
            setRunModelLoading(false);
        }
    };

    const handleFeedback = (type: 'up' | 'down') => {
        console.log('Feedback given:', type);
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
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 1, textAlign: { xs: 'center', sm: 'left' } }}>
                Visual Question Answering
            </Typography>
            <Typography sx={{ mb: 2, textAlign: { xs: 'center', sm: 'left' } }}>(Important: Select the model and click Load Model button before inferencing the model.)</Typography>
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: { xs: 'column', sm: 'row' },
                    alignItems: 'center',
                    justifyContent: 'flex-start',
                    gap: 2,
                    width: '100%', // full width of parent
                    mb: 3,
                }}
            >
                <Box sx={{ flex: 1, width: '100%' }}>
                    <Select
                        options={modelOptions}
                        onChange={(option) => setSelectedModel(option?.value || null)}
                        placeholder="Select a model"
                        styles={customStyles}
                        value={modelOptions.find((option) => option.value === selectedModel)}
                    />
                </Box>
                <Button
                    variant="contained"
                    onClick={handleLoadModel}
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
                    {runModelLoading ? <CircularProgress size={24} /> : 'Load Model'}
                </Button>
            </Box>

            <Box sx={{ mb: 2 }}>
                <Typography variant="body2" sx={{ color: '#E2E8F0', mb: 1 }}>
                    Upload Image (Optional):
                </Typography>

                <Box
                    sx={{
                        display: 'flex',
                        flexDirection: { xs: 'column', sm: 'row' },
                        alignItems: 'center',
                        gap: 1.5,
                    }}
                >
                    <Box>
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
                                color: '#E2E8F0',
                                display: 'block',
                                width: '100%',
                                maxWidth: '250px',
                            }}
                        />
                    </Box>

                    {imagePreview && (
                        <Box>
                            <img
                                src={imagePreview}
                                alt="Preview"
                                style={{
                                    width: '60px',
                                    height: '60px',
                                    objectFit: 'cover',
                                    borderRadius: '6px',
                                    border: '1px solid #CBD5E1',
                                }}
                            />
                        </Box>
                    )}
                </Box>
            </Box>

            <TextField
                label="Ask a question"
                value={vqaQuestion}
                onChange={(e) => setVqaQuestion(e.target.value)}
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
                {vqaLoading ? <CircularProgress size={24} /> : 'Get Response'}
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
                        textAlign: 'left',
                        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.3)',
                        whiteSpace: 'pre-line',
                    }}
                >
                    <Typography variant="h6" sx={{ color: '#E2E8F0', mb: 1 }}>
                        Response
                    </Typography>
                    <Typography variant="body1" sx={{ color: '#A5B4FC', fontWeight: 500, mb: 2 }}>
                        {vqaAnswer}
                    </Typography>

                    <Box sx={{ display: 'flex', gap: 2 }}>
                        <IconButton
                            onClick={() => handleFeedback('up')}
                            sx={{ color: 'lightgreen' }}
                            aria-label="thumbs up"
                        >
                            <ThumbUp />
                        </IconButton>
                        <IconButton
                            onClick={() => handleFeedback('down')}
                            sx={{ color: 'tomato' }}
                            aria-label="thumbs down"
                        >
                            <ThumbDown />
                        </IconButton>
                    </Box>
                </Box>
            )}

        </Box>
    );
};

export default FineTunedVQA;