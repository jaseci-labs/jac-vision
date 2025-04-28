import { create } from "zustand";

type FineTunedVQAStore = {
    vqaImage: File | null;
    vqaQuestion: string | null;
    vqaAnswer: string | null;
    vqaLoading: boolean;
    runModelLoading: boolean;
    error: string | null;
    modelOptions: { value: string; label: string }[];
    imagePreview: string | null;
    setVqaImage: (image: File | null) => void;
    setVqaQuestion: (question: string | null) => void;
    setVqaAnswer: (answer: string | null) => void;
    setVqaLoading: (loading: boolean) => void;
    setRunModelLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
    setModelOptions: (options: { value: string; label: string }[]) => void;
    setImagePreview: (image: string | null) => void;
};

export const useFineTunedVQAStore = create<FineTunedVQAStore>((set) => ({
    vqaImage: null,
    vqaQuestion: "",
    vqaAnswer: "",
    vqaLoading: false,
    runModelLoading: false,
    error: "",
    modelOptions: [],
    imagePreview: null,
    setVqaImage: (image: File | null) => set({ vqaImage: image }),
    setVqaQuestion: (question) => set({ vqaQuestion: question }),
    setVqaAnswer: (answer) => set({ vqaAnswer: answer }),
    setVqaLoading: (loading) => set({ vqaLoading: loading }),
    setRunModelLoading: (loading) => set({ runModelLoading: loading }),
    setError: (error) => set({ error }),
    setModelOptions: (options) => set({ modelOptions: options }),
    setImagePreview: (image) => set({ imagePreview: image }),
}));