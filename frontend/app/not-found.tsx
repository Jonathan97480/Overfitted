"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { TerminalWindow } from "@/components/public/TerminalWindow";

// ── Glitch keyframes ──────────────────────────────────────────────────────────
// Cycle 4s : burst de glitch sur les 10% initiaux (≈ 0.4s), silence ensuite.

const GLITCH_CSS = `
  @keyframes glitch-404-top {
    0%       { clip-path: inset(30% 0 55% 0); transform: translateX(-5px); }
    2.5%     { clip-path: inset(60% 0 18% 0); transform: translateX(5px); }
    5%       { clip-path: inset(10% 0 72% 0); transform: translateX(-3px); }
    7.5%     { clip-path: inset(78% 0 5% 0);  transform: translateX(3px); }
    10%, 100%{ clip-path: inset(0 0 100% 0);  transform: translateX(0); }
  }
  @keyframes glitch-404-bot {
    0%       { clip-path: inset(62% 0 0 0);  transform: translateX(5px); }
    2.5%     { clip-path: inset(0 0 68% 0);  transform: translateX(-5px); }
    5%       { clip-path: inset(42% 0 28% 0); transform: translateX(4px); }
    7.5%     { clip-path: inset(8% 0 82% 0);  transform: translateX(-2px); }
    10%, 100%{ clip-path: inset(0 0 100% 0);  transform: translateX(0); }
  }
  .glitch-404 { position: relative; display: inline-block; }
  .glitch-404::before,
  .glitch-404::after {
    content: attr(data-text);
    position: absolute;
    inset: 0;
    font: inherit;
  }
  .glitch-404::before {
    color: #FF6B00;
    animation: glitch-404-top 4s infinite steps(1);
  }
  .glitch-404::after {
    color: #00F0FF;
    animation: glitch-404-bot 4s infinite steps(1);
    animation-delay: 0.15s;
  }
`;

// ── Composant "404" ───────────────────────────────────────────────────────────

function GlitchNumber() {
    return (
        <>
            <style>{GLITCH_CSS}</style>
            {/* Wrapper Framer Motion : légère oscillation X autour du burst */}
            <motion.span
                className="block"
                animate={{
                    x: [0, -2, 2, -1, 1, 0],
                    opacity: [1, 0.95, 1],
                }}
                transition={{
                    duration: 0.4,
                    repeat: Infinity,
                    repeatDelay: 3.6,
                    ease: "easeInOut",
                }}
            >
                <span
                    className="glitch-404 text-[10rem] sm:text-[14rem] font-mono font-black text-white leading-none select-none"
                    data-text="404"
                >
                    404
                </span>
            </motion.span>
        </>
    );
}

// ── Page not-found ────────────────────────────────────────────────────────────

export default function NotFound() {
    // usePathname → affiche l'URL demandée dans le terminal
    const path = usePathname();

    return (
        <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center px-4 gap-8">
            {/* 404 glitch */}
            <div className="text-center">
                <GlitchNumber />

                {/* Sous-titre */}
                <motion.p
                    className="font-mono text-[11px] uppercase tracking-[0.35em] text-[#FF6B00] mt-3"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.5 }}
                >
                    ERROR: PAGE_NOT_FOUND{" "}
                    <span className="text-[#00F0FF]/70">//</span>{" "}
                    HUMAN_ERROR_DETECTED
                </motion.p>
            </div>

            {/* Terminal */}
            <motion.div
                className="w-full max-w-lg"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.4 }}
            >
                <TerminalWindow title="ROUTE.LOG">
                    <div className="space-y-1">
                        {[
                            ["STATUS", "404 — PAGE_NOT_FOUND"],
                            ["REQUESTED_URL", path ?? "/???"],
                            ["SUGGESTION", "GO_BACK_HUMAN"],
                        ].map(([k, v]) => (
                            <p key={k} className="text-[11px]">
                                <span className="text-[#FF6B00]">{k}</span>
                                <span className="text-[#444]"> : </span>
                                <span className="text-[#AAAAAA]">{v}</span>
                            </p>
                        ))}
                        <p className="text-[#00F0FF] text-[11px] animate-pulse mt-2">█</p>
                    </div>
                </TerminalWindow>
            </motion.div>

            {/* CTA */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.75, duration: 0.4 }}
            >
                <Link
                    href="/"
                    className="font-mono text-[11px] uppercase tracking-[0.25em] border border-[#FF6B00] text-[#FF6B00] px-8 py-3 hover:bg-[#FF6B00] hover:text-black transition-colors inline-block"
                >
                    RETOUR À LA BASE
                    <span className="block text-[9px] opacity-60 normal-case tracking-normal text-center">
                        (go home)
                    </span>
                </Link>
            </motion.div>
        </div>
    );
}
