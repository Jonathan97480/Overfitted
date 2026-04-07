"use client";
import { useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { assetUrl } from "@/lib/utils";
import { useParams, useRouter } from "next/navigation";
import { AppHeader } from "@/components/public/AppHeader";
import { AppFooter } from "@/components/public/AppFooter";
import { NeonBadge } from "@/components/public/NeonBadge";
import { OvfButton } from "@/components/public/OvfButton";
import { TerminalWindow } from "@/components/public/TerminalWindow";
import { CyberCard } from "@/components/public/CyberCard";
import { useGetPublicCatalogueByIdQuery, useGetPublicCatalogueQuery } from "@/lib/publicApi";
import { useAppDispatch } from "@/lib/hooks";
import { addItem } from "@/lib/slices/cartSlice";

// ── Types ────────────────────────────────────────────────────────────────────

interface CatalogueVariant {
    id: number;
    printful_variant_id: string;
    color: string | null;
    size: string | null;
    price: number;
}

// ── Constants ────────────────────────────────────────────────────────────────

const COLLECTION_LABELS = ["SYNTAX", "HALLUCINATION", "PULSE"] as const;

const ROAST_QUOTES = [
    "Your pixels are blurry. My GPU is depressed. Fixed it.",
    "404: Artistic talent not found. Compensated with sarcasm.",
    "Dreams rendered at 72 DPI. Upgraded to actual resolution.",
    "JPEG artifacts detected. Creative misery resolved.",
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function getCollection(id: number, title: string): string {
    const upper = title.toUpperCase();
    if (upper.includes("SYNTAX") || upper.includes("PROMPT")) return "SYNTAX COLLECTION";
    if (upper.includes("HALLUCINATION") || upper.includes("404")) return "HALLUCINATION DROP";
    return COLLECTION_LABELS[id % COLLECTION_LABELS.length];
}

function getSoulScore(id: number): number {
    return ((id * 37 + 42) % 30) + 70;
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ShopSlugPage() {
    const params = useParams();
    const router = useRouter();
    const dispatch = useAppDispatch();

    const slug = typeof params.slug === "string" ? params.slug : "";
    const itemId = parseInt(slug, 10);

    const { data, isLoading, isError } = useGetPublicCatalogueByIdQuery(itemId, {
        skip: isNaN(itemId),
    });
    const { data: allCatalogue } = useGetPublicCatalogueQuery();

    const item = data?.result ?? null;

    // ── Variants parsing ──────────────────────────────────────────────────────
    const variants = useMemo<CatalogueVariant[]>(() => {
        if (!item?.variants_json) return [];
        try { return JSON.parse(item.variants_json) as CatalogueVariant[]; } catch { return []; }
    }, [item]);

    const uniqueColors = useMemo(() => {
        const seen = new Set<string>();
        return variants.filter((v) => v.color && !seen.has(v.color) && seen.add(v.color)).map((v) => v.color!);
    }, [variants]);

    const [selectedColor, setSelectedColor] = useState<string | null>(null);
    const [selectedSize, setSelectedSize] = useState<string | null>(null);

    const effectiveColor = selectedColor ?? uniqueColors[0] ?? null;

    const sizesForColor = useMemo(() =>
        [...new Set(variants.filter((v) => !effectiveColor || v.color === effectiveColor).map((v) => v.size).filter(Boolean) as string[])],
        [variants, effectiveColor]
    );

    const effectiveSize = selectedSize && sizesForColor.includes(selectedSize) ? selectedSize : (sizesForColor[0] ?? null);

    const selectedVariant = useMemo(() =>
        variants.find((v) => v.color === effectiveColor && v.size === effectiveSize) ?? variants[0] ?? null,
        [variants, effectiveColor, effectiveSize]
    );

    const displayPrice = selectedVariant?.price ?? item?.price ?? 0;

    const [added, setAdded] = useState(false);

    // Similar products
    const similarProducts = useMemo(() => {
        if (!allCatalogue?.result || !item) return [];
        return allCatalogue.result.filter((p) => p.id !== itemId).slice(0, 3);
    }, [allCatalogue, item, itemId]);

    const collection = item ? getCollection(item.id, item.title) : "";
    const soulScore = item ? getSoulScore(item.id) : 0;

    function handleAddToCart() {
        if (!item) return;
        const variantId = selectedVariant?.printful_variant_id
            ? parseInt(selectedVariant.printful_variant_id, 10)
            : (item.printful_variant_id ? parseInt(item.printful_variant_id, 10) : item.id);
        dispatch(
            addItem({
                id: `${item.id}-${variantId}`,
                productId: item.id,
                variantId,
                name: item.title,
                size: effectiveSize ?? "",
                color: effectiveColor ?? "",
                colorCode: "#333333",
                thumbnailUrl: item.image_url,
                price: displayPrice,
                quantity: 1,
            })
        );
        setAdded(true);
        setTimeout(() => setAdded(false), 2000);
    }

    // ── Error / loading states ────────────────────────────────────────────────

    if (isNaN(itemId) || isError) {
        return (
            <div className="min-h-screen bg-[#0A0A0A] font-mono flex flex-col">
                <AppHeader />
                <main className="flex-1 flex items-center justify-center">
                    <TerminalWindow title="ERROR_404" className="max-w-md w-full mx-4">
                        <p className="text-[#FF6B00] text-sm">PRODUCT_NOT_FOUND</p>
                        <p className="text-[#555] text-xs mt-2">ID: {slug} — INVALID_REFERENCE</p>
                        <button
                            type="button"
                            onClick={() => router.push("/shop")}
                            className="mt-4 font-mono text-[10px] text-[#00F0FF] uppercase tracking-widest hover:underline"
                        >
                            ← RETOUR_DATABASE
                        </button>
                    </TerminalWindow>
                </main>
                <AppFooter />
            </div>
        );
    }

    // ── Main render ───────────────────────────────────────────────────────────

    return (
        <div className="min-h-screen bg-[#0A0A0A] font-mono flex flex-col pb-20">
            <AppHeader />

            <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8">
                {/* Breadcrumb */}
                <nav className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-[#555] mb-6">
                    <Link href="/" className="hover:text-[#00F0FF] transition-colors">HOME</Link>
                    <span>›</span>
                    <Link href="/shop" className="hover:text-[#00F0FF] transition-colors">SHOP</Link>
                    <span>›</span>
                    <span className="text-[#00F0FF] truncate max-w-[200px]">
                        {isLoading ? "LOADING..." : (item?.title.toUpperCase() ?? "---")}
                    </span>
                </nav>

                {isLoading ? (
                    <div className="flex items-center justify-center h-64">
                        <p className="font-mono text-[#00F0FF]/50 text-sm tracking-widest uppercase animate-pulse">
                            Scanning_product_database...
                        </p>
                    </div>
                ) : item ? (
                    <>
                        {/* ── Product detail — 2 columns ── */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
                            {/* Left — Image */}
                            <div className="relative w-full aspect-square bg-[#0A0E14] border border-[#00F0FF]/30 overflow-hidden group">
                                {item.image_url ? (
                                    <Image
                                        src={assetUrl(item.image_url)}
                                        alt={item.title}
                                        fill
                                        sizes="(max-width: 768px) 100vw, 50vw"
                                        className="object-contain transition-transform duration-300 group-hover:scale-105"
                                        priority
                                        unoptimized={item.image_url.startsWith("/static")}
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-[#00F0FF]/20 font-mono text-xs uppercase tracking-widest">
                                        NO_IMAGE_DETECTED
                                    </div>
                                )}
                                <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                                    <div className="absolute inset-y-0 w-px bg-[#00F0FF]/40 animate-[scan_2s_linear_infinite]" />
                                </div>
                            </div>

                            {/* Right — Info */}
                            <div className="flex flex-col gap-5">
                                {/* Collection badge */}
                                <NeonBadge label={collection} />

                                {/* Name */}
                                <h1 className="font-mono text-white text-xl uppercase tracking-wider font-bold leading-tight">
                                    {item.title}
                                </h1>

                                {/* Description */}
                                {item.description && (
                                    <p className="font-mono text-[#8B8FA8] text-xs leading-relaxed">
                                        {item.description}
                                    </p>
                                )}

                                {/* Terminal info */}
                                <TerminalWindow title="PRODUCT_SPECS" className="text-[11px]">
                                    <div className="flex flex-col gap-1">
                                        <div className="flex gap-3">
                                            <span className="text-[#00F0FF] w-28 flex-shrink-0">SOUL_SCORE</span>
                                            <span className="text-white">{soulScore}% HUMAN CHAOS</span>
                                        </div>
                                        {item.category && (
                                            <div className="flex gap-3">
                                                <span className="text-[#00F0FF] w-28 flex-shrink-0">CATEGORY</span>
                                                <span className="text-white">{item.category.toUpperCase()}</span>
                                            </div>
                                        )}
                                        <div className="flex gap-3">
                                            <span className="text-[#00F0FF] w-28 flex-shrink-0">COLLECTION</span>
                                            <span className="text-white">{collection}</span>
                                        </div>
                                        <div className="flex gap-3">
                                            <span className="text-[#00F0FF] w-28 flex-shrink-0">STATUS</span>
                                            <span className="text-[#22C55E]">IN_STOCK</span>
                                        </div>
                                    </div>
                                </TerminalWindow>

                                {/* ── Variant selector ── */}
                                {variants.length > 0 && (
                                    <div className="space-y-3">
                                        {/* Colors */}
                                        {uniqueColors.length > 0 && (
                                            <div>
                                                <p className="font-mono text-[10px] text-[#555] uppercase tracking-widest mb-2">
                                                    COULEUR — <span className="text-[#00F0FF]">{effectiveColor}</span>
                                                </p>
                                                <div className="flex gap-2 flex-wrap">
                                                    {uniqueColors.map((color) => (
                                                        <button
                                                            key={color}
                                                            onClick={() => { setSelectedColor(color); setSelectedSize(null); }}
                                                            className="h-6 px-3 rounded font-mono text-[10px] uppercase tracking-wider transition-all"
                                                            style={{
                                                                background: effectiveColor === color ? "var(--neon-blue, #00F0FF)" : "transparent",
                                                                border: `1px solid ${effectiveColor === color ? "var(--neon-blue, #00F0FF)" : "#333"}`,
                                                                color: effectiveColor === color ? "#000" : "#888",
                                                            }}>
                                                            {color}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        {/* Sizes */}
                                        {sizesForColor.length > 0 && (
                                            <div>
                                                <p className="font-mono text-[10px] text-[#555] uppercase tracking-widest mb-2">
                                                    TAILLE — <span className="text-[#00F0FF]">{effectiveSize}</span>
                                                </p>
                                                <div className="flex gap-2 flex-wrap">
                                                    {sizesForColor.map((size) => (
                                                        <button
                                                            key={size}
                                                            onClick={() => setSelectedSize(size)}
                                                            className="h-8 px-3 rounded font-mono text-xs uppercase tracking-wider transition-all"
                                                            style={{
                                                                background: effectiveSize === size ? "transparent" : "transparent",
                                                                border: `1px solid ${effectiveSize === size ? "var(--neon-orange, #FF6B00)" : "#333"}`,
                                                                color: effectiveSize === size ? "var(--neon-orange, #FF6B00)" : "#666",
                                                            }}>
                                                            {size}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Price */}
                                <div className="flex items-baseline gap-3">
                                    <span className="font-mono text-2xl text-white font-bold">
                                        {displayPrice > 0 ? `${displayPrice.toFixed(2)}€` : "---"}
                                    </span>
                                    <span className="font-mono text-[10px] text-[#555] uppercase">TTC</span>
                                </div>

                                {/* Add to cart */}
                                <OvfButton
                                    onClick={handleAddToCart}
                                    className="mt-2"
                                    subtitle={added ? "(DIAGNOSTIC UPDATED)" : "(PURCHASE ORGANIC CHAOS)"}
                                >
                                    {added ? "AJOUTÉ AU DIAGNOSTIC ✓" : "AJOUTER AU PANIER"}
                                </OvfButton>

                                {/* Mention légale POD */}
                                <p className="font-mono text-[8px] text-[#444] leading-relaxed mt-1">
                                    ⚠ Ce produit est fabriqué à la demande. Conformément à l&apos;art.
                                    L221-28 du Code de la consommation, il ne peut faire l&apos;objet
                                    d&apos;un droit de rétractation.
                                </p>
                            </div>
                        </div>

                        {/* ── Similar products ── */}
                        {similarProducts.length > 0 && (
                            <section className="mt-8">
                                <div className="flex items-center gap-4 mb-4">
                                    <h2 className="font-mono text-[#00F0FF] text-sm uppercase tracking-[0.3em] font-bold">
                                        Autres entrées de la database
                                    </h2>
                                    <div className="flex-1 h-px bg-[#00F0FF]/20" />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    {similarProducts.map((p, index) => (
                                        <Link key={p.id} href={`/shop/${p.id}`} className="block">
                                            <CyberCard
                                                name={p.title}
                                                thumbnailUrl={assetUrl(p.image_url) || null}
                                                detail1={`ID: ${p.id}`}
                                                detail2={p.category ?? "Print-on-Demand"}
                                                badgeLabel={`${getSoulScore(p.id)}% HUMAN CHAOS`}
                                                badgeOrange={index % 3 === 0}
                                                price={p.price}
                                                roastQuote={ROAST_QUOTES[index % ROAST_QUOTES.length]}
                                            />
                                        </Link>
                                    ))}
                                </div>
                            </section>
                        )}
                    </>
                ) : null}
            </main>

            <AppFooter />

            {/* Status bar */}
            <div className="fixed bottom-0 left-0 right-0 bg-[#000]/90 border-t border-[#00F0FF]/20 px-4 py-1 flex items-center justify-end gap-6 z-50">
                <span className="font-mono text-[#00F0FF] text-[9px] uppercase tracking-widest">
                    Product State:{" "}
                    <span className={isLoading ? "text-[#F59E0B]" : item ? "text-[#22C55E]" : "text-[#EF4444]"}>
                        {isLoading ? "LOADING" : item ? "READY" : "ERROR"}
                    </span>
                </span>
                <span className="font-mono text-[#555] text-[9px]">|</span>
                <span className="font-mono text-[#00F0FF] text-[9px] uppercase tracking-widest">
                    Cart: <span className="text-[#22C55E]">ACTIVE</span>
                </span>
            </div>
        </div>
    );
}
