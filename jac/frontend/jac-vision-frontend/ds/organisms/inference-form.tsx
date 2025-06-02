"use client";
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/ds/atoms/card";
import { InferenceInputSection } from "@/ds/molecules/inference-input-section";
import { InferenceOutputSection } from "@/ds/molecules/inference-output-section";

export function InferenceForm() {
  const [model, setModel] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [prompt, setPrompt] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const modelOptions = [
    "BLIP-2",
    "LLaVA",
    "MiniGPT-4",
    "OFA",
    "Other"
  ];

  // Dummy inference handler (replace with real API call)
  const handleInference = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    // Simulate API call
    setTimeout(() => {
      setResult(
        `Result for prompt "${prompt}" on model "${model}" with file "${file?.name ?? "No file"}":\n\n[Model output here]`
      );
      setLoading(false);
    }, 1200);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Vision Language Model Inference</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleInference}>
          <InferenceInputSection
            model={model}
            setModel={setModel}
            modelOptions={modelOptions}
            file={file}
            setFile={setFile}
            prompt={prompt}
            setPrompt={setPrompt}
            loading={loading}
            disabled={loading || !model || !file || !prompt}
          />
        </form>
        <InferenceOutputSection result={result} />
      </CardContent>
    </Card>
  );
}
