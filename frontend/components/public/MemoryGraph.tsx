"use client";
import { useMemo, useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface Props {
    values?: number[];
    className?: string;
    color?: string;
}

function generateWave(count = 40, withNoise = true): number[] {
    return Array.from(
        { length: count },
        (_, i) =>
            Math.sin(i * 0.45) * 0.35 +
            Math.sin(i * 1.2) * 0.25 +
            Math.sin(i * 0.15) * 0.2 +
            (withNoise ? (Math.random() - 0.5) * 0.25 : 0)
    );
}

export function MemoryGraph({ values, className, color = "#FF6B00" }: Props) {
    const staticData = useMemo(() => values ?? generateWave(40, false), [values]);
    const [data, setData] = useState(staticData);

    useEffect(() => {
        // Génère la waveform avec Math.random() uniquement côté client
        setData(values ?? generateWave());
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    const W = 300;
    const H = 48;
    const step = W / (data.length - 1);
    const mid = H / 2;
    const amp = H * 0.42;

    const points = data.map((v, i) => `${i * step},${mid - v * amp}`).join(" ");

    return (
        <div className={cn("w-full", className)}>
            <svg
                viewBox={`0 0 ${W} ${H}`}
                className="w-full h-12"
                preserveAspectRatio="none"
            >
                {/* Zero line */}
                <line x1="0" y1={mid} x2={W} y2={mid} stroke="#1F2937" strokeWidth="0.5" />
                {/* Waveform */}
                <polyline
                    points={points}
                    fill="none"
                    stroke={color}
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                    style={{ filter: `drop-shadow(0 0 3px ${color})` }}
                />
            </svg>
        </div>
    );
}
