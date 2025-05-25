"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, User } from "lucide-react";
import { cn } from "@/_core/utils";

interface TaskSidebarProps {
  stats: {
    total: number;
    active: number;
    priorities: {
      high: number;
      medium: number;
      low: number;
    };
  };
}

export function TaskSidebar({ stats }: TaskSidebarProps) {
  const pathname = usePathname();

  const navItems = [
    { href: "/", label: "Dashboard", icon: Home },
    { href: "/profile", label: "Profile", icon: User },
  ];

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h3 className="font-medium mb-2">Navigation</h3>
        <nav className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 text-sm rounded-md",
                  isActive
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div>
        <h3 className="font-medium mb-2">Statistics</h3>
        <div className="grid grid-cols-2 gap-2">
          <div className="p-3 bg-card rounded-lg border text-center">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-xs text-muted-foreground">Total</div>
          </div>
          <div className="p-3 bg-card rounded-lg border text-center">
            <div className="text-2xl font-bold">{stats.active}</div>
            <div className="text-xs text-muted-foreground">Active</div>
          </div>
        </div>
      </div>
      <div>
        <h3 className="font-medium mb-2">Priorities</h3>
        <div className="space-y-1">
          <div className="flex justify-between text-sm">
            <span>High</span>
            <span>{stats.priorities.high}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Medium</span>
            <span>{stats.priorities.medium}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Low</span>
            <span>{stats.priorities.low}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
