"use client";
import Link from "next/link";
import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface Props {
    children: ReactNode;
    subtitle?: string;
    variant?: "primary" | "ghost";
    href?: string;
    onClick?: () => void;
    disabled?: boolean;
    className?: string;
}

export function OvfButton({
    children,
    subtitle,
    variant = "primary",
    href,
    onClick,
    disabled = false,
    className,
}: Props) {
    const base = cn(
        "flex flex-col items-center justify-center w-full py-3 px-6 rounded-lg",
        "font-mono text-sm uppercase tracking-widest font-bold",
        "transition-all duration-200",
        variant === "primary" && [
            "bg-[#FF6B00] text-white",
            "hover:bg-[#FF8A2B] hover:shadow-[0_0_28px_rgba(255,107,0,0.55)]",
            "active:scale-[0.97]",
        ],
        variant === "ghost" && [
            "bg-transparent text-[#FF6B00] border border-[#FF6B00]/70",
            "hover:bg-[#FF6B00]/10 hover:border-[#FF6B00]",
        ],
        disabled && "opacity-40 cursor-not-allowed pointer-events-none",
        className
    );

    const inner = (
        <>
            <span>{children}</span>
            {subtitle && (
                <span className="text-xs opacity-60 font-normal normal-case tracking-normal mt-0.5">
                    {subtitle}
                </span>
            )}
        </>
    );

    if (href && !disabled) {
        return (
            <Link href={href} className={base}>
                {inner}
            </Link>
        );
    }
    return (
        <button className={base} onClick={onClick} disabled={disabled}>
            {inner}
        </button>
    );
}
