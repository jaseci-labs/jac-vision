import React from "react";
import AppLogo from "../atoms/app-logo";

interface AuthLeftColProps {
  title?: string;
  subtitle?: string;
}

export const AuthLeftCol = ({
  title = "Jac Vision",
  subtitle = "Build the next generation of AI Products",
}: AuthLeftColProps) => {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="flex flex-col items-center justify-center space-y-4 text-center">
        <div className="flex items-center justify-center">
          <AppLogo />
        </div>
        <h1 className="text-3xl font-bold">{title}</h1>
        <p className="text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
};
