"use client";
import { cn } from "@/lib/utils";

interface Props {
    value: number; // 0-100
    label?: string;
    sublabel?: string;
    className?: string;
}

export function CircularGauge({ value, label = "ORGANIC CHAOS", sublabel, className }: Props) {
    const radius = 58;
    const circumference = 2 * Math.PI * radius;
    // Only fill 270° (three-quarter circle) like a real gauge
    const arc = circumference * 0.75;
    const filled = (Math.min(Math.max(value, 0), 100) / 100) * arc;
    const rotation = 135; // start at bottom-left

    return (
        <div className={cn("flex flex-col items-center", className)}>
            <div className="relative w-40 h-40">
                <svg viewBox="0 0 160 160" className="w-full h-full" style={{ transform: `rotate(${rotation}deg)` }}>
                    {/* Track */}
                    <circle
                        cx="80" cy="80" r={radius}
                        fill="none"
                        stroke="#1F2937"
                        strokeWidth="10"
                        strokeDasharray={`${arc} ${circumference}`}
                        strokeLinecap="round"
                    />
                    {/* Fill */}
                    <circle
                        cx="80" cy="80" r={radius}
                        fill="none"
                        stroke="#FF6B00"
                        strokeWidth="10"
                        strokeDasharray={`${filled} ${circumference}`}
                        strokeLinecap="round"
                        style={{
                            filter: "drop-shadow(0 0 6px rgba(255,107,0,0.7))",
                            transition: "stroke-dasharray 1.2s cubic-bezier(.4,0,.2,1)",
                        }}
                    />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="font-mono text-3xl font-bold text-white leading-none">{value}</span>
                    <span className="font-mono text-[10px] text-[#AAAAAA] uppercase tracking-widest">%</span>
                </div>
            </div>
            <span className="font-mono text-[11px] text-[#00F0FF] uppercase tracking-[0.2em] mt-1">
                {label}
            </span>
            {sublabel && (
                <span className="font-mono text-[10px] text-[#666] uppercase tracking-widest mt-0.5">
                    {sublabel}
                </span>
            )}
        </div>
    );
}
