import { cn } from "@/lib/utils";

interface Props {
    label: string;
    className?: string;
}

export function NeonBadge({ label, className }: Props) {
    return (
        <span
            className={cn(
                "inline-block font-mono text-[10px] uppercase tracking-[0.15em]",
                "text-[#00F0FF] border border-[#00F0FF]/50 px-2 py-0.5",
                "shadow-[0_0_8px_rgba(0,240,255,0.25)]",
                className
            )}
        >
            {label}
        </span>
    );
}
