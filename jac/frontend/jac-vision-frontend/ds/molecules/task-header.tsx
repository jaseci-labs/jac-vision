"use client";

import { MoonIcon, SunIcon } from "lucide-react";
import { useAppTheme } from "../use-app-theme";
import { Button } from "../atoms/button";

interface TaskHeaderProps {
  title?: string;
}

export function TaskHeader({ title = "Task Manager" }: TaskHeaderProps) {
  const { toggleTheme, isDark } = useAppTheme();

  return (
    <div className="flex items-center justify-between h-16 px-6">
      <h1 className="text-xl font-bold">{title}</h1>
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleTheme}
        aria-label="Toggle theme"
      >
        {isDark ? (
          <SunIcon className="h-5 w-5" />
        ) : (
          <MoonIcon className="h-5 w-5" />
        )}
      </Button>
    </div>
  );
}
