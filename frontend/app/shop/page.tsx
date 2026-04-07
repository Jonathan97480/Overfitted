"use client";
import { useMemo } from "react";
import { assetUrl } from "@/lib/utils";
import { AppHeader } from "@/components/public/AppHeader";
import { AppFooter } from "@/components/public/AppFooter";
import { OvfButton } from "@/components/public/OvfButton";
import { CyberCard } from "@/components/public/CyberCard";
import { useGetPublicCatalogueQuery } from "@/lib/publicApi";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import {
    togglePendingCollection,
    togglePendingProductType,
    setPendingSarcasmLevel,
    applyFilters,
    ALL_COLLECTIONS,
    ALL_TYPES,
    type CollectionFilter,
    type ProductTypeFilter,
} from "@/lib/slices/shopSlice";
import { cn } from "@/lib/utils";

// ── Constants ────────────────────────────────────────────────────────────────

const COLLECTION_META: Record<CollectionFilter, string> = {
    SYNTAX: "(Human Chaos)",
    HALLUCINATION: "(AI)",
    PULSE: "(Live Data Stream)",
};

const TYPE_PRICES: Record<ProductTypeFilter, number> = {
    "T-SHIRTS PREMIUM": 29,
    "HOODIES OVERSIZE": 45,
    "XXL PAD": 30,
    "STICKERS": 8,
};

const TYPE_DETAILS: Record<ProductTypeFilter, { detail1: string; detail2: string }> = {
    "T-SHIRTS PREMIUM": { detail1: "Type: Premium DTG", detail2: "Material: 100% Organic" },
    "HOODIES OVERSIZE": { detail1: "Type: Heavy Cotton", detail2: "Vibe: Existential Dread" },
    "XXL PAD": { detail1: "Type: Live Data Pattern", detail2: "Update: Real-Time" },
    "STICKERS": { detail1: "Type: Die-Cut Vinyl", detail2: "Rarity: Organic Glitch" },
};

const ROAST_QUOTES = [
    "Your pixels are blurry. My GPU is depressed. Fixed it.",
    "404: Artistic talent not found. Compensated with sarcasm.",
    "Dreams rendered at 72 DPI. Upgraded to actual resolution.",
    "Your design needs therapy. We provided it.",
    "JPEG artifacts detected. Creative misery resolved.",
    "Low contrast. High disappointment. Now optimized.",
    "Vector sins committed. Corrected without mercy.",
    "Color palette: chaos. Result: contained chaos.",
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function detectProductType(name: string): ProductTypeFilter {
    const upper = name.toUpperCase();
    if (upper.includes("HOODIE")) return "HOODIES OVERSIZE";
    if (upper.includes("PAD") || upper.includes("TAPIS") || upper.includes("MOUSEPAD")) return "XXL PAD";
    if (upper.includes("STICKER")) return "STICKERS";
    return "T-SHIRTS PREMIUM";
}

function getSoulScore(id: number): number {
    return ((id * 37 + 42) % 30) + 70; // deterministic 70–99
}

function getBadgeLabel(collection: CollectionFilter, soulScore: number): string {
    if (collection === "SYNTAX") return `${soulScore}% HUMAN CHAOS`;
    if (collection === "HALLUCINATION") return "AI HALLUCINATION DETECTED";
    return "LIVE DATA STREAM";
}

function getSarcasmLabel(level: number): string {
    if (level <= 20) return "'SAFE'";
    if (level <= 40) return "'MILD'";
    if (level <= 60) return "'MODERATE'";
    if (level <= 80) return "'SEVERE'";
    return "'CRITICAL'";
}

// ── Custom checkbox ──────────────────────────────────────────────────────────

function OvfCheckbox({
    checked,
    label,
    sublabel,
    onChange,
}: {
    checked: boolean;
    label: string;
    sublabel?: string;
    onChange: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onChange}
            className="flex items-start gap-2 text-left hover:opacity-80 transition-opacity"
        >
            <span
                className={cn(
                    "mt-0.5 w-4 h-4 flex-shrink-0 border font-mono text-[10px] flex items-center justify-center leading-none select-none",
                    checked
                        ? "border-[#FF6B00] text-[#FF6B00] bg-[#FF6B00]/10"
                        : "border-[#333] text-transparent"
                )}
            >
                X
            </span>
            <span className="flex flex-col leading-tight">
                <span className="font-mono text-[10px] uppercase tracking-wider text-[#C0C0C0]">
                    {label}
                </span>
                {sublabel && (
                    <span className="font-mono text-[9px] text-[#555]">{sublabel}</span>
                )}
            </span>
        </button>
    );
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function ShopPage() {
    const dispatch = useAppDispatch();
    const {
        pendingCollections,
        pendingProductTypes,
        pendingSarcasmLevel,
        appliedCollections,
        appliedProductTypes,
    } = useAppSelector((s) => s.shop);

    const { data, isLoading } = useGetPublicCatalogueQuery();

    // Enrich products with derived metadata
    const enrichedProducts = useMemo(() => {
        if (!data?.result) return [];
        return data.result.map((item, index) => {
            const collection = ALL_COLLECTIONS[index % ALL_COLLECTIONS.length];
            const productType = detectProductType(item.title);
            const soulScore = getSoulScore(item.id);
            return { ...item, name: item.title, thumbnail_url: assetUrl(item.image_url), collection, productType, soulScore };
        });
    }, [data?.result]);

    // Apply filters
    const filteredProducts = useMemo(() => {
        return enrichedProducts.filter(
            (p) =>
                appliedCollections.includes(p.collection) &&
                appliedProductTypes.includes(p.productType)
        );
    }, [enrichedProducts, appliedCollections, appliedProductTypes]);

    return (
        <div className="min-h-screen bg-[#0A0A0A] font-mono flex flex-col">
            <AppHeader />

            <div className="flex flex-1 overflow-hidden">
                {/* ── Sidebar ── */}
                <aside className="w-56 flex-shrink-0 border-r border-[#00F0FF]/25 bg-[#0A0A0A] sticky top-0 self-start h-screen overflow-y-auto flex flex-col p-4 gap-5">
                    {/* Title */}
                    <div className="border-b border-[#00F0FF]/25 pb-3">
                        <p className="text-[#00F0FF] text-[10px] uppercase tracking-[0.25em] font-bold">
                            Diagnostic Filters
                        </p>
                    </div>

                    {/* Collections */}
                    <div className="flex flex-col gap-2">
                        <p className="text-[9px] uppercase tracking-[0.2em] text-[#8B8FA8] mb-1">
                            Collections
                        </p>
                        {ALL_COLLECTIONS.map((col) => (
                            <OvfCheckbox
                                key={col}
                                checked={pendingCollections.includes(col)}
                                label={col}
                                sublabel={COLLECTION_META[col]}
                                onChange={() => dispatch(togglePendingCollection(col))}
                            />
                        ))}
                    </div>

                    {/* Products */}
                    <div className="flex flex-col gap-2">
                        <p className="text-[9px] uppercase tracking-[0.2em] text-[#8B8FA8] mb-1">
                            Products
                        </p>
                        {ALL_TYPES.map((t) => (
                            <OvfCheckbox
                                key={t}
                                checked={pendingProductTypes.includes(t)}
                                label={t}
                                onChange={() => dispatch(togglePendingProductType(t))}
                            />
                        ))}
                    </div>

                    {/* Sarcasm Level */}
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                            <p className="text-[9px] uppercase tracking-[0.2em] text-[#8B8FA8]">
                                Sarcasm Level
                            </p>
                            <span className="text-[#FF6B00] text-[10px] font-bold">
                                {pendingSarcasmLevel}%
                            </span>
                        </div>

                        <input
                            type="range"
                            min={0}
                            max={100}
                            value={pendingSarcasmLevel}
                            onChange={(e) =>
                                dispatch(setPendingSarcasmLevel(Number(e.target.value)))
                            }
                            className="w-full h-1 bg-[#222] appearance-none cursor-pointer
                                [&::-webkit-slider-thumb]:appearance-none
                                [&::-webkit-slider-thumb]:w-4
                                [&::-webkit-slider-thumb]:h-4
                                [&::-webkit-slider-thumb]:rounded-full
                                [&::-webkit-slider-thumb]:bg-[#FF6B00]
                                [&::-webkit-slider-thumb]:cursor-pointer
                                [&::-webkit-slider-track]:bg-[#FF6B00]/40"
                        />

                        <p className="text-[#FF6B00] text-[9px] font-mono text-center">
                            {getSarcasmLabel(pendingSarcasmLevel)}
                        </p>
                    </div>

                    {/* Apply button */}
                    <OvfButton
                        className="mt-auto text-[10px] py-2"
                        onClick={() => dispatch(applyFilters())}
                    >
                        Appliquer les Filtres
                    </OvfButton>
                </aside>

                {/* ── Main content ── */}
                <main className="flex-1 flex flex-col p-6 pb-12 overflow-y-auto">
                    {/* Header */}
                    <div className="mb-6">
                        <h1 className="font-mono text-[#00F0FF] text-xl uppercase tracking-[0.3em] font-bold">
                            Prototype Database
                            <span className="text-[#6B7280] text-sm ml-3 tracking-widest">
                                ({isLoading ? "..." : filteredProducts.length} Results)
                            </span>
                        </h1>
                        <div className="mt-2 h-px bg-[#00F0FF]/20" />
                    </div>

                    {/* Grid */}
                    {isLoading ? (
                        <div className="flex-1 flex items-center justify-center">
                            <p className="font-mono text-[#00F0FF]/50 text-sm tracking-widest uppercase animate-pulse">
                                Loading_database...
                            </p>
                        </div>
                    ) : filteredProducts.length === 0 ? (
                        <div className="flex-1 flex items-center justify-center">
                            <div className="text-center">
                                <p className="font-mono text-[#FF6B00] text-sm tracking-widest uppercase">
                                    No results found
                                </p>
                                <p className="font-mono text-[#555] text-[10px] mt-2">
                                    ADJUST_FILTERS : try checking more boxes
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-4">
                            {filteredProducts.map((product, index) => {
                                const details = TYPE_DETAILS[product.productType];
                                const price = TYPE_PRICES[product.productType];
                                const badgeLabel = getBadgeLabel(product.collection, product.soulScore);
                                const roastQuote = ROAST_QUOTES[index % ROAST_QUOTES.length];
                                const badgeOrange = product.collection === "SYNTAX";

                                return (
                                    <CyberCard
                                        key={product.id}
                                        name={product.name}
                                        thumbnailUrl={product.thumbnail_url}
                                        detail1={details.detail1}
                                        detail2={details.detail2}
                                        badgeLabel={badgeLabel}
                                        badgeOrange={badgeOrange}
                                        price={price}
                                        roastQuote={roastQuote}
                                    />
                                );
                            })}
                        </div>
                    )}
                </main>
            </div>

            <AppFooter />

            {/* ── Status bar ── */}
            <div className="fixed bottom-0 left-0 right-0 bg-[#000]/90 border-t border-[#00F0FF]/20 px-4 py-1 flex items-center justify-end gap-6 z-50">
                <span className="font-mono text-[#00F0FF] text-[9px] uppercase tracking-widest">
                    Shop State:{" "}
                    <span className="text-[#22C55E]">READY</span>
                </span>
                <span className="font-mono text-[#555] text-[9px]">|</span>
                <span className="font-mono text-[#00F0FF] text-[9px] uppercase tracking-widest">
                    Redux RTK Store:{" "}
                    <span className="text-[#22C55E]">ACTIVE</span>
                </span>
            </div>
        </div>
    );
}
