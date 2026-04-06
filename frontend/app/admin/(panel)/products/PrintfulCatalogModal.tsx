"use client";
import { useState, useMemo, useEffect } from "react";
import {
    useBrowsePrintfulCatalogQuery,
    useGetPrintfulCatalogProductQuery,
    useAddPrintfulProductToStoreMutation,
    type PrintfulCatalogProduct,
    type PrintfulCatalogVariant,
} from "@/lib/adminEndpoints";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Check, ChevronLeft, ShoppingBag } from "lucide-react";

type Step = "browse" | "variants" | "confirm";

interface Props {
    open: boolean;
    onClose: () => void;
}

export function PrintfulCatalogModal({ open, onClose }: Props) {
    const [step, setStep] = useState<Step>("browse");
    const [search, setSearch] = useState("");
    const [selectedProduct, setSelectedProduct] = useState<PrintfulCatalogProduct | null>(null);
    const [selectedVariantIds, setSelectedVariantIds] = useState<Set<number>>(new Set());
    const [customName, setCustomName] = useState("");

    const { data: catalogData, isLoading: isLoadingCatalog } = useBrowsePrintfulCatalogQuery(
        { limit: 100, search: search.length > 1 ? search : undefined },
        { skip: !open }
    );

    const { data: productDetail, isLoading: isLoadingDetail } = useGetPrintfulCatalogProductQuery(
        selectedProduct?.id ?? 0,
        { skip: !selectedProduct || step === "browse" }
    );

    const [addToStore, { isLoading: isAdding }] = useAddPrintfulProductToStoreMutation();
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const variants: PrintfulCatalogVariant[] = productDetail?.result?.variants ?? [];

    // Prix max des variants sélectionnés (mise à jour à chaque changement de sélection)
    // Regrouper les variants par couleur pour l'affichage
    const colorGroups = useMemo(() => {
        const map = new Map<string, PrintfulCatalogVariant[]>();
        for (const v of variants) {
            const key = v.color || "Default";
            if (!map.has(key)) map.set(key, []);
            map.get(key)!.push(v);
        }
        return Array.from(map.entries());
    }, [variants]);

    const handleSelectProduct = (p: PrintfulCatalogProduct) => {
        setSelectedProduct(p);
        setSelectedVariantIds(new Set());
        setCustomName(p.name || p.model || p.type_name);
        setStep("variants");
        setError(null);
        setSuccess(null);
    };

    const toggleVariant = (id: number) => {
        setSelectedVariantIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const toggleColorGroup = (variantList: PrintfulCatalogVariant[]) => {
        const ids = variantList.map((v) => v.id);
        const allSelected = ids.every((id) => selectedVariantIds.has(id));
        setSelectedVariantIds((prev) => {
            const next = new Set(prev);
            if (allSelected) ids.forEach((id) => next.delete(id));
            else ids.forEach((id) => next.add(id));
            return next;
        });
    };

    const handleConfirm = async () => {
        if (!selectedProduct) return;
        if (selectedVariantIds.size === 0) { setError("Sélectionnez au moins un variant."); return; }
        setError(null);
        const selectedVariantObjects = variants.filter((v) => selectedVariantIds.has(v.id));
        try {
            const r = await addToStore({
                name: customName || selectedProduct.model,
                thumbnail: selectedProduct.image,
                variants: selectedVariantObjects.map((v) => ({
                    id: v.id,
                    name: `${v.color} / ${v.size}`,
                    price: v.price,
                })),
            }).unwrap();
            setSuccess(`✓ Produit ajouté au store (${r.synced} variant${r.synced > 1 ? "s" : ""} en DB).`);
            setTimeout(() => {
                onClose();
                setStep("browse");
                setSelectedProduct(null);
                setSelectedVariantIds(new Set());
                setSuccess(null);
            }, 1800);
        } catch (e: unknown) {
            const msg = (e as { data?: { detail?: string } })?.data?.detail ?? "Erreur lors de l'ajout.";
            setError(msg);
        }
    };

    const handleClose = () => {
        onClose();
        setTimeout(() => {
            setStep("browse");
            setSelectedProduct(null);
            setSelectedVariantIds(new Set());
            setSearch("");
            setError(null);
            setSuccess(null);
        }, 300);
    };

    return (
        <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
            <DialogContent
                className="max-w-2xl max-h-[85vh] flex flex-col"
                style={{ background: "var(--admin-card)", border: "1px solid var(--admin-border)", color: "white" }}
            >
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-sm font-mono uppercase tracking-wider">
                        {step !== "browse" && (
                            <button
                                onClick={() => { setStep("browse"); setSelectedProduct(null); }}
                                className="mr-1 opacity-60 hover:opacity-100 transition-opacity"
                            >
                                <ChevronLeft size={16} />
                            </button>
                        )}
                        <ShoppingBag size={16} style={{ color: "var(--admin-accent)" }} />
                        {step === "browse" && "Catalogue Printful"}
                        {step === "variants" && `Variants — ${selectedProduct?.name || selectedProduct?.model}`}
                        {step === "confirm" && "Confirmer l'ajout"}
                    </DialogTitle>
                </DialogHeader>

                {/* ── Étape 1 : browsing ── */}
                {step === "browse" && (
                    <div className="flex flex-col gap-3 overflow-hidden min-h-0 flex-1">
                        <Input
                            placeholder="Rechercher un produit (t-shirt, hoodie, mug…)"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="text-sm"
                            style={{ background: "#0f1117", border: "1px solid var(--admin-border)", color: "white" }}
                        />
                        <div className="overflow-y-auto flex-1 pr-1">
                            {isLoadingCatalog ? (
                                <div className="grid grid-cols-3 gap-3">
                                    {Array.from({ length: 9 }).map((_, i) => (
                                        <Skeleton key={i} className="h-28 rounded-lg" style={{ background: "#1a1d27" }} />
                                    ))}
                                </div>
                            ) : (catalogData?.result?.length ?? 0) === 0 ? (
                                <p className="text-center py-4 text-sm" style={{ color: "var(--admin-muted-2)" }}>
                                    Aucun produit trouvé.
                                </p>
                            ) : (
                                <div className="grid grid-cols-3 gap-3">
                                    {(catalogData?.result ?? []).map((p) => (
                                        <button
                                            key={p.id}
                                            onClick={() => handleSelectProduct(p)}
                                            className="rounded-lg overflow-hidden text-left transition-all hover:scale-[1.02]"
                                            style={{ border: "1px solid var(--admin-border)", background: "#0f1117" }}
                                        >
                                            <img
                                                src={p.image}
                                                alt={p.name || p.model}
                                                className="w-full h-24 object-contain bg-white/5"
                                            />
                                            <div className="p-2">
                                                <p className="text-xs font-medium truncate text-white">{p.name || p.model}</p>
                                                <p className="text-[10px]" style={{ color: "var(--admin-muted-2)" }}>
                                                    {p.brand} · {p.variant_count} variants
                                                </p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ── Étape 2 : sélection variants ── */}
                {step === "variants" && (
                    <div className="flex flex-col gap-4 overflow-hidden min-h-0 flex-1">
                        <div className="flex gap-3">
                            <div className="flex-1">
                                <label className="text-xs mb-1 block" style={{ color: "var(--admin-muted-2)" }}>
                                    Nom du produit dans votre boutique
                                </label>
                                <Input
                                    value={customName}
                                    onChange={(e) => setCustomName(e.target.value)}
                                    className="text-sm"
                                    style={{ background: "#0f1117", border: "1px solid var(--admin-border)", color: "white" }}
                                />
                            </div>
                            <div className="text-[10px] self-end pb-1" style={{ color: "var(--admin-muted-2)" }}>
                                Prix = coût Printful × marge 30% + TVA 20%
                            </div>
                        </div>

                        <div className="overflow-y-auto flex-1 pr-1">
                            {isLoadingDetail ? (
                                <div className="space-y-2">
                                    {Array.from({ length: 4 }).map((_, i) => (
                                        <Skeleton key={i} className="h-10 rounded" style={{ background: "#1a1d27" }} />
                                    ))}
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {colorGroups.map(([color, variantList]) => {
                                        const allSelected = variantList.every((v) => selectedVariantIds.has(v.id));
                                        const someSelected = variantList.some((v) => selectedVariantIds.has(v.id));
                                        const colorCode = variantList[0]?.color_code;
                                        return (
                                            <div key={color} className="rounded-lg overflow-hidden"
                                                style={{ border: "1px solid var(--admin-border)" }}>
                                                <button
                                                    onClick={() => toggleColorGroup(variantList)}
                                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium hover:bg-white/5 transition-colors"
                                                    style={{ background: "#0f1117" }}
                                                >
                                                    {colorCode && (
                                                        <span
                                                            className="w-4 h-4 rounded-full border"
                                                            style={{ background: colorCode, borderColor: "var(--admin-border)" }}
                                                        />
                                                    )}
                                                    <span className="flex-1 text-left">{color}</span>
                                                    <span className="text-[10px]"
                                                        style={{ color: "var(--admin-muted-2)" }}>
                                                        {someSelected ? `${variantList.filter(v => selectedVariantIds.has(v.id)).length}/${variantList.length}` : "Tout sélectionner"}
                                                    </span>
                                                    <div className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${allSelected ? "border-transparent" : ""}`}
                                                        style={{
                                                            background: allSelected ? "var(--admin-accent)" : someSelected ? "var(--admin-accent)33" : "transparent",
                                                            borderColor: allSelected || someSelected ? "var(--admin-accent)" : "var(--admin-border)",
                                                        }}>
                                                        {allSelected && <Check size={10} />}
                                                    </div>
                                                </button>
                                                <div className="flex flex-wrap gap-1.5 p-2" style={{ background: "#1a1d2788" }}>
                                                    {variantList.map((v) => {
                                                        const sel = selectedVariantIds.has(v.id);
                                                        return (
                                                            <button
                                                                key={v.id}
                                                                onClick={() => toggleVariant(v.id)}
                                                                className="px-2 py-1 rounded text-xs transition-all"
                                                                style={{
                                                                    background: sel ? "var(--admin-accent)" : "#0f1117",
                                                                    border: `1px solid ${sel ? "var(--admin-accent)" : "var(--admin-border)"}`,
                                                                    color: sel ? "white" : "var(--admin-muted-2)",
                                                                }}
                                                            >
                                                                {v.size}
                                                                {v.price && (
                                                                    <span className="ml-1 opacity-60">{parseFloat(v.price).toFixed(2)}€</span>
                                                                )}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {error && (
                            <p className="text-xs text-red-400">{error}</p>
                        )}
                        {success && (
                            <p className="text-xs text-green-400">{success}</p>
                        )}
                    </div>
                )}

                <DialogFooter className="flex items-center justify-between gap-2 mt-2">
                    <span className="text-xs" style={{ color: "var(--admin-muted-2)" }}>
                        {step === "variants" && selectedVariantIds.size > 0
                            ? `${selectedVariantIds.size} variant${selectedVariantIds.size > 1 ? "s" : ""} sélectionné${selectedVariantIds.size > 1 ? "s" : ""}`
                            : ""}
                    </span>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={handleClose}
                            style={{ borderColor: "var(--admin-border)", color: "var(--admin-muted-2)" }}>
                            Annuler
                        </Button>
                        {step === "variants" && (
                            <Button
                                size="sm"
                                onClick={handleConfirm}
                                disabled={isAdding || selectedVariantIds.size === 0}
                                style={{ background: "var(--admin-accent)", color: "white" }}
                            >
                                {isAdding ? "Ajout en cours…" : "Ajouter à ma boutique"}
                            </Button>
                        )}
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
