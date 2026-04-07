"use client";
import { motion } from "framer-motion";
import { AppHeader } from "@/components/public/AppHeader";
import { AppFooter } from "@/components/public/AppFooter";
import { TerminalWindow } from "@/components/public/TerminalWindow";
import { OvfButton } from "@/components/public/OvfButton";
import { CircularGauge } from "@/components/public/CircularGauge";
import { MemoryGraph } from "@/components/public/MemoryGraph";
import { NeonBadge } from "@/components/public/NeonBadge";
import { ScanLineOverlay } from "@/components/public/ScanLineOverlay";

// ── Collections vitrine ──────────────────────────────────────────────────────
interface Collection {
    id: number;
    name: string;
    tag: string;
    score: number;
    price: string;
    accent: string;
    accentGlow: string;
    yOffset: string;
    designLines: { x1: number; y1: number; x2: number; y2: number }[] | null;
    featured?: boolean;
    desc: string;
}

const COLLECTIONS: Collection[] = [
    {
        id: 1,
        name: "SYNTAX\nCOLLECTION",
        tag: "HUMAN CHAOS",
        score: 87,
        price: "34.99",
        accent: "#00F0FF",
        accentGlow: "rgba(0,240,255,0.35)",
        yOffset: "-16px",
        designLines: [
            { x1: 58, y1: 68, x2: 138, y2: 68 },
            { x1: 58, y1: 82, x2: 118, y2: 82 },
            { x1: 58, y1: 96, x2: 128, y2: 96 },
            { x1: 58, y1: 110, x2: 98, y2: 110 },
        ],
        desc: "// RECURSIVE_HUMAN_ERROR",
    },
    {
        id: 2,
        name: "HALLUCINATION\nDROP",
        tag: "AI PATTERN",
        score: 94,
        price: "39.99",
        accent: "#FF6B00",
        accentGlow: "rgba(255,107,0,0.4)",
        yOffset: "-32px",
        designLines: null,
        featured: true,
        desc: "// LLM_FEVER_DREAM_v2",
    },
    {
        id: 3,
        name: "PULSE\n(PROCEDURAL)",
        tag: "LIVE DATA",
        score: 71,
        price: "32.99",
        accent: "#00F0FF",
        accentGlow: "rgba(0,240,255,0.25)",
        yOffset: "-8px",
        designLines: [
            { x1: 60, y1: 75, x2: 80, y2: 95 },
            { x1: 80, y1: 95, x2: 100, y2: 75 },
            { x1: 100, y1: 75, x2: 120, y2: 95 },
            { x1: 120, y1: 95, x2: 140, y2: 75 },
        ],
        desc: "// WAVEFORM_ORGANISM",
    },
];

// ── AI Checker terminal lines ────────────────────────────────────────────────
type LineVariant = "normal" | "warn" | "muted";
const CHECKER_LINES: { key: string; value: string; variant: LineVariant }[] = [
    { key: "STATUS", value: "AWAITING_INPUT", variant: "warn" },
    { key: "FILE", value: "NO_FILE_LOADED", variant: "muted" },
    { key: "DPI", value: "—", variant: "muted" },
    { key: "FORMAT", value: "—", variant: "muted" },
    { key: "HUMANITY_SCORE", value: "PENDING_ANALYSIS", variant: "muted" },
    { key: "AI_ROAST", value: "UPLOAD_TO_UNLOCK", variant: "muted" },
];

const LINE_COLORS: Record<LineVariant, string> = {
    normal: "#FFFFFF",
    warn: "#FF6B00",
    muted: "#444",
};

// ── T-Shirt SVG ──────────────────────────────────────────────────────────────
function TShirtSvg({
    accent,
    designLines,
    featured,
}: {
    accent: string;
    designLines: Collection["designLines"];
    featured?: boolean;
}) {
    return (
        <svg
            viewBox="0 0 200 220"
            className="w-full h-full"
            style={featured ? { filter: `drop-shadow(0 0 12px ${accent})` } : undefined}
        >
            {/* Body */}
            <path
                d="M65,28 L42,42 L18,34 L8,68 L38,62 L38,190 L162,190 L162,62 L192,68 L182,34 L158,42 L135,28 Q118,44 100,44 Q82,44 65,28 Z"
                fill="#0D1117"
                stroke={accent}
                strokeWidth="1.5"
            />

            {featured ? (
                /* Hallucination Drop — pixel grid */
                <g opacity="0.9">
                    {[0, 1, 2, 3, 4, 5].map((row) =>
                        [0, 1, 2, 3, 4, 5, 6].map((col) => {
                            if (!((row + col) % 2 === 0 || (row === 2 && col > 1 && col < 5))) return null;
                            return (
                                <rect
                                    key={`${row}-${col}`}
                                    x={58 + col * 14}
                                    y={65 + row * 14}
                                    width={12}
                                    height={12}
                                    fill={accent}
                                    opacity={0.15 + (row + col) * 0.07}
                                />
                            );
                        })
                    )}
                    <text x="100" y="168" textAnchor="middle" fontFamily="monospace" fontSize="9" fill={accent} opacity="0.8">
                        HALLUCINATE
                    </text>
                </g>
            ) : designLines ? (
                <g>
                    {designLines.map((l, i) => (
                        <line
                            key={i}
                            x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
                            stroke={accent}
                            strokeWidth="2"
                            opacity={0.75 - i * 0.12}
                        />
                    ))}
                </g>
            ) : null}
        </svg>
    );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function HomePage() {
    return (
        <div className="min-h-screen flex flex-col bg-[#0A0A0A]">
            <AppHeader />

            {/* ── HERO ───────────────────────────────────────────────────── */}
            <section className="flex-1 max-w-7xl mx-auto w-full px-6 py-12 lg:py-20">
                <div className="flex flex-col lg:flex-row items-stretch gap-10 lg:gap-8">

                    {/* Left: T-shirt showcase */}
                    <div className="flex-1 flex flex-col gap-6">
                        <div>
                            <p className="font-mono text-[11px] text-[#00F0FF] uppercase tracking-[0.25em] mb-2">
                                // PROTOTYPE_DATABASE v2.6
                            </p>
                            <h1 className="font-mono text-3xl lg:text-4xl font-black text-white leading-tight uppercase">
                                Prints That Think.
                                <br />
                                <span
                                    className="text-[#FF6B00]"
                                    style={{ textShadow: "0 0 20px rgba(255,107,0,0.5)" }}
                                >
                                    Merch That Judges.
                                </span>
                            </h1>
                        </div>

                        {/* Podium */}
                        <div className="flex items-end justify-center gap-3 pt-4">
                            {COLLECTIONS.map((col, i) => (
                                <motion.div
                                    key={col.id}
                                    className="flex-1 flex flex-col"
                                    style={{ marginTop: col.yOffset }}
                                    initial={{ opacity: 0, y: 30 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.6, delay: i * 0.15, ease: "easeOut" }}
                                    whileHover={{ y: -8, transition: { duration: 0.22 } }}
                                >
                                    {col.featured && (
                                        <div className="flex justify-center mb-2">
                                            <span
                                                className="font-mono text-[9px] uppercase tracking-[0.18em] px-2 py-0.5 border"
                                                style={{ color: col.accent, borderColor: col.accent }}
                                            >
                                                ★ FEATURED
                                            </span>
                                        </div>
                                    )}

                                    <div
                                        className="relative border bg-[#0D1117] p-3 overflow-hidden transition-colors duration-300 cursor-pointer"
                                        style={{ borderColor: `${col.accent}55` }}
                                        onMouseEnter={(e) => {
                                            (e.currentTarget as HTMLDivElement).style.borderColor = col.accent;
                                            (e.currentTarget as HTMLDivElement).style.boxShadow = `0 0 20px ${col.accentGlow}`;
                                        }}
                                        onMouseLeave={(e) => {
                                            (e.currentTarget as HTMLDivElement).style.borderColor = `${col.accent}55`;
                                            (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
                                        }}
                                    >
                                        <ScanLineOverlay />
                                        <div className="h-36 lg:h-44">
                                            <TShirtSvg
                                                accent={col.accent}
                                                designLines={col.designLines}
                                                featured={col.featured}
                                            />
                                        </div>
                                        <div className="flex justify-center mt-1">
                                            <NeonBadge label={`${col.score}% ${col.tag}`} />
                                        </div>
                                    </div>

                                    <div className="mt-3 text-center">
                                        <p
                                            className="font-mono text-[11px] font-bold uppercase leading-tight whitespace-pre-line"
                                            style={{ color: col.accent, letterSpacing: "0.12em" }}
                                        >
                                            {col.name}
                                        </p>
                                        <p className="font-mono text-[9px] text-[#444] mt-0.5">{col.desc}</p>
                                        <p className="font-mono text-sm text-white font-bold mt-1">{col.price}€</p>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>

                    {/* Right: AI Checker + CTA */}
                    <motion.div
                        className="lg:w-80 xl:w-96 flex flex-col gap-4"
                        initial={{ opacity: 0, x: 30 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.6, delay: 0.3 }}
                    >
                        <TerminalWindow title="AI_CHECKER_v2.1" className="flex-1">
                            <div className="space-y-2.5">
                                {CHECKER_LINES.map((line) => (
                                    <div key={line.key} className="flex items-start gap-2">
                                        <span className="font-mono text-[11px] text-[#00F0FF] shrink-0 w-36 tracking-wider">
                                            {line.key}:
                                        </span>
                                        <span
                                            className="font-mono text-[11px] break-all"
                                            style={{ color: LINE_COLORS[line.variant] }}
                                        >
                                            {line.value}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            {/* Blink cursor */}
                            <div className="flex items-center gap-1 mt-5 font-mono text-[11px] text-[#00F0FF]">
                                <span>&gt;</span>
                                <motion.span
                                    className="inline-block w-2 h-3.5 bg-[#00F0FF]"
                                    animate={{ opacity: [1, 0, 1] }}
                                    transition={{ duration: 1, repeat: Infinity }}
                                />
                            </div>

                            <div className="mt-5 pt-4 border-t border-[#00F0FF]/15">
                                <p className="font-mono text-[10px] text-[#333] uppercase tracking-widest">
                                    // UPLOAD_TO_ACTIVATE_ANALYSIS
                                </p>
                            </div>
                        </TerminalWindow>

                        <OvfButton href="/upload" subtitle="(WE DARE YOU)">
                            UPLOAD YOUR CREATION
                        </OvfButton>

                        <OvfButton href="/shop" variant="ghost">
                            BROWSE THE DATABASE
                        </OvfButton>
                    </motion.div>
                </div>
            </section>

            {/* ── SOUL-O-METER ───────────────────────────────────────────── */}
            <section className="border-t border-[#00F0FF]/10 bg-[#060606]">
                <div className="max-w-7xl mx-auto px-6 py-14 lg:py-20">
                    <div className="text-center mb-12">
                        <p className="font-mono text-[11px] text-[#00F0FF] uppercase tracking-[0.25em] mb-2">
                            // SOUL_ANALYSIS_ENGINE v1.0
                        </p>
                        <h2 className="font-mono text-2xl lg:text-3xl font-black text-white uppercase">
                            How Human Is Your Art?
                        </h2>
                        <p className="font-mono text-[11px] text-[#444] mt-2 uppercase tracking-widest">
                            // Upload a design. Let us destroy your confidence. Scientifically.
                        </p>
                    </div>

                    <div className="flex flex-col lg:flex-row items-center gap-10 lg:gap-14">

                        {/* Gauge */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6 }}
                            className="shrink-0"
                        >
                            <CircularGauge value={73} label="ORGANIC CHAOS" sublabel="SOUL-O-METER™" />
                        </motion.div>

                        {/* Before / After */}
                        <div className="flex-1 max-w-sm w-full">
                            <TerminalWindow title="BEFORE_/_AFTER_ANALYSIS">
                                <div className="relative h-40 bg-[#080808] flex overflow-hidden -mx-4 -mb-4">
                                    <div className="flex-1 flex items-center justify-center border-r border-[#00F0FF]/20">
                                        <div className="text-center space-y-1">
                                            <p className="font-mono text-[10px] text-[#333] uppercase tracking-widest">BEFORE</p>
                                            <p className="font-mono text-xs text-[#EF4444]/60">72 DPI</p>
                                            <p className="font-mono text-[10px] text-[#333]">// TRASH</p>
                                        </div>
                                    </div>
                                    <div className="flex-1 flex items-center justify-center">
                                        <div className="text-center space-y-1">
                                            <p className="font-mono text-[10px] text-[#00F0FF] uppercase tracking-widest">AFTER</p>
                                            <p className="font-mono text-xs text-[#00F0FF]/70">300 DPI</p>
                                            <p className="font-mono text-[10px] text-[#444]">// FIXED</p>
                                        </div>
                                    </div>
                                    {/* Divider handle */}
                                    <div className="absolute inset-y-0 left-1/2 w-px bg-[#00F0FF]/60" />
                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-5 rounded-full border-2 border-[#00F0FF] bg-[#060606] shadow-[0_0_8px_rgba(0,240,255,0.5)]" />
                                </div>
                            </TerminalWindow>
                        </div>

                        {/* Waveform + bars + CTA */}
                        <div className="flex-1 max-w-xs w-full flex flex-col gap-5">
                            <div>
                                <p className="font-mono text-[10px] text-[#333] uppercase tracking-widest mb-1.5">
                                    CHAOS_WAVEFORM // LIVE
                                </p>
                                <div className="border border-[#1F2937] bg-[#080808] px-2 py-1">
                                    <MemoryGraph />
                                </div>
                            </div>

                            <div className="space-y-2.5">
                                {[
                                    { label: "HUMANITY", value: 73, color: "#FF6B00" },
                                    { label: "AI_POLLUTION", value: 27, color: "#00F0FF" },
                                    { label: "CRAFT_LEVEL", value: 61, color: "#FF6B00" },
                                ].map((b) => (
                                    <div key={b.label} className="flex items-center gap-3 font-mono text-[11px]">
                                        <span className="text-[#444] w-28 shrink-0">{b.label}:</span>
                                        <div className="flex-1 h-1.5 bg-[#1A1A1A] rounded-full overflow-hidden">
                                            <motion.div
                                                className="h-full rounded-full"
                                                style={{ backgroundColor: b.color }}
                                                initial={{ width: 0 }}
                                                whileInView={{ width: `${b.value}%` }}
                                                viewport={{ once: true }}
                                                transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
                                            />
                                        </div>
                                        <span style={{ color: b.color }} className="w-8 text-right">
                                            {b.value}%
                                        </span>
                                    </div>
                                ))}
                            </div>

                            <OvfButton href="/upload" subtitle="(FIX THE DESIGN)">
                                OVERFIT ME
                            </OvfButton>
                        </div>
                    </div>
                </div>
            </section>

            <AppFooter />
        </div>
    );
}
