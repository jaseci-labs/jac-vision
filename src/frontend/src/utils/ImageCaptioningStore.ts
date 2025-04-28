import { create } from 'zustand';


interface ImageData {
    image_path: string;
    caption: string;
    total: number;
}

interface ImageCaptioningAppState {
    apiKey: string;
    setApiKey: (apiKey: string) => void;
    apiType: "openrouter" | "openai" | "gemini";
    setApiType: (apiType: "openrouter" | "openai" | "gemini") => void;
    openRouterModel: string;
    setOpenRouterModel: (model: string) => void;
    showApiKey: boolean;
    setShowApiKey: (show: boolean) => void;
    testApiKeyLoading: boolean;
    setTestApiKeyLoading: (loading: boolean) => void;
    imageFolder: File | null;
    setImageFolder: (file: File | null) => void;
    uploadLoading: boolean;
    setUploadLoading: (loading: boolean) => void;
    downloadLoading: boolean;
    setDownloadLoading: (loading: boolean) => void;
    error: string;
    setError: (error: string) => void;
    datasetName: string;
    setDatasetName: (name: string) => void;
    imageData: ImageData | null;
    setImageData: (data: ImageData | null) => void;
    caption: string;
    setCaption: (caption: string) => void;
    saveLoading: boolean;
    setSaveLoading: (loading: boolean) => void;
    jsonData: any;
    setJsonData: (data: any) => void;
    showJsonPreview: boolean;
    setShowJsonPreview: (show: boolean) => void;
    openClearDialog: boolean;
    setOpenClearDialog: (open: boolean) => void;
    apiDialogOpen: boolean;
    setApiDialogOpen: (open: boolean) => void;
    autoCaption: boolean;
    setAutoCaption: (auto: boolean) => void;
    prompt: string;
    setPrompt: (prompt: string) => void;
    captionLoading: boolean;
    setCaptionLoading: (loading: boolean) => void;
    editedPrompt: string;
    setEditedPrompt: (prompt: string) => void;
    isEditing: boolean;
    setIsEditing: (editing: boolean) => void;
    captioningProgress: number;
    setCaptioningProgress: (progress: number) => void;
    captioningStatus: string;
    setCaptioningStatus: (status: string) => void;
    showProgressOverlay: boolean;
    setShowProgressOverlay: (show: boolean) => void;
}

export const useImageCaptioningAppState = create<ImageCaptioningAppState>((set) => ({
    apiKey: localStorage.getItem("captionApiKey") || "",
    setApiKey: (apiKey) => set({ apiKey }),
    apiType: "openrouter",
    setApiType: (apiType) => set({ apiType }),
    openRouterModel: "google/gemma-3-12b-it:free",
    setOpenRouterModel: (openRouterModel) => set({ openRouterModel }),
    showApiKey: false,
    setShowApiKey: (showApiKey) => set({ showApiKey }),
    testApiKeyLoading: false,
    setTestApiKeyLoading: (testApiKeyLoading) => set({ testApiKeyLoading }),
    imageFolder: null,
    setImageFolder: (imageFolder) => set({ imageFolder }),
    uploadLoading: false,
    setUploadLoading: (uploadLoading) => set({ uploadLoading }),
    downloadLoading: false,
    setDownloadLoading: (downloadLoading) => set({ downloadLoading }),
    error: "",
    setError: (error) => set({ error }),
    datasetName: "",
    setDatasetName: (datasetName) => set({ datasetName }),
    imageData: null,
    setImageData: (imageData) => set({ imageData }),
    caption: "",
    setCaption: (caption) => set({ caption }),
    saveLoading: false,
    setSaveLoading: (saveLoading) => set({ saveLoading }),
    jsonData: null,
    setJsonData: (jsonData) => set({ jsonData }),
    showJsonPreview: false,
    setShowJsonPreview: (showJsonPreview) => set({ showJsonPreview }),
    openClearDialog: false,
    setOpenClearDialog: (openClearDialog) => set({ openClearDialog }),
    apiDialogOpen: false,
    setApiDialogOpen: (apiDialogOpen) => set({ apiDialogOpen }),
    autoCaption: false,
    setAutoCaption: (autoCaption) => set({ autoCaption }),
    prompt: 'Describe the damage in this car image',
    setPrompt: (prompt) => set({ prompt }),
    captionLoading: false,
    setCaptionLoading: (captionLoading) => set({ captionLoading }),
    editedPrompt: '',
    setEditedPrompt: (editedPrompt) => set({ editedPrompt }),
    isEditing: false,
    setIsEditing: (isEditing) => set({ isEditing }),
    captioningProgress: 0,
    setCaptioningProgress: (captioningProgress) => set({ captioningProgress }),
    captioningStatus: 'idle',
    setCaptioningStatus: (captioningStatus) => set({ captioningStatus }),
    showProgressOverlay: false,
    setShowProgressOverlay: (showProgressOverlay) => set({ showProgressOverlay }),
}));
