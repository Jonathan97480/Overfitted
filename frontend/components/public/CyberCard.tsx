"use client";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { NeonBadge } from "./NeonBadge";
import { OvfButton } from "./OvfButton";

interface Props {
    name: string;
    thumbnailUrl: string | null;
    detail1: string;
    detail2: string;
    badgeLabel: string;
    badgeOrange?: boolean;
    price: number;
    roastQuote: string;
    onAddToCart?: () => void;
    className?: string;
}

export function CyberCard({
    name,
    thumbnailUrl,
    detail1,
    detail2,
    badgeLabel,
    badgeOrange = false,
    price,
    roastQuote,
    onAddToCart,
    className,
}: Props) {
    return (
        <div
            className={cn(
                "flex flex-col border border-[#00F0FF] bg-[#0D1117] font-mono",
                "shadow-[0_0_20px_rgba(0,240,255,0.12)]",
                className
            )}
        >
            {/* ── Chrome bar ── */}
            <div className="flex items-center justify-between px-3 py-2 bg-[#0A0E14] border-b border-[#00F0FF]/30 select-none flex-shrink-0">
                <span className="text-[#00F0FF] text-[10px] uppercase tracking-[0.2em]">
                    glitched terminal
                </span>
                <div className="flex items-center gap-1">
                    <span className="inline-flex items-center justify-center w-3.5 h-3.5 border border-[#333] text-[#444] text-[7px] leading-none">─</span>
                    <span className="inline-flex items-center justify-center w-3.5 h-3.5 border border-[#333] text-[#444] text-[7px] leading-none">□</span>
                    <span className="inline-flex items-center justify-center w-3.5 h-3.5 border border-[#444] text-[#666] text-[7px] leading-none">✕</span>
                </div>
            </div>

            {/* ── Content ── */}
            <div className="flex gap-3 p-3">
                {/* Image column */}
                <div className="relative w-[130px] h-[130px] flex-shrink-0 bg-[#0A0E14] border border-[#00F0FF]/20 overflow-hidden">
                    {thumbnailUrl ? (
                        <Image
                            src={thumbnailUrl}
                            alt={name}
                            fill
                            sizes="130px"
                            className="object-cover"
                            unoptimized={thumbnailUrl.startsWith("http://")}
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-[#00F0FF]/20 text-[9px] tracking-widest uppercase">
                            NO_IMG
                        </div>
                    )}
                    {/* AI ROAST overlay */}
                    <div className="absolute bottom-0 left-0 right-0 bg-[#FF6B00]/90 px-2 py-1">
                        <p className="font-mono text-[7px] text-white leading-snug">
                            AI ROAST:<br />
                            {roastQuote}
                        </p>
                    </div>
                </div>

                {/* Info column */}
                <div className="flex flex-col gap-1 flex-1 min-w-0">
                    <p className="font-mono text-[11px] text-white uppercase tracking-wide font-bold leading-tight">
                        {name}
                    </p>
                    <p className="font-mono text-[9px] text-[#00F0FF]/70 mt-0.5">{detail1}</p>
                    <p className="font-mono text-[9px] text-[#6B7280]">{detail2}</p>

                    <NeonBadge
                        label={badgeLabel}
                        className={cn(
                            "self-start mt-1.5",
                            badgeOrange && "text-[#FF6B00] border-[#FF6B00]/50 shadow-[0_0_8px_rgba(255,107,0,0.25)]"
                        )}
                    />

                    <p className="font-mono text-sm text-white font-bold mt-1.5">
                        {price.toFixed(2)}€
                    </p>

                    <OvfButton
                        className="mt-1 py-1.5 !text-[9px] tracking-[0.1em]"
                        onClick={onAddToCart}
                    >
                        Ajouter au Diagnostic
                    </OvfButton>
                </div>
            </div>
        </div>
    );
}
