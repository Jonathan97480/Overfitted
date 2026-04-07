"use client";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface Props {
    values?: number[];
    className?: string;
    color?: string;
}

function generateWave(count = 40): number[] {
    return Array.from(
        { length: count },
        (_, i) =>
            Math.sin(i * 0.45) * 0.35 +
            Math.sin(i * 1.2) * 0.25 +
            Math.sin(i * 0.15) * 0.2 +
            (Math.random() - 0.5) * 0.25
    );
}

export function MemoryGraph({ values, className, color = "#FF6B00" }: Props) {
    const [data, setData] = useState<number[]>([]);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        // Uniquement côté client — évite le mismatch hydratation (float SSR ≠ browser)
        setData(values ?? generateWave());
        setMounted(true);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const W = 300;
    const H = 48;
    const mid = H / 2;
    const amp = H * 0.42;
    const step = data.length > 1 ? W / (data.length - 1) : W;
    const points = data.map((v, i) => `${i * step},${mid - v * amp}`).join(" ");

    return (
        <div className={cn("w-full", className)}>
            <svg
                viewBox={`0 0 ${W} ${H}`}
                className="w-full h-12"
                preserveAspectRatio="none"
            >
                {/* Zero line — always rendered (stable, no hydration issue) */}
                <line x1="0" y1={mid} x2={W} y2={mid} stroke="#1F2937" strokeWidth="0.5" />
                {/* Waveform — client-only to prevent hydration mismatch */}
                {mounted && (
                    <polyline
                        points={points}
                        fill="none"
                        stroke={color}
                        strokeWidth="1.5"
                        strokeLinejoin="round"
                        style={{ filter: `drop-shadow(0 0 3px ${color})` }}
                    />
                )}
            </svg>
        </div>
    );
}
