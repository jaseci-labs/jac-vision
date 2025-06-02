import { ModelSelect } from "@/ds/atoms/model-select";
import { Textarea } from "@/ds/atoms/textarea";
import { Button } from "@/ds/atoms/button";
import React from "react";

interface InferenceInputSectionProps {
  model: string;
  setModel: (model: string) => void;
  modelOptions: string[];
  file: File | null;
  setFile: (file: File | null) => void;
  prompt: string;
  setPrompt: (prompt: string) => void;
  loading: boolean;
  disabled: boolean;
}

export function InferenceInputSection({
  model,
  setModel,
  modelOptions,
  file,
  setFile,
  prompt,
  setPrompt,
  loading,
  disabled,
}: InferenceInputSectionProps) {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFile(e.target.files?.[0] ?? null);
  };

  return (
    <>
      <div>
        <label className="block text-sm font-medium mb-1">Model</label>
        <ModelSelect value={model} onChange={setModel} modelOptions={modelOptions} />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Image File</label>
        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-muted file:text-foreground"
          required
        />
        {file && (
          <>
            <p className="text-xs text-muted-foreground mt-1">
              Selected: {file.name}
            </p>
            <div className="mt-2">
              <img
                src={URL.createObjectURL(file)}
                alt="Uploaded preview"
                className="max-h-32 rounded border"
              />
            </div>
          </>
        )}
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Prompt</label>
        <Textarea
          placeholder="Enter your prompt/question"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          required
          rows={3}
        />
        <p className="text-xs text-muted-foreground mt-1">
          E.g., "Describe the objects in this image."
        </p>
      </div>
      <Button
        type="submit"
        className="w-full"
        disabled={disabled}
      >
        {loading ? "Running..." : "Run Inference"}
      </Button>
    </>
  );
}
