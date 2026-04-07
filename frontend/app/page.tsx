"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { AppHeader } from "@/components/public/AppHeader";
import { AppFooter } from "@/components/public/AppFooter";
import { TerminalWindow } from "@/components/public/TerminalWindow";
import { OvfButton } from "@/components/public/OvfButton";
import { CircularGauge } from "@/components/public/CircularGauge";
import { MemoryGraph } from "@/components/public/MemoryGraph";
import { NeonBadge } from "@/components/public/NeonBadge";
import { ScanLineOverlay } from "@/components/public/ScanLineOverlay";
import { useGetPublicProductsQuery } from "@/lib/publicApi";

// ── Labels collections (stables, indépendants des noms DB) ──────────────────
const COLLECTION_LABELS = [
  { line1: "SYNTAX", line2: "COLLECTION", accent: "#00F0FF" },
  { line1: "HALLUCINATION", line2: "DROP", accent: "#FF6B00" },
  { line1: "PULSE", line2: "(PROCEDURAL)", accent: "#00F0FF" },
] as const;

// ── Carousel produits ────────────────────────────────────────────────────────
function ProductPodium() {
  const { data, isLoading } = useGetPublicProductsQuery();
  const products = data?.result?.slice(0, 3) ?? [];
  const [activeIndex, setActiveIndex] = useState(1);

  const n = 3;
  // Calcule la position de slot pour chaque produit : -1 = gauche, 0 = centre, 1 = droite
  const getSlot = (i: number): -1 | 0 | 1 => {
    const diff = ((i - activeIndex) + n) % n;
    if (diff === 0) return 0;
    if (diff === 1) return 1;
    return -1;
  };

  const SLOT: Record<-1 | 0 | 1, { x: string; scale: number; opacity: number; zIndex: number; marginBottom: string }> = {
    [-1]: { x: "-6%", scale: 0.68, opacity: 0.5, zIndex: 0, marginBottom: "28px" },
    [0]: { x: "0%", scale: 1, opacity: 1, zIndex: 10, marginBottom: "0px" },
    [1]: { x: "6%", scale: 0.68, opacity: 0.5, zIndex: 0, marginBottom: "20px" },
  };

  return (
    <div className="flex flex-col gap-0 pt-4">
      {/* Carousel — 3 cartes toujours visibles, position animée */}
      <div className="flex items-end justify-center gap-2">
        {[0, 1, 2].map((i) => {
          const slot = getSlot(i);
          const cfg = SLOT[slot];
          const product = products[i] ?? null;
          const isCenter = slot === 0;
          const accent = isCenter ? "#FF6B00" : "#00F0FF";
          const accentGlow = isCenter ? "rgba(255,107,0,0.4)" : "rgba(0,240,255,0.25)";

          return (
            <motion.div
              key={i}
              layout
              className="flex-1 flex flex-col cursor-pointer"
              animate={{ scale: cfg.scale, opacity: cfg.opacity, zIndex: cfg.zIndex }}
              style={{ marginBottom: cfg.marginBottom }}
              transition={{ type: "spring", stiffness: 260, damping: 28 }}
              onClick={() => setActiveIndex(i)}
              whileHover={!isCenter ? { opacity: 0.75 } : {}}
            >
              {isCenter && (
                <motion.div
                  className="flex justify-center mb-2"
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                >
                  <span className="font-mono text-[9px] uppercase tracking-[0.18em] px-2 py-0.5 border border-[#FF6B00] text-[#FF6B00]">
                    ★ FEATURED
                  </span>
                </motion.div>
              )}

              <div
                className="relative border bg-[#0D1117] p-3 overflow-hidden transition-shadow duration-300"
                style={{
                  borderColor: isCenter ? accent : `${accent}44`,
                  boxShadow: isCenter ? `0 0 28px ${accentGlow}` : "none",
                }}
              >
                <ScanLineOverlay />
                <div className={`${isCenter ? "h-44 lg:h-52" : "h-28 lg:h-36"} relative flex items-center justify-center`}>
                  {isLoading ? (
                    <div className="w-8 h-8 border border-current opacity-20 animate-pulse" style={{ color: accent }} />
                  ) : product?.thumbnail_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={product.thumbnail_url}
                      alt={product.name}
                      className="w-full h-full object-contain"
                      style={isCenter ? { filter: `drop-shadow(0 0 14px ${accent})` } : undefined}
                    />
                  ) : (
                    <svg viewBox="0 0 200 220" className={isCenter ? "w-24 h-28" : "w-14 h-18 opacity-40"}>
                      <path
                        d="M65,28 L42,42 L18,34 L8,68 L38,62 L38,190 L162,190 L162,62 L192,68 L182,34 L158,42 L135,28 Q118,44 100,44 Q82,44 65,28 Z"
                        fill="none" stroke={accent} strokeWidth="1.5"
                      />
                    </svg>
                  )}
                </div>
                {isCenter && (
                  <div className="flex justify-center mt-1">
                    <NeonBadge label={isLoading ? "LOADING..." : product ? "IN_STOCK" : "COMING_SOON"} />
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Labels — cliquer tourne la roue */}
      <div className="flex items-stretch justify-center border-t border-[#1A1A1A]">
        {COLLECTION_LABELS.map((lbl, i) => {
          const isActive = i === activeIndex;
          return (
            <motion.button
              key={i}
              onClick={() => setActiveIndex(i)}
              className="flex-1 flex flex-col items-center justify-center py-3 px-1 font-mono uppercase cursor-pointer border-t-2 transition-colors duration-200"
              style={{
                borderColor: isActive ? lbl.accent : "transparent",
                backgroundColor: isActive ? `${lbl.accent}12` : "transparent",
              }}
              whileHover={{ backgroundColor: `${lbl.accent}08` }}
            >
              <span
                className="text-[9px] lg:text-[10px] font-black tracking-[0.14em] leading-tight text-center block"
                style={{
                  color: isActive ? lbl.accent : "#2A2A2A",
                  textShadow: isActive ? `0 0 12px ${lbl.accent}` : "none",
                }}
              >
                {lbl.line1}
              </span>
              <span
                className="text-[9px] lg:text-[10px] font-black tracking-[0.14em] leading-tight text-center block"
                style={{ color: isActive ? lbl.accent : "#2A2A2A" }}
              >
                {lbl.line2}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

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

            {/* Podium — produits réels depuis l'API */}
            <ProductPodium />
          </div>

          {/* Right: CTA + AI Checker + Soul-O-Meter — un seul panneau */}
          <motion.div
            className="lg:w-80 xl:w-96 flex flex-col gap-4"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <OvfButton href="/upload" subtitle="(WE DARE YOU)">
              UPLOAD CREATION
            </OvfButton>

            <TerminalWindow title="AI_CHECKER_v2.1">
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
              <div className="flex items-center gap-1 mt-4 font-mono text-[11px] text-[#00F0FF]">
                <span>&gt;</span>
                <motion.span
                  className="inline-block w-2 h-3.5 bg-[#00F0FF]"
                  animate={{ opacity: [1, 0, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                />
              </div>
            </TerminalWindow>

            {/* Soul-O-Meter — même panneau, juste en dessous */}
            <div className="border border-[#00F0FF]/20 bg-[#0D1117] p-4 flex gap-4 items-center">
              {/* Gauge gauche */}
              <div className="shrink-0">
                <CircularGauge value={73} label="HURAN CHAOS" sublabel="SOUL-O-METER" />
              </div>

              {/* Droite : bouton + before/after */}
              <div className="flex-1 flex flex-col gap-3">
                <OvfButton href="/upload" subtitle="(FIX THE DESIGN)">
                  OVERFIT ME
                </OvfButton>
                <div className="border border-[#1F2937] bg-[#080808] p-2 flex items-center gap-2">
                  <div className="flex-1 text-center">
                    <p className="font-mono text-[9px] text-[#444] uppercase">BEFORE</p>
                    <p className="font-mono text-[9px] text-[#EF4444]/60">72 DPI</p>
                  </div>
                  <div className="w-px h-8 bg-[#00F0FF]/40 relative flex items-center justify-center">
                    <div className="w-3 h-3 rounded-full border border-[#00F0FF] bg-[#080808]" />
                  </div>
                  <div className="flex-1 text-center">
                    <p className="font-mono text-[9px] text-[#00F0FF] uppercase">AFTER</p>
                    <p className="font-mono text-[9px] text-[#00F0FF]/60">300 DPI</p>
                  </div>
                </div>
              </div>
            </div>

          </motion.div>
        </div>
      </section>

      <AppFooter />
    </div>
  );
}
