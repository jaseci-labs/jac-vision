import axios from 'axios';

export const API_URL = "https://20kbur51erc41s-5000.proxy.runpod.net";

// Define TypeScript interfaces for API responses
export interface Model {
  id: string;
  size: string;
  tags: string[];
  likes: number;
  downloads: number;
}

interface SearchModelsResponse {
  models: Model[];
  total: number;
}

interface DownloadModelResponse {
  message: string;
}

interface CheckModelAccessResponse {
  restricted: boolean;
  has_access: boolean;
  message?: string;
  action?: string;
}

interface VqaResponse {
  answer: string;
}

interface VqaHistoryEntry {
  id: number;
  image_base64: string;
  question: string;
  answer: string;
  timestamp: string;
}

interface VqaHistoryResponse {
  history: VqaHistoryEntry[];
}

interface SystemInfoResponse {
  timestamp: string;
  cpu_usage_percent: number;
  cpu_usage_label: string;
  memory_total_gb: number;
  memory_used_gb: number;
  memory_remaining_gb: number;
  memory_percent: number;
  disk_total_gb: number;
  disk_used_gb: number;
  disk_remaining_gb: number;
  disk_percent: number;
}

interface FineTuneResponse {
  task_id: string;
  status: string;
}

interface ModelsResponse {
  models: string[];
}

interface DatasetResponse {
  datasets: string[];
}

interface DeleteModelResponse {
  message: string;
}

interface DeleteVqaHistoryResponse {
  message: string;
}

interface ClearVqaHistoryResponse {
  message: string;
}
interface DownloadDatasetResponse {
  message?: string;
}

interface ClearDataResponse {
  message: string;
}

// Helper function to handle API errors
const handleApiError = (error: any): never => {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.detail || error.message;
    throw new Error(`API Error: ${message}`);
  }
  throw new Error(`Unexpected Error: ${error.message || String(error)}`);
};

// Perform VQA (Vision Question Answering)
export const performVqa = async (
  model: string,
  image: File | null,
  question: string,
  apiKey?: string,
  apiType?: 'gemini' | 'openai'
): Promise<VqaResponse> => {
  const formData = new FormData();
  formData.append('model', model);
  formData.append('question', question);
  if (image) {
    formData.append('image', image);
  }
  if (apiKey && apiType) {
    formData.append('api_key', apiKey);
    formData.append('api_type', apiType);
  }
  try {
    const response = await axios.post(`${API_URL}/vqa`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

// Fetch list of downloaded models
export const fetchModels = async (): Promise<ModelsResponse> => {
  try {
    const response = await axios.get(`${API_URL}/api/finetune/models`);
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const fetchDatasets = async (): Promise<DatasetResponse> => {
  try {
    const response = await axios.get(`${API_URL}/api/finetune/datasets`);
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

// Fetch list of Finetuned models
export const fetchFineTunedModels = async (): Promise<ModelsResponse> => {
  try {
    const response = await axios.get(`${API_URL}/api/inference/models`);
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

// Load a fine-tuned model for inference
export const loadFineTunedModelForInference = async (selectedModel: string): Promise<ClearDataResponse> => {
  try {
    const formData = new FormData();
    formData.append("app_name", selectedModel);
    const response = await axios.post(`${API_URL}/api/inference/load-model`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

// Inference with a fine-tuned model
export const inferenceWithFineTunedModel = async (
  app_name: string,
  image: File | null,
  question: string,
): Promise<VqaResponse> => {
  const formData = new FormData();
  formData.append('app_name', app_name);
  formData.append('question', question);
  if (image) {
    formData.append('image', image);
  }
  try {
    const response = await axios.post(`${API_URL}/api/inference/process`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

// Delete a model
export const deleteModel = async (model: string): Promise<DeleteModelResponse> => {
  try {
    const response = await axios.post(`${API_URL}/api/models/delete-model`, { model });
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

// Fetch VQA history
export const fetchVqaHistory = async (): Promise<VqaHistoryResponse> => {
  try {
    const response = await axios.get(`${API_URL}/api/vqa/vqa/history`);
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

// Delete a specific VQA history entry
export const deleteVqaHistory = async (historyId: number): Promise<DeleteVqaHistoryResponse> => {
  try {
    const response = await axios.delete(`${API_URL}/api/vqa/vqa/history/delete/${historyId}`);
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

// Clear all VQA history
export const clearVqaHistory = async (): Promise<ClearVqaHistoryResponse> => {
  try {
    const response = await axios.delete(`${API_URL}/api/vqa/vqa/history/clear`);
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

// Test API key for Gemini or OpenAI
export const testApiKey = async (apiKey: string, apiType: 'gemini' | 'openai'): Promise<VqaResponse> => {
  const formData = new FormData();
  formData.append('api_key', apiKey);
  formData.append('api_type', apiType);
  formData.append('question', 'Test question');
  try {
    const response = await axios.post(`${API_URL}/api/vqa/vqa`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

// Download a model from Hugging Face
export const downloadModel = async (model: string, token?: string): Promise<DownloadModelResponse> => {
  try {
    console.log('Sending download request:', { model, token });
    const response = await axios.post(
      `${API_URL}/api/models/download-model`,
      { model, token },
      { headers: { "Content-Type": "application/json" } }
    );
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

// Check if a model is restricted and if the user has access
export const checkModelAccess = async (model: string, token?: string): Promise<CheckModelAccessResponse> => {
  try {
    const response = await axios.post(
      `${API_URL}/api/models/check-model-access`,
      { model, token },
      { headers: { "Content-Type": "application/json" } }
    );
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

// Search for models on Hugging Face with pagination
export const searchModels = async (query: string, limit: number = 50, offset: number = 0): Promise<SearchModelsResponse> => {
  try {
    const response = await axios.get(`${API_URL}/api/models/search`, {
      params: { query, limit, offset },
    });
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

// Fetch system information
export const fetchSystemInfo = async (): Promise<SystemInfoResponse> => {
  try {
    const response = await axios.get(`${API_URL}/api/system/system-info`);
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

// Fine-tune a model
export const finetuneModel = async (model_name: string, dataset_path: string, app_name: string): Promise<FineTuneResponse> => {
  try {
    const response = await axios.post(`${API_URL}/api/finetune/start-finetuning`, { model_name, dataset_path, app_name });
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};



export const getTaskStatus = async (taskId: string) => {
  try {
    const response = await fetch(`${API_URL}/api/finetune/status/${taskId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch task status');
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(error);
    return null;
  }
};



export const sendChatbotMessage = async (
  message: string,
  apiKey: string,
  taskType: string,
  paramRangeMin: number,
  paramRangeMax: number,
  hardwareGpuMemory: number | null,
  preference: string | null
) => {
  const response = await axios.post(`${API_URL}/chatbot`, {
    message,
    api_key: apiKey,
    task_type: taskType,
    param_range_min: paramRangeMin,
    param_range_max: paramRangeMax,
    hardware_gpu_memory: hardwareGpuMemory, // Should be a number or null
    preference, // Should be a string or null
  });
  return response.data;
};