// useFineTuneStore.ts
import { create } from 'zustand';

type FineTuneStore = {
  datasetLink: string;
  fineTuneStatus: string;
  fineTuneLoading: boolean;
  error: string;
  modelOptions: { value: string; label: string }[];
  datasetOptions: { value: string; label: string }[];
  taskId: string;
  viewProgress: number;
  logs: { status: string; progress: string; epoch: string | null; loss: string | null }[];
  datasetSize: string;
  epochs: string;
  learningRate: string;
  modelName: string;
  setDatasetLink: (datasetLink: string) => void;
  setFineTuneStatus: (status: string) => void;
  setFineTuneLoading: (loading: boolean) => void;
  setError: (error: string) => void;
  setModelOptions: (options: { value: string; label: string }[]) => void;
  setDatasetOptions: (options: { value: string; label: string }[]) => void;
  setTaskId: (taskId: string) => void;
  setViewProgress: (progress: number) => void;
  setLogs: (logs: { status: string; progress: string; epoch: string | null; loss: string | null }[]) => void;
  setDatasetSize: (size: string) => void;
  setEpochs: (epochs: string) => void;
  setLearningRate: (rate: string) => void;
  setModelName: (modelName: string) => void;
};

export const useFineTuneStore = create<FineTuneStore>((set) => ({
  datasetLink: '',
  fineTuneStatus: '',
  fineTuneLoading: false,
  error: '',
  modelOptions: [],
  datasetOptions: [],
  taskId: '',
  viewProgress: 0,
  logs: [],
  datasetSize: '',
  epochs: '',
  learningRate: '',
  modelName: '',
  setDatasetLink: (datasetLink) => set({ datasetLink }),
  setFineTuneStatus: (status) => set({ fineTuneStatus: status }),
  setFineTuneLoading: (loading) => set({ fineTuneLoading: loading }),
  setError: (error) => set({ error }),
  setModelOptions: (options) => set({ modelOptions: options }),
  setDatasetOptions: (options) => set({ datasetOptions: options }),
  setTaskId: (taskId) => set({ taskId }),
  setViewProgress: (progress) => set({ viewProgress: progress }),
  setLogs: (logs) => set({ logs }),
  setDatasetSize: (size) => set({ datasetSize: size }),
  setEpochs: (epochs) => set({ epochs }),
  setLearningRate: (rate) => set({ learningRate: rate }),
  setModelName: (modelName) => set({ modelName }),
}));
