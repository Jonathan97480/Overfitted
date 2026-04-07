"use client";
import { useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { AppHeader } from "@/components/public/AppHeader";
import { AppFooter } from "@/components/public/AppFooter";
import { NeonBadge } from "@/components/public/NeonBadge";
import { OvfButton } from "@/components/public/OvfButton";
import { TerminalWindow } from "@/components/public/TerminalWindow";
import { ColorSwatch } from "@/components/public/ColorSwatch";
import { CyberCard } from "@/components/public/CyberCard";
import { useGetProductByIdQuery, useGetPublicProductsQuery, type SyncVariant } from "@/lib/publicApi";
import { useAppDispatch } from "@/lib/hooks";
import { addItem } from "@/lib/slices/cartSlice";
import { cn } from "@/lib/utils";

// ── Constants ────────────────────────────────────────────────────────────────

const SIZES = ["XS", "S", "M", "L", "XL", "XXL", "2XL", "3XL"] as const;

const COLLECTION_LABELS = ["SYNTAX", "HALLUCINATION", "PULSE"] as const;

const ROAST_QUOTES = [
    "Your pixels are blurry. My GPU is depressed. Fixed it.",
    "404: Artistic talent not found. Compensated with sarcasm.",
    "Dreams rendered at 72 DPI. Upgraded to actual resolution.",
    "JPEG artifacts detected. Creative misery resolved.",
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function getCollection(id: number, name: string): string {
    const upper = name.toUpperCase();
    if (upper.includes("SYNTAX") || upper.includes("PROMPT")) return "SYNTAX COLLECTION";
    if (upper.includes("HALLUCINATION") || upper.includes("404")) return "HALLUCINATION DROP";
    return COLLECTION_LABELS[id % COLLECTION_LABELS.length];
}

function getSoulScore(id: number): number {
    return ((id * 37 + 42) % 30) + 70;
}

function getUniqueColors(variants: SyncVariant[]): { color: string; colorCode: string }[] {
    const seen = new Set<string>();
    const result: { color: string; colorCode: string }[] = [];
    for (const v of variants) {
        if (!seen.has(v.color)) {
            seen.add(v.color);
            result.push({ color: v.color, colorCode: v.color_code ?? "#333333" });
        }
    }
    return result;
}

function getVariantsForColor(variants: SyncVariant[], color: string): SyncVariant[] {
    return variants.filter((v) => v.color === color);
}

// ── Image Gallery ────────────────────────────────────────────────────────────

function ImageGallery({ thumbnails, name }: { thumbnails: string[]; name: string }) {
    const [activeIdx, setActiveIdx] = useState(0);
    const active = thumbnails[activeIdx] ?? null;

    return (
        <div className="flex flex-col gap-3">
            {/* Principal */}
            <div className="relative w-full aspect-square bg-[#0A0E14] border border-[#00F0FF]/30 overflow-hidden group">
                {active ? (
                    <Image
                        src={active}
                        alt={name}
                        fill
                        sizes="(max-width: 768px) 100vw, 50vw"
                        className="object-contain transition-transform duration-300 group-hover:scale-105"
                        priority
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-[#00F0FF]/20 font-mono text-xs uppercase tracking-widest">
                        NO_IMAGE_DETECTED
                    </div>
                )}
                {/* Scan overlay on hover */}
                <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="absolute inset-y-0 w-px bg-[#00F0FF]/40 animate-[scan_2s_linear_infinite]" />
                </div>
            </div>

            {/* Thumbnails */}
            {thumbnails.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                    {thumbnails.map((url, i) => (
                        <button
                            key={i}
                            type="button"
                            onClick={() => setActiveIdx(i)}
                            className={cn(
                                "relative w-14 h-14 flex-shrink-0 border overflow-hidden transition-all",
                                i === activeIdx
                                    ? "border-[#00F0FF] shadow-[0_0_8px_rgba(0,240,255,0.4)]"
                                    : "border-[#333] hover:border-[#00F0FF]/50"
                            )}
                        >
                            <Image src={url} alt={`Vue ${i + 1}`} fill sizes="56px" className="object-cover" />
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ShopSlugPage() {
    const params = useParams();
    const router = useRouter();
    const dispatch = useAppDispatch();

    const slug = typeof params.slug === "string" ? params.slug : "";
    const productId = parseInt(slug, 10);

    const { data, isLoading, isError } = useGetProductByIdQuery(productId, {
        skip: isNaN(productId),
    });
    const { data: allProducts } = useGetPublicProductsQuery();

    const product = data?.result?.sync_product;
    const variants = data?.result?.sync_variants ?? [];

    // Unique colors and sizes
    const colors = useMemo(() => getUniqueColors(variants), [variants]);
    const [selectedColor, setSelectedColor] = useState<string | null>(null);
    const activeColor = selectedColor ?? colors[0]?.color ?? null;
    const colorVariants = useMemo(
        () => (activeColor ? getVariantsForColor(variants, activeColor) : variants),
        [variants, activeColor]
    );

    const [selectedSize, setSelectedSize] = useState<string | null>(null);
    const [added, setAdded] = useState(false);

    // Find the selected variant (matching color + size)
    const selectedVariant = useMemo<SyncVariant | null>(() => {
        if (!selectedSize) return null;
        return colorVariants.find((v) => v.size === selectedSize) ?? null;
    }, [colorVariants, selectedSize]);

    // Available sizes for active color
    const availableSizes = useMemo(() => {
        return SIZES.map((size) => {
            const variant = colorVariants.find((v) => v.size === size);
            return {
                size,
                variant: variant ?? null,
                available: variant?.availability_status === "active",
            };
        }).filter((s) => s.variant !== null || colorVariants.some((v) => v.size === s.size));
    }, [colorVariants]);

    // Similar products (different from current, same rough index)
    const similarProducts = useMemo(() => {
        if (!allProducts?.result || !product) return [];
        return allProducts.result.filter((p) => p.id !== productId).slice(0, 3);
    }, [allProducts, product, productId]);

    // Gallery images
    const thumbnails = useMemo(() => {
        const urls: string[] = [];
        if (product?.thumbnail_url) urls.push(product.thumbnail_url);
        variants
            .filter((v) => v.thumbnail_url && !urls.includes(v.thumbnail_url))
            .forEach((v) => v.thumbnail_url && urls.push(v.thumbnail_url));
        return urls.slice(0, 6);
    }, [product, variants]);

    const price = useMemo(() => {
        const priceStr = selectedVariant?.retail_price ?? colorVariants[0]?.retail_price ?? "0";
        return parseFloat(priceStr) || 0;
    }, [selectedVariant, colorVariants]);

    const collection = product ? getCollection(product.id, product.name) : "";
    const soulScore = product ? getSoulScore(product.id) : 0;

    function handleAddToCart() {
        if (!product || !activeColor || !selectedSize) return;
        const variant = selectedVariant ?? colorVariants[0];
        if (!variant) return;

        dispatch(
            addItem({
                id: `${product.id}-${variant.id}`,
                productId: product.id,
                variantId: variant.id,
                name: product.name,
                size: selectedSize,
                color: activeColor,
                colorCode: colors.find((c) => c.color === activeColor)?.colorCode ?? "#333",
                thumbnailUrl: product.thumbnail_url,
                price,
                quantity: 1,
            })
        );
        setAdded(true);
        setTimeout(() => setAdded(false), 2000);
    }

    // ── Error / loading states ────────────────────────────────────────────────

    if (isNaN(productId) || isError) {
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
                        {isLoading ? "LOADING..." : (product?.name.toUpperCase() ?? "---")}
                    </span>
                </nav>

                {isLoading ? (
                    <div className="flex items-center justify-center h-64">
                        <p className="font-mono text-[#00F0FF]/50 text-sm tracking-widest uppercase animate-pulse">
                            Scanning_product_database...
                        </p>
                    </div>
                ) : product ? (
                    <>
                        {/* ── Product detail — 2 columns ── */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
                            {/* Left — Gallery */}
                            <ImageGallery thumbnails={thumbnails} name={product.name} />

                            {/* Right — Info + selectors */}
                            <div className="flex flex-col gap-5">
                                {/* Collection badge */}
                                <NeonBadge label={collection} />

                                {/* Name */}
                                <h1 className="font-mono text-white text-xl uppercase tracking-wider font-bold leading-tight">
                                    {product.name}
                                </h1>

                                {/* Terminal info */}
                                <TerminalWindow title="PRODUCT_SPECS" className="text-[11px]">
                                    <div className="flex flex-col gap-1">
                                        <div className="flex gap-3">
                                            <span className="text-[#00F0FF] w-28 flex-shrink-0">SOUL_SCORE</span>
                                            <span className="text-white">{soulScore}% HUMAN CHAOS</span>
                                        </div>
                                        <div className="flex gap-3">
                                            <span className="text-[#00F0FF] w-28 flex-shrink-0">VARIANTS</span>
                                            <span className="text-white">{variants.length} DETECTED</span>
                                        </div>
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

                                {/* Price */}
                                <div className="flex items-baseline gap-3">
                                    <span className="font-mono text-2xl text-white font-bold">
                                        {price > 0 ? `${price.toFixed(2)}€` : "---"}
                                    </span>
                                    <span className="font-mono text-[10px] text-[#555] uppercase">TTC</span>
                                </div>

                                {/* Color selector */}
                                {colors.length > 1 && (
                                    <div className="flex flex-col gap-2">
                                        <p className="font-mono text-[9px] text-[#8B8FA8] uppercase tracking-[0.2em]">
                                            Couleur —{" "}
                                            <span className="text-[#C0C0C0]">{activeColor}</span>
                                        </p>
                                        <div className="flex gap-2 flex-wrap">
                                            {colors.map(({ color, colorCode }) => (
                                                <ColorSwatch
                                                    key={color}
                                                    color={color}
                                                    colorCode={colorCode}
                                                    selected={activeColor === color}
                                                    onClick={() => {
                                                        setSelectedColor(color);
                                                        setSelectedSize(null);
                                                    }}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Size selector */}
                                <div className="flex flex-col gap-2">
                                    <p className="font-mono text-[9px] text-[#8B8FA8] uppercase tracking-[0.2em]">
                                        Taille{selectedSize && ` — ${selectedSize}`}
                                    </p>
                                    <div className="flex gap-2 flex-wrap">
                                        {availableSizes.length > 0
                                            ? availableSizes.map(({ size, available }) => (
                                                  <button
                                                      key={size}
                                                      type="button"
                                                      disabled={!available}
                                                      onClick={() => setSelectedSize(size)}
                                                      title={!available ? "Épuisé" : size}
                                                      className={cn(
                                                          "font-mono text-[10px] uppercase w-10 h-10 border transition-all",
                                                          selectedSize === size
                                                              ? "border-[#FF6B00] text-[#FF6B00] bg-[#FF6B00]/10 shadow-[0_0_10px_rgba(255,107,0,0.3)]"
                                                              : available
                                                              ? "border-[#333] text-[#C0C0C0] hover:border-[#00F0FF]/60 hover:text-white"
                                                              : "border-[#222] text-[#333] cursor-not-allowed line-through"
                                                      )}
                                                  >
                                                      {size}
                                                  </button>
                                              ))
                                            : SIZES.map((size) => (
                                                  <button
                                                      key={size}
                                                      type="button"
                                                      onClick={() => setSelectedSize(size)}
                                                      className={cn(
                                                          "font-mono text-[10px] uppercase w-10 h-10 border transition-all",
                                                          selectedSize === size
                                                              ? "border-[#FF6B00] text-[#FF6B00] bg-[#FF6B00]/10"
                                                              : "border-[#333] text-[#C0C0C0] hover:border-[#00F0FF]/60"
                                                      )}
                                                  >
                                                      {size}
                                                  </button>
                                              ))}
                                    </div>
                                </div>

                                {/* Add to cart */}
                                <OvfButton
                                    onClick={handleAddToCart}
                                    disabled={!selectedSize}
                                    className="mt-2"
                                    subtitle={
                                        added
                                            ? "(DIAGNOSTIC UPDATED)"
                                            : !selectedSize
                                            ? "(CHOISIR UNE TAILLE D'ABORD)"
                                            : "(PURCHASE ORGANIC CHAOS)"
                                    }
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
                                                name={p.name}
                                                thumbnailUrl={p.thumbnail_url}
                                                detail1={`ID: ${p.id}`}
                                                detail2={`Variants: ${p.variants ?? "N/A"}`}
                                                badgeLabel={`${getSoulScore(p.id)}% HUMAN CHAOS`}
                                                badgeOrange={index % 3 === 0}
                                                price={[29, 45, 30][index % 3]}
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
                    <span className={isLoading ? "text-[#F59E0B]" : product ? "text-[#22C55E]" : "text-[#EF4444]"}>
                        {isLoading ? "LOADING" : product ? "READY" : "ERROR"}
                    </span>
                </span>
                <span className="font-mono text-[#555] text-[9px]">|</span>
                <span className="font-mono text-[#00F0FF] text-[9px] uppercase tracking-widest">
                    Cart:{" "}
                    <span className="text-[#22C55E]">ACTIVE</span>
                </span>
            </div>
        </div>
    );
}
