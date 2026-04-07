"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { TerminalWindow } from "@/components/public/TerminalWindow";

// ── Inline glitch animation ───────────────────────────────────────────────────
// GlitchText component n'existe pas encore — implémentation locale

function GlitchNumber() {
    return (
        <>
            <style>{`
                @keyframes glitch-clip-1 {
                    0%,100% { clip-path: inset(0 0 90% 0); transform: translateX(0); }
                    20%      { clip-path: inset(30% 0 50% 0); transform: translateX(-4px); }
                    40%      { clip-path: inset(60% 0 20% 0); transform: translateX(4px); }
                    60%      { clip-path: inset(10% 0 75% 0); transform: translateX(-2px); }
                    80%      { clip-path: inset(80% 0 5% 0); transform: translateX(3px); }
                }
                @keyframes glitch-clip-2 {
                    0%,100% { clip-path: inset(70% 0 0 0); transform: translateX(0); }
                    20%      { clip-path: inset(0 0 60% 0); transform: translateX(4px); }
                    40%      { clip-path: inset(50% 0 30% 0); transform: translateX(-4px); }
                    60%      { clip-path: inset(20% 0 65% 0); transform: translateX(2px); }
                    80%      { clip-path: inset(5% 0 85% 0); transform: translateX(-3px); }
                }
                .glitch-base { position: relative; display: inline-block; }
                .glitch-base::before,
                .glitch-base::after {
                    content: attr(data-text);
                    position: absolute;
                    inset: 0;
                    font: inherit;
                }
                .glitch-base::before {
                    color: #FF6B00;
                    animation: glitch-clip-1 4s infinite steps(1);
                }
                .glitch-base::after {
                    color: #00F0FF;
                    animation: glitch-clip-2 4s infinite steps(1);
                    animation-delay: 0.3s;
                }
            `}</style>
            <span
                className="glitch-base text-[10rem] font-mono font-black text-white leading-none select-none"
                data-text="500"
            >
                500
            </span>
        </>
    );
}

// ── Error page ────────────────────────────────────────────────────────────────

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    const router = useRouter();

    useEffect(() => {
        // Log côté client — ne pas exposer en prod
        console.error("[GlobalError]", error);
    }, [error]);

    return (
        <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center px-4 gap-8">
            {/* Glitch 500 */}
            <div className="text-center">
                <GlitchNumber />
                <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-[#FF6B00] mt-3">
                    SERVER_MELTDOWN
                </p>
            </div>

            {/* Terminal */}
            <TerminalWindow title="ERROR.LOG" className="w-full max-w-lg">
                <div className="space-y-1">
                    {[
                        ["STATUS", "500 — INTERNAL_SERVER_ERROR"],
                        ["MESSAGE", "ERROR: SERVER_MELTDOWN // THE_AI_IS_CRYING"],
                        ["CAUSE", error.digest ?? "UNKNOWN_SIGNAL"],
                        ["SUGGESTION", "RETRY_OR_RETURN_TO_BASE"],
                    ].map(([k, v]) => (
                        <p key={k} className="text-[11px]">
                            <span className="text-[#FF6B00]">{k}</span>
                            <span className="text-[#444]"> : </span>
                            <span className="text-[#AAAAAA]">{v}</span>
                        </p>
                    ))}
                    <p className="text-[#FF6B00] text-[11px] animate-pulse mt-2">█</p>
                </div>
            </TerminalWindow>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
                <button
                    onClick={reset}
                    className="font-mono text-[11px] uppercase tracking-[0.25em] border border-[#FF6B00] text-[#FF6B00] px-6 py-2.5 hover:bg-[#FF6B00] hover:text-black transition-colors"
                >
                    RÉESSAYER
                    <span className="block text-[9px] opacity-60 normal-case tracking-normal">
                        (reset error boundary)
                    </span>
                </button>

                <button
                    onClick={() => router.push("/")}
                    className="font-mono text-[11px] uppercase tracking-[0.25em] border border-[#00F0FF]/40 text-[#00F0FF] px-6 py-2.5 hover:bg-[#00F0FF]/10 transition-colors"
                >
                    RETOUR À LA BASE
                    <span className="block text-[9px] opacity-60 normal-case tracking-normal">
                        (go home)
                    </span>
                </button>
            </div>
        </div>
    );
}
