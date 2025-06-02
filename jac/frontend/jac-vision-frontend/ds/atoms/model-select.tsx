import * as React from "react";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/ds/atoms/select";

export interface ModelSelectProps {
  value: string;
  onChange: (value: string) => void;
  models?: string[];
  modelOptions: string[];
}

export function ModelSelect({ value, onChange, modelOptions }: ModelSelectProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Select model" />
      </SelectTrigger>
      <SelectContent>
        {modelOptions.map((model) => (
          <SelectItem key={model} value={model}>
            {model}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
