"use client";

import { Button } from "@/ds/atoms/button";
import { MoonIcon, SunIcon, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAppTheme } from "../use-app-theme";

interface TaskHeaderProps {
  title?: string;
}

export function TaskHeader({ title = "Task Manager" }: TaskHeaderProps) {
  const { toggleTheme, isDark } = useAppTheme();
  const pathname = usePathname();
  const isProfilePage = pathname === "/profile";

  return (
    <div className="flex items-center justify-between h-16 px-6">
      <h1 className="text-xl font-bold">{title}</h1>
      <div className="flex items-center space-x-2">
        {!isProfilePage && (
          <Button variant="ghost" size="sm" asChild>
            <Link href="/profile">
              <User className="h-4 w-4 mr-2" />
              Profile
            </Link>
          </Button>
        )}
        {isProfilePage && (
          <Button variant="ghost" size="sm" asChild>
            <Link href="/">Dashboard</Link>
          </Button>
        )}
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
    </div>
  );
}
