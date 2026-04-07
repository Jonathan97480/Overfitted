"use client";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface Props {
    className?: string;
    axis?: "x" | "y";
}

export function ScanLineOverlay({ className, axis = "x" }: Props) {
    const isX = axis === "x";
    return (
        <div className={cn("absolute inset-0 overflow-hidden pointer-events-none", className)}>
            <motion.div
                className={cn(
                    "absolute bg-gradient-to-r from-transparent via-[#00F0FF] to-transparent opacity-70",
                    isX ? "top-0 bottom-0 w-0.5" : "left-0 right-0 h-0.5"
                )}
                initial={isX ? { x: "-10%" } : { y: "-10%" }}
                animate={isX ? { x: "110%" } : { y: "110%" }}
                transition={{
                    duration: 2,
                    ease: "linear",
                    repeat: Infinity,
                    repeatDelay: 1.2,
                }}
            />
        </div>
    );
}
