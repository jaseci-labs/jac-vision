import axios from 'axios';

export const API_URL = "https://wsq3ckx8mi56ep-4000.proxy.runpod.net";

interface UploadImageFolderResponse {
    message: string;
    folder_name: string;
}

interface GetNextImageResponse {
    done?: boolean;
    message?: string;
    image_path?: string;
    caption?: string;
    total?: number;
}

interface SaveCaptionRequest {
    caption: string;
    image_path: string;
    dataset_path: string;
}

interface SaveCaptionResponse {
    message: string;
}

interface GetJsonResponse {
    data: any;
}

interface ClearDataResponse {
    message: string;
}

interface LoadPromptsResponse {
    prompt: string;
}

interface AutoCaptionProgressResponse {
    status: string;
    progress: any;
}

const handleApiError = (error: any): never => {
    if (axios.isAxiosError(error)) {
        const message = error.response?.data?.detail || error.message;
        throw new Error(`API Error: ${message}`);
    }
    throw new Error(`Unexpected Error: ${error.message || String(error)}`);
};

export const uploadImageFolder = async (formData: FormData): Promise<UploadImageFolderResponse> => {
    try {
        const response = await axios.post(`${API_URL}/api/datasets/upload-image-folder`, formData, {
            timeout: 60000,
        });
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

// Get the next image for captioning
export const getNextImage = async (dataset_path: string, apiKey: string, apiType: string, model: string = 'google/gemma-3-12b-it:free'): Promise<GetNextImageResponse> => {
    try {
        const response = await axios.get(`${API_URL}/api/datasets/get-next-image`, {
            params: {
                dataset_path: dataset_path,
                api_key: apiKey,
                api_type: apiType,
                model: model
            },
        });
        console.log('Response from getNextImage:', response.data);
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

// Save the edited caption
export const saveCaption = async (request: SaveCaptionRequest): Promise<SaveCaptionResponse> => {
    try {
        const response = await axios.post(`${API_URL}/api/datasets/save-caption`, request);
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

// Download the JSON file
export const downloadJson = async (): Promise<Blob> => {
    try {
        const response = await axios.get(`${API_URL}/api/datasets/download-json`, {
            params: {
                file_path: localStorage.getItem('datasetName')
            }
        });
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

// Download the dataset as a ZIP file
export const downloadDataset = async (): Promise<Blob> => {
    try {
        const response = await axios.get(`${API_URL}/api/datasets/download-dataset`, {
            params: {
                file_path: localStorage.getItem('datasetName')
            },
            responseType: 'blob'
        });
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

// Get the JSON data for preview
export const getJson = async (): Promise<GetJsonResponse> => {
    const datasetPath = localStorage.getItem('datasetName');
    if (!datasetPath) {
        throw new Error('Dataset path not found in local storage');
    }
    try {
        const response = await axios.get(`${API_URL}/api/datasets/get-json`, {
            params: {
                file_path: datasetPath
            }
        });
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

// Clear all data
export const clearData = async (): Promise<ClearDataResponse> => {
    try {
        const response = await axios.delete(`${API_URL}/api/datasets/clear-data`, {
            params: {
                file_path: localStorage.getItem('datasetName')
            }
        }
        );
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const loadPrompts = async (): Promise<LoadPromptsResponse> => {
    try {
        const response = await axios.get(`${API_URL}/api/datasets/get-default-prompt`);
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
}

export const changePrompt = async (prompt: string) => {
    try {
        console.log('Changing prompt to:', prompt);
        const response = await axios.post(`${API_URL}/api/datasets/set-prompt`, {
            prompt: prompt
        });
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const startAutoCaptioning = async (dataset_path: string, apiKey: string, apiType: string, model: string = 'google/gemma-3-12b-it:free') => {
    try {
        const formData = new FormData();
        formData.append('file_path', dataset_path); // <-- notice file_path, not dataset_path
        formData.append('api_key', apiKey);
        formData.append('api_type', apiType);
        formData.append('model', model);

        const response = await axios.post(`${API_URL}/api/datasets/start-auto-captioning`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
        return response.data;
    } catch (error) {
        return handleApiError(error);
    } 
}

export const getCaptioningProgress = async (): Promise<AutoCaptionProgressResponse> => {
    try {
        const response = await axios.get(`${API_URL}/api/datasets/captioning/progress`);
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
}