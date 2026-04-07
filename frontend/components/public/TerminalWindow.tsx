"use client";
import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface Props {
    title: string;
    children: ReactNode;
    className?: string;
}

export function TerminalWindow({ title, children, className }: Props) {
    return (
        <div
            className={cn(
                "flex flex-col border border-[#00F0FF] bg-[#0D1117] font-mono",
                "shadow-[0_0_24px_rgba(0,240,255,0.15)]",
                className
            )}
        >
            {/* Chrome bar */}
            <div className="flex items-center justify-between px-3 py-2 bg-[#0A0E14] border-b border-[#00F0FF]/30 select-none">
                <span className="text-[#00F0FF] text-[10px] uppercase tracking-[0.2em]">
                    {title}
                </span>
                <div className="flex items-center gap-1">
                    <span className="inline-flex items-center justify-center w-3.5 h-3.5 border border-[#333] text-[#444] text-[7px] leading-none">
                        ─
                    </span>
                    <span className="inline-flex items-center justify-center w-3.5 h-3.5 border border-[#333] text-[#444] text-[7px] leading-none">
                        □
                    </span>
                    <span className="inline-flex items-center justify-center w-3.5 h-3.5 border border-[#444] text-[#666] text-[7px] leading-none">
                        ✕
                    </span>
                </div>
            </div>
            {/* Content */}
            <div className="p-4">{children}</div>
        </div>
    );
}
