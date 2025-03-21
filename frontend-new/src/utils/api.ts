import axios from 'axios';

const API_URL = 'http://localhost:5000';

export const performVqa = async (
  model: string,
  image: File | null,
  question: string,
  apiKey?: string,
  apiType?: 'gemini' | 'openai'
) => {
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
  return axios.post(`${API_URL}/vqa`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const fetchModels = () => {
  return axios.get(`${API_URL}/models`);
};

export const deleteModel = (model: string) => {
  return axios.post(`${API_URL}/delete-model`, { model });
};

export const fetchVqaHistory = () => {
  return axios.get(`${API_URL}/vqa/history`);
};

export const deleteVqaHistory = (historyId: number) => {
  return axios.delete(`${API_URL}/vqa/history/delete/${historyId}`);
};

export const clearVqaHistory = () => {
  return axios.delete(`${API_URL}/vqa/history/clear`);
};

export const testApiKey = (apiKey: string, apiType: 'gemini' | 'openai') => {
  const formData = new FormData();
  formData.append('api_key', apiKey);
  formData.append('api_type', apiType);
  formData.append('question', 'Test question');
  return axios.post(`${API_URL}/vqa`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

// Additional function for downloading models (used in ModelManagement.tsx)
export const downloadModel = (model: string) => {
  return axios.post(`${API_URL}/download-model`, { model });
};

// Additional function for searching models (used in ModelManagement.tsx)
export const searchModels = (query: string) => {
  return axios.get(`${API_URL}/search?query=${query}`);
};

// Additional function for fetching system info (used in SystemInfo.tsx)
export const fetchSystemInfo = () => {
  return axios.get(`${API_URL}/system-info`);
};

export const finetuneModel = (model: string, params: any) => {
  return axios.post(`${API_URL}/finetune`, { model, params });
};
