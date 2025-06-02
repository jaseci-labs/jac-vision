"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, ImageIcon, ListIcon, Settings2Icon } from "lucide-react";
import Link from "next/link";
import { cn } from "@/_core/utils";
import { usePathname } from "next/navigation";

const items = [
    { label: "Model Inference", href: "/inference", icon: ImageIcon },
    { label: "Item 2", href: "/item2", icon: ListIcon },
    { label: "Item 3", href: "/item3", icon: Settings2Icon },
];

// Renamed from ExpandableSidebar to AppSidebar
export function AppSidebar() {
    const [expanded, setExpanded] = useState(true);
    const pathname = usePathname();

    return (
        <aside
            className={cn(
                "bg-muted/20 border-r transition-all duration-200 flex flex-col p-4 overflow-y-auto",
                expanded ? "w-64" : "w-16"
            )}
        >
            <div className="flex items-center justify-between mb-4 border-b pb-2">
                <span
                    className={cn(
                        "font-bold text-lg transition-all",
                        !expanded && "sr-only"
                    )}
                >
                    Features
                </span>
                <button
                    type="button"
                    className="p-1 rounded hover:bg-muted"
                    onClick={() => setExpanded((v) => !v)}
                    aria-label={expanded ? "Collapse sidebar" : "Expand sidebar"}
                >
                    {expanded ? (
                        <ChevronLeft className="h-5 w-5" />
                    ) : (
                        <ChevronRight className="h-5 w-5" />
                    )}
                </button>
            </div>
            <nav className="flex-1 py-2">
                {items.map((item) => {
                    const isActive = pathname === item.href;
                    const Icon = item.icon;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors",
                                isActive
                                    ? "bg-primary/10 text-primary font-semibold"
                                    : "hover:bg-primary/10",
                                !expanded && "justify-center"
                            )}
                        >
                            <Icon className={cn(
                                expanded ? "h-5 w-5" : "h-7 w-7"
                            )} />
                            {expanded && (
                                <span>{item.label}</span>
                            )}
                        </Link>
                    );
                })}
            </nav>
        </aside>
    );
}
