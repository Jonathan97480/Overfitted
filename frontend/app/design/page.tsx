"use client";

import { useCallback } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import {
    setColor,
    setSize,
    setScale,
    setPosition,
    setSarcasticText,
    toggleGlitchFilter,
    selectDesign,
    type GlitchFilter,
} from "@/lib/slices/designSlice";
import { addItem } from "@/lib/slices/cartSlice";
import { selectUpload } from "@/lib/slices/uploadSlice";
import { ColorSwatch } from "@/components/public/ColorSwatch";
import { VerticalSlider } from "@/components/public/VerticalSlider";
import { TerminalWindow } from "@/components/public/TerminalWindow";
import { CircularGauge } from "@/components/public/CircularGauge";
import { MemoryGraph } from "@/components/public/MemoryGraph";
import { OvfButton } from "@/components/public/OvfButton";
import { AppHeader } from "@/components/public/AppHeader";
import { AppFooter } from "@/components/public/AppFooter";

// ─── T-shirt color palette ──────────────────────────────────────────────────

const TSHIRT_COLORS = [
    { label: "Black", colorCode: "#1A1A1A" },
    { label: "White", colorCode: "#F5F5F5" },
    { label: "Gray", colorCode: "#555555" },
    { label: "Cyber Cyan", colorCode: "#00F0FF" },
    { label: "Neon", colorCode: "#FF6B00" },
    { label: "Burnt", colorCode: "#CC4400" },
] as const;

const SIZES = ["XS", "S", "M", "L", "XL", "XXL"] as const;

const GLITCH_FILTERS: { id: GlitchFilter; label: string }[] = [
    { id: "STATIC_NOISE", label: "STATIC_NOISE" },
    { id: "COLOR_BLEED", label: "COLOR_BLEED" },
    { id: "ASCII_OVERLAY", label: "ASCII_OVERLAY" },
];

// ─── Sub-components ─────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
    return (
        <p className="font-mono text-[9px] text-[#00F0FF] uppercase tracking-[0.25em] mb-2 border-b border-[#00F0FF]/20 pb-1">
            {children}
        </p>
    );
}

function TerminalLine({
    label,
    value,
    color = "#DDD",
}: {
    label: string;
    value: string;
    color?: string;
}) {
    return (
        <p className="text-xs leading-relaxed truncate">
            <span className="text-[#00F0FF]">{label}: </span>
            <span style={{ color }}>{value}</span>
        </p>
    );
}

function GlitchCheckbox({
    id,
    label,
    checked,
    onChange,
}: {
    id: GlitchFilter;
    label: string;
    checked: boolean;
    onChange: () => void;
}) {
    return (
        <label className="flex items-center gap-2 cursor-pointer group">
            <button
                type="button"
                onClick={onChange}
                aria-pressed={checked}
                className={`
                    w-4 h-4 border flex items-center justify-center text-[10px] font-bold
                    transition-colors duration-100 flex-shrink-0
                    ${checked
                        ? "border-[#FF6B00] text-[#FF6B00] bg-[#FF6B00]/10"
                        : "border-[#444] text-transparent hover:border-[#FF6B00]/60"
                    }
                `}
            >
                ✕
            </button>
            <span className="font-mono text-[10px] text-[#888] group-hover:text-[#AAA] uppercase tracking-widest">
                {label}
            </span>
        </label>
    );
}

// ─── T-shirt preview SVG ─────────────────────────────────────────────────────

function TshirtPreview({
    bgColor,
    imageUrl,
    scale,
    position,
    sarcasticText,
    glitchFilters,
}: {
    bgColor: string;
    imageUrl: string | null;
    scale: number;
    position: number;
    sarcasticText: string;
    glitchFilters: GlitchFilter[];
}) {
    const hasStaticNoise = glitchFilters.includes("STATIC_NOISE");
    const hasColorBleed = glitchFilters.includes("COLOR_BLEED");
    const hasAsciiOverlay = glitchFilters.includes("ASCII_OVERLAY");

    // Convert scale (50–150) to a CSS scale factor
    const scaleFactor = scale / 100;
    // Convert position (0–100) to top offset within design area (10%–70%)
    const topOffset = 10 + (position / 100) * 60;

    const isLightBg = bgColor === "#F5F5F5";

    return (
        <div className="relative flex flex-col items-center">
            {/* T-shirt silhouette */}
            <div
                className="relative w-64 h-72 flex items-start justify-center overflow-hidden"
                style={{ filter: hasColorBleed ? "saturate(2) hue-rotate(5deg)" : undefined }}
            >
                {/* SVG tshirt shape */}
                <svg
                    viewBox="0 0 200 220"
                    className="absolute inset-0 w-full h-full"
                    aria-hidden="true"
                >
                    {/* T-shirt body */}
                    <path
                        d="M60,20 L10,60 L35,70 L35,200 L165,200 L165,70 L190,60 L140,20 Q120,10 100,12 Q80,10 60,20Z"
                        fill={bgColor}
                        stroke={isLightBg ? "#999" : "#333"}
                        strokeWidth="1"
                    />
                    {/* Collar */}
                    <path
                        d="M80,20 Q100,38 120,20"
                        fill="none"
                        stroke={isLightBg ? "#999" : "#444"}
                        strokeWidth="1.5"
                    />
                    {/* Seam lines */}
                    <line x1="100" y1="38" x2="100" y2="200"
                        stroke={isLightBg ? "#CCC" : "#2A2A2A"}
                        strokeWidth="0.5"
                        strokeDasharray="4 4"
                    />
                </svg>

                {/* Design area */}
                <div
                    className="absolute flex items-center justify-center"
                    style={{
                        top: `${topOffset}%`,
                        left: "50%",
                        transform: `translateX(-50%) scale(${scaleFactor})`,
                        width: "120px",
                        height: "120px",
                        transformOrigin: "top center",
                    }}
                >
                    {imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={imageUrl}
                            alt="Design"
                            className="max-w-full max-h-full object-contain"
                            style={{
                                filter: hasStaticNoise
                                    ? "contrast(1.4) brightness(0.9) url(#noiseFilter)"
                                    : undefined,
                                mixBlendMode: isLightBg ? "multiply" : "normal",
                            }}
                        />
                    ) : (
                        <div
                            className="w-full h-full border border-dashed flex items-center justify-center"
                            style={{ borderColor: isLightBg ? "#AAA" : "#444" }}
                        >
                            <span className="font-mono text-[9px] uppercase tracking-widest"
                                style={{ color: isLightBg ? "#999" : "#555" }}>
                                DESIGN_HERE
                            </span>
                        </div>
                    )}
                </div>

                {/* ASCII overlay */}
                {hasAsciiOverlay && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <p className="font-mono text-[6px] text-[#00F0FF]/20 leading-none select-none whitespace-pre">
                            {`01001111 01010110 01000110\n10100011 00110110 11001001\n01110110 10011001 01100101`}
                        </p>
                    </div>
                )}
            </div>

            {/* Design label */}
            {sarcasticText && (
                <div className="mt-2 text-center max-w-[260px]">
                    <p className="font-mono text-[10px] text-[#00F0FF] uppercase tracking-widest leading-relaxed whitespace-pre-line">
                        {sarcasticText.toUpperCase().replace(/\s+/g, "_")}
                    </p>
                </div>
            )}
            {!sarcasticText && (
                <p className="mt-2 font-mono text-[10px] text-[#333] uppercase tracking-widest">
                    PROMPT_ENGINEERING_SCUM<br />
                    <span className="text-[#2A2A2A]">(FLAWED_HUMAN_ART)</span>
                </p>
            )}
        </div>
    );
}

// ─── Main page ───────────────────────────────────────────────────────────────

export default function DesignPage() {
    const dispatch = useAppDispatch();
    const design = useAppSelector(selectDesign);
    const upload = useAppSelector(selectUpload);

    const {
        selectedColor,
        selectedColorCode,
        selectedSize,
        scale,
        position,
        sarcasticText,
        glitchFilters,
    } = design;

    const soulScore = upload.soulScore ?? 0;
    const imageUrl = upload.imageUrl ?? null;

    const canAddToCart = selectedSize !== "";

    const humanityLabel = (() => {
        if (soulScore >= 70) return "HUMAN_CONFIRMED";
        if (soulScore >= 40) return "MIXED_SIGNALS";
        return "SUSPICIOUS_AI_VIBES";
    })();

    const handleAddToCart = useCallback(() => {
        if (!canAddToCart) return;
        dispatch(
            addItem({
                id: `design-${Date.now()}`,
                productId: 0,
                variantId: 0,
                name: sarcasticText || "CUSTOM_DESIGN",
                size: selectedSize,
                color: selectedColor,
                colorCode: selectedColorCode,
                thumbnailUrl: imageUrl,
                price: 29.99,
                quantity: 1,
            })
        );
    }, [
        canAddToCart,
        dispatch,
        sarcasticText,
        selectedSize,
        selectedColor,
        selectedColorCode,
        imageUrl,
    ]);

    return (
        <>
            <AppHeader />
            <main className="min-h-screen bg-[#080C10] text-white font-mono pb-10">

                {/* ── Header ─────────────────────────────────────────────────── */}
                <section className="px-6 pt-8 pb-4">
                    <p className="text-[10px] text-[#00F0FF]/50 uppercase tracking-[0.3em] mb-1">
                        Overfitted.io &rsaquo; Design
                    </p>
                    <h1 className="font-mono text-2xl md:text-3xl font-bold text-[#00F0FF] uppercase tracking-[0.15em]">
                        DESIGN TOOLKIT{" "}
                        <span className="text-[#FF6B00]">(v1.0)</span>
                    </h1>
                </section>

                {/* ── 3-column layout ────────────────────────────────────────── */}
                <section className="px-6 grid grid-cols-1 lg:grid-cols-[280px_1fr_280px] gap-4 items-start">

                    {/* ══ LEFT — Toolkit ═══════════════════════════════════════ */}
                    <div className="flex flex-col gap-4">
                        <div className="border border-[#00F0FF] bg-[#0D1117] shadow-[0_0_24px_rgba(0,240,255,0.1)]">
                            {/* Chrome */}
                            <div className="flex items-center justify-between px-3 py-2 bg-[#0A0E14] border-b border-[#00F0FF]/30">
                                <span className="font-mono text-[10px] text-[#00F0FF] uppercase tracking-[0.2em]">
                                    DESIGN TOOLKIT (v1.0)
                                </span>
                                <div className="flex items-center gap-1">
                                    <span className="inline-flex items-center justify-center w-3.5 h-3.5 border border-[#333] text-[#444] text-[7px] leading-none">─</span>
                                    <span className="inline-flex items-center justify-center w-3.5 h-3.5 border border-[#333] text-[#444] text-[7px] leading-none">□</span>
                                    <span className="inline-flex items-center justify-center w-3.5 h-3.5 border border-[#444] text-[#666] text-[7px] leading-none">✕</span>
                                </div>
                            </div>

                            <div className="p-4 flex flex-col gap-5">

                                {/* T-SHIRT COLOR */}
                                <div>
                                    <SectionLabel>T-SHIRT COLOR</SectionLabel>
                                    <div className="flex flex-wrap gap-2">
                                        {TSHIRT_COLORS.map((c) => (
                                            <ColorSwatch
                                                key={c.label}
                                                color={c.label}
                                                colorCode={c.colorCode}
                                                selected={selectedColor === c.label}
                                                onClick={() =>
                                                    dispatch(
                                                        setColor({
                                                            label: c.label,
                                                            colorCode: c.colorCode,
                                                        })
                                                    )
                                                }
                                            />
                                        ))}
                                    </div>
                                    <p className="font-mono text-[10px] text-[#555] mt-1 uppercase tracking-widest">
                                        Selected: {selectedColor}
                                    </p>
                                </div>

                                {/* DESIGN LAYOUT */}
                                <div>
                                    <SectionLabel>DESIGN LAYOUT</SectionLabel>
                                    <div className="flex justify-around items-start">
                                        <VerticalSlider
                                            label="SCALE"
                                            value={scale}
                                            min={50}
                                            max={150}
                                            unit="%"
                                            onChange={(v) => dispatch(setScale(v))}
                                        />
                                        <VerticalSlider
                                            label="POSITION"
                                            value={position}
                                            min={0}
                                            max={100}
                                            unit=""
                                            onChange={(v) => dispatch(setPosition(v))}
                                        />
                                    </div>
                                </div>

                                {/* SARCASTIC TEXT */}
                                <div>
                                    <SectionLabel>ADD SARCASTIC TEXT</SectionLabel>
                                    <textarea
                                        value={sarcasticText}
                                        onChange={(e) =>
                                            dispatch(setSarcasticText(e.target.value))
                                        }
                                        placeholder="Write your insult here"
                                        maxLength={80}
                                        rows={3}
                                        className="
                                        w-full bg-[#080C10] border border-[#00F0FF]/40
                                        font-mono text-xs text-[#DDD] placeholder-[#333]
                                        p-2 resize-none uppercase tracking-widest
                                        focus:outline-none focus:border-[#00F0FF]
                                        transition-colors duration-150
                                    "
                                    />
                                    <p className="font-mono text-[9px] text-[#333] text-right mt-0.5">
                                        {sarcasticText.length}/80
                                    </p>
                                </div>

                                {/* SIZE SELECTION */}
                                <div>
                                    <SectionLabel>SELECT SIZE</SectionLabel>
                                    <div className="flex flex-wrap gap-1.5">
                                        {SIZES.map((s) => (
                                            <button
                                                key={s}
                                                type="button"
                                                onClick={() => dispatch(setSize(s))}
                                                className={`
                                                w-10 h-8 font-mono text-xs uppercase border transition-colors duration-100
                                                ${selectedSize === s
                                                        ? "border-[#FF6B00] text-[#FF6B00] bg-[#FF6B00]/10"
                                                        : "border-[#333] text-[#666] hover:border-[#FF6B00]/60 hover:text-[#AAA]"
                                                    }
                                            `}
                                            >
                                                {s}
                                            </button>
                                        ))}
                                    </div>
                                    {!selectedSize && (
                                        <p className="font-mono text-[9px] text-red-400/70 mt-1 uppercase tracking-widest">
                                            ⚠ SIZE_REQUIRED
                                        </p>
                                    )}
                                </div>

                            </div>
                        </div>

                        {/* ADD TO CART button */}
                        <OvfButton
                            onClick={canAddToCart ? handleAddToCart : undefined}
                            disabled={!canAddToCart}
                            subtitle="(PURCHASE ORGANIC CHAOS)"
                        >
                            ADD TO CART
                        </OvfButton>
                        {!canAddToCart && (
                            <p className="font-mono text-[9px] text-[#555] text-center uppercase tracking-widest -mt-2">
                                SELECT A SIZE TO ENABLE
                            </p>
                        )}
                    </div>

                    {/* ══ CENTER — T-shirt preview ═══════════════════════════ */}
                    <div className="flex flex-col items-center justify-start gap-4 py-4">
                        <TshirtPreview
                            bgColor={selectedColorCode}
                            imageUrl={imageUrl}
                            scale={scale}
                            position={position}
                            sarcasticText={sarcasticText}
                            glitchFilters={glitchFilters}
                        />

                        {/* Specs strip */}
                        <div className="w-full max-w-xs border border-[#1A1F2E] bg-[#0D1117] px-3 py-2 flex flex-wrap gap-x-4 gap-y-1">
                            <p className="font-mono text-[9px] text-[#444] uppercase">
                                Color: <span className="text-[#00F0FF]">{selectedColor}</span>
                            </p>
                            <p className="font-mono text-[9px] text-[#444] uppercase">
                                Size: <span className={selectedSize ? "text-[#FF6B00]" : "text-[#333]"}>
                                    {selectedSize || "---"}
                                </span>
                            </p>
                            <p className="font-mono text-[9px] text-[#444] uppercase">
                                Scale: <span className="text-[#DDD]">{scale}%</span>
                            </p>
                            <p className="font-mono text-[9px] text-[#444] uppercase">
                                Pos: <span className="text-[#DDD]">{position}</span>
                            </p>
                        </div>
                    </div>

                    {/* ══ RIGHT — AI Validator + Humanity Score ═════════════ */}
                    <div className="flex flex-col gap-4">

                        {/* AI VALIDATOR TERMINAL */}
                        <TerminalWindow title="AI VALIDATOR TERMINAL">
                            <div className="space-y-2 min-h-[100px]">
                                <TerminalLine label="STATUS" value="DESIGN_IN_PROGRESS" />
                                <TerminalLine
                                    label="COLOR"
                                    value={selectedColor.toUpperCase().replace(" ", "_")}
                                />
                                <TerminalLine
                                    label="SIZE"
                                    value={selectedSize || "NOT_SELECTED"}
                                    color={selectedSize ? "#DDD" : "#FF4444"}
                                />
                                <TerminalLine
                                    label="SCALE"
                                    value={`${scale}%`}
                                />
                                <TerminalLine
                                    label="GLITCH_FX"
                                    value={glitchFilters.length > 0
                                        ? glitchFilters.join("+")
                                        : "NONE"
                                    }
                                    color={glitchFilters.length > 0 ? "#FF6B00" : "#555"}
                                />
                                <div className="border-t border-[#1A1F2E] pt-2" />
                                <TerminalLine
                                    label="HUMANITY_SCORE"
                                    value={soulScore ? `${soulScore}%` : "UPLOAD_REQUIRED"}
                                    color={
                                        soulScore >= 70
                                            ? "#22C55E"
                                            : soulScore >= 40
                                                ? "#F59E0B"
                                                : soulScore > 0
                                                    ? "#EF4444"
                                                    : "#555"
                                    }
                                />
                                <TerminalLine
                                    label="MESSAGE"
                                    value={humanityLabel}
                                    color="#00F0FF"
                                />
                            </div>
                        </TerminalWindow>

                        {/* HUMANITY SCORE panel */}
                        <div className="border border-[#FF6B00] bg-[#0D1117] shadow-[0_0_20px_rgba(255,107,0,0.1)]">
                            <div className="flex items-center justify-between px-3 py-2 bg-[#0A0E14] border-b border-[#FF6B00]/30">
                                <span className="font-mono text-[10px] text-[#FF6B00] uppercase tracking-[0.2em]">
                                    HUMANITY SCORE
                                </span>
                                <div className="flex items-center gap-1">
                                    <span className="inline-flex items-center justify-center w-3.5 h-3.5 border border-[#333] text-[#444] text-[7px] leading-none">─</span>
                                    <span className="inline-flex items-center justify-center w-3.5 h-3.5 border border-[#333] text-[#444] text-[7px] leading-none">□</span>
                                    <span className="inline-flex items-center justify-center w-3.5 h-3.5 border border-[#444] text-[#666] text-[7px] leading-none">✕</span>
                                </div>
                            </div>

                            <div className="p-4 flex flex-col gap-4">
                                {/* Gauge */}
                                <div className="flex justify-center">
                                    <CircularGauge
                                        value={soulScore}
                                        label="ORGANIC CHAOS"
                                        sublabel={humanityLabel}
                                    />
                                </div>

                                {/* TECH GLITCH FILTERS */}
                                <div>
                                    <SectionLabel>TECH GLITCH FILTERS</SectionLabel>
                                    <div className="flex flex-col gap-2">
                                        {GLITCH_FILTERS.map((f) => (
                                            <GlitchCheckbox
                                                key={f.id}
                                                id={f.id}
                                                label={f.label}
                                                checked={glitchFilters.includes(f.id)}
                                                onChange={() =>
                                                    dispatch(toggleGlitchFilter(f.id))
                                                }
                                            />
                                        ))}
                                    </div>
                                </div>

                                {/* Memory graph */}
                                <div>
                                    <p className="font-mono text-[9px] text-[#444] uppercase tracking-widest mb-1">
                                        MEMORY
                                    </p>
                                    <MemoryGraph color="#FF6B00" />
                                </div>
                            </div>
                        </div>
                    </div>

                </section>

                {/* ── Status bar ────────────────────────────────────────────── */}
                <div className="fixed bottom-0 left-0 right-0 h-8 bg-[#080C10] border-t border-[#1A1F2E] flex items-center px-6 gap-6 z-10">
                    <span className="font-mono text-[10px] text-[#00F0FF] uppercase tracking-[0.15em]">
                        Design State:{" "}
                        <span className={canAddToCart ? "text-green-400" : "text-yellow-400"}>
                            {canAddToCart ? "READY" : "SIZE_MISSING"}
                        </span>
                    </span>
                    <span className="font-mono text-[10px] text-[#444] uppercase tracking-[0.15em]">
                        Redux Store:{" "}
                        <span className="text-green-400">SYNCED</span>
                    </span>
                    {glitchFilters.length > 0 && (
                        <span className="font-mono text-[10px] text-[#FF6B00] uppercase tracking-[0.15em]">
                            FX: {glitchFilters.join(" + ")}
                        </span>
                    )}
                </div>

            </main>
            <AppFooter />
        </>
    );
}
