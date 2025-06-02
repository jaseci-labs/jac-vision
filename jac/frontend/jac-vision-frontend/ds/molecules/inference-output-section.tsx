import React from "react";

interface InferenceOutputSectionProps {
  result: string | null;
}

export function InferenceOutputSection({ result }: InferenceOutputSectionProps) {
  if (!result) return null;
  return (
    <div className="mt-6 p-4 bg-muted rounded">
      <div className="font-semibold mb-2">Model Output:</div>
      <pre className="whitespace-pre-wrap text-sm">{result}</pre>
    </div>
  );
}
