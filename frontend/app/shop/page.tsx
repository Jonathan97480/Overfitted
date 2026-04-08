"use client";
import { useMemo, useEffect } from "react";
import { assetUrl } from "@/lib/utils";
import { AppHeader } from "@/components/public/AppHeader";
import { AppFooter } from "@/components/public/AppFooter";
import { CyberCard } from "@/components/public/CyberCard";
import { useGetPublicCatalogueQuery, useGetPublicProductTypesQuery } from "@/lib/publicApi";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import {
    toggleCollection,
    toggleProductType,
    setSarcasmLevel,
    initProductTypes,
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

const TYPE_DETAILS: Record<string, { detail1: string; detail2: string }> = {
    "T-SHIRTS PREMIUM": { detail1: "Type: Premium DTG", detail2: "Material: 100% Organic" },
    "HOODIES OVERSIZE": { detail1: "Type: Heavy Cotton", detail2: "Vibe: Existential Dread" },
    "XXXL PAD": { detail1: "Type: Live Data Pattern", detail2: "Update: Real-Time" },
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
        selectedCollections,
        selectedProductTypes,
        sarcasmLevel,
    } = useAppSelector((s) => s.shop);

    const { data, isLoading } = useGetPublicCatalogueQuery();
    const { data: ptData } = useGetPublicProductTypesQuery();

    // Synchronise les types de produits depuis la DB dès le premier chargement
    useEffect(() => {
        if (ptData?.result && ptData.result.length > 0) {
            dispatch(initProductTypes(ptData.result.map((pt) => pt.name)));
        }
    }, [ptData, dispatch]);

    // Types de produits depuis la BDD (fallback sur ALL_TYPES si l'API n'est pas disponible)
    const productTypeNames: ProductTypeFilter[] = ptData?.result?.map((pt) => pt.name) ?? ALL_TYPES;

    // Enrich products with derived metadata
    const enrichedProducts = useMemo(() => {
        if (!data?.result) return [];
        return data.result.map((item, index) => {
            const tagSlug = (item.tags ?? "").split(",")[0].trim().toUpperCase();
            const collection: CollectionFilter =
                tagSlug.includes("SYNTAX") ? "SYNTAX"
                    : tagSlug.includes("HALLUCINATION") ? "HALLUCINATION"
                        : tagSlug.includes("PULSE") ? "PULSE"
                            : ALL_COLLECTIONS[index % ALL_COLLECTIONS.length];
            const productType: string = item.product_type_name ?? "T-SHIRTS PREMIUM";
            const soulScore = getSoulScore(item.id);
            return {
                ...item,
                name: item.title,
                thumbnail_url: assetUrl(item.image_url),
                collection,
                productType,
                soulScore,
            };
        });
    }, [data?.result]);

    // Filtre réactif — se met à jour immédiatement à chaque changement de checkbox
    const filteredProducts = useMemo(() => {
        return enrichedProducts.filter(
            (p) =>
                selectedCollections.includes(p.collection) &&
                (selectedProductTypes.length === 0 || selectedProductTypes.includes(p.productType))
        );
    }, [enrichedProducts, selectedCollections, selectedProductTypes]);

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
                                checked={selectedCollections.includes(col)}
                                label={col}
                                sublabel={COLLECTION_META[col]}
                                onChange={() => dispatch(toggleCollection(col))}
                            />
                        ))}
                    </div>

                    {/* Products */}
                    <div className="flex flex-col gap-2">
                        <p className="text-[9px] uppercase tracking-[0.2em] text-[#8B8FA8] mb-1">
                            Products
                        </p>
                        {productTypeNames.map((t) => (
                            <OvfCheckbox
                                key={t}
                                checked={selectedProductTypes.includes(t)}
                                label={t}
                                onChange={() => dispatch(toggleProductType(t))}
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
                                {sarcasmLevel}%
                            </span>
                        </div>

                        <input
                            type="range"
                            min={0}
                            max={100}
                            value={sarcasmLevel}
                            onChange={(e) =>
                                dispatch(setSarcasmLevel(Number(e.target.value)))
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
                            {getSarcasmLabel(sarcasmLevel)}
                        </p>
                    </div>
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
                                const details = TYPE_DETAILS[product.productType] ?? { detail1: product.productType, detail2: "" };
                                const badgeLabel = getBadgeLabel(product.collection, product.soulScore);
                                const roastQuote = ROAST_QUOTES[index % ROAST_QUOTES.length];
                                const badgeOrange = product.collection === "SYNTAX";

                                return (
                                    <CyberCard
                                        key={product.id}
                                        href={`/shop/${product.id}`}
                                        name={product.name}
                                        thumbnailUrl={product.thumbnail_url}
                                        detail1={details.detail1}
                                        detail2={details.detail2}
                                        badgeLabel={badgeLabel}
                                        badgeOrange={badgeOrange}
                                        price={product.price}
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
