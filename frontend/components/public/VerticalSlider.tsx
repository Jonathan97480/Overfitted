"use client";
import { cn } from "@/lib/utils";

interface Props {
    label: string;
    value: number;
    min?: number;
    max?: number;
    step?: number;
    unit?: string;
    onChange: (value: number) => void;
    className?: string;
}

export function VerticalSlider({
    label,
    value,
    min = 0,
    max = 100,
    step = 1,
    unit = "%",
    onChange,
    className,
}: Props) {
    return (
        <div className={cn("flex flex-col items-center gap-2", className)}>
            <span className="font-mono text-[9px] text-[#00F0FF] uppercase tracking-widest">
                {label}
            </span>
            <div className="relative flex items-center justify-center h-32">
                <input
                    type="range"
                    min={min}
                    max={max}
                    step={step}
                    value={value}
                    onChange={(e) => onChange(Number(e.target.value))}
                    className="accent-[#00F0FF] cursor-pointer"
                    style={{
                        writingMode: "vertical-lr" as React.CSSProperties["writingMode"],
                        direction: "rtl",
                        height: "120px",
                        width: "20px",
                        WebkitAppearance: "slider-vertical",
                    }}
                    aria-label={label}
                    aria-valuemin={min}
                    aria-valuemax={max}
                    aria-valuenow={value}
                />
            </div>
            <span className="font-mono text-[10px] text-[#AAAAAA]">
                {value}{unit}
            </span>
        </div>
    );
}
