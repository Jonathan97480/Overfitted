"use client";
import { cn } from "@/lib/utils";

interface Props {
    color: string;
    colorCode: string;
    selected: boolean;
    disabled?: boolean;
    onClick: () => void;
}

export function ColorSwatch({ color, colorCode, selected, disabled = false, onClick }: Props) {
    return (
        <button
            type="button"
            title={color}
            onClick={onClick}
            disabled={disabled}
            aria-label={`Couleur ${color}`}
            className={cn(
                "relative w-7 h-7 rounded border-2 transition-all duration-150",
                selected
                    ? "border-[#00F0FF] shadow-[0_0_10px_rgba(0,240,255,0.5)]"
                    : "border-[#333] hover:border-[#00F0FF]/60",
                disabled && "opacity-30 cursor-not-allowed"
            )}
            style={{ backgroundColor: colorCode || "#333" }}
        >
            {disabled && (
                <span className="absolute inset-0 flex items-center justify-center">
                    <span className="block w-[1px] h-full bg-[#FF0000]/60 rotate-45 absolute" />
                </span>
            )}
        </button>
    );
}
