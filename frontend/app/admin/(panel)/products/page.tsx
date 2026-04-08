"use client";
import React, { useState, useMemo, useRef, useEffect } from "react";
import {
    useListProductsQuery,
    useCreateProductMutation,
    useUpdateProductMutation,
    useDeleteProductMutation,
    useSyncPrintfulProductsMutation,
    usePublishProductMutation,
    useGenerateMockupMutation,
    useGetMockupTemplatesQuery,
    useListShopDesignsQuery,
    type PrintfulTemplate,
    type ProductOut,
    type ShopDesignOut,
} from "@/lib/adminEndpoints";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Edit, Trash2, Plus, CheckCircle, ImageIcon, RefreshCw, BookOpen, ChevronDown, ChevronRight, Send } from "lucide-react";
import { PrintfulCatalogModal } from "./PrintfulCatalogModal";
import { assetUrl } from "@/lib/utils";

type Step = 1 | 2 | 3 | 4;

interface FormData {
    name: string;
    category: string;
    price: string;
    image_url: string | null;
    dpi: number | null;
    print_ready: boolean;
    // Mockup
    printful_catalog_product_id: number | null;
    design_url: string | null;
    mockup_url: string | null;
    placement_json: string | null;
}

const EMPTY_FORM: FormData = {
    name: "", category: "", price: "",
    image_url: null, dpi: null, print_ready: false,
    printful_catalog_product_id: null, design_url: null, mockup_url: null, placement_json: null,
};

const CATEGORIES = ["T-Shirt", "Hoodie", "Mug", "Poster", "Sticker", "Pad", "Autre"];

// ── Inline prix ─────────────────────────────────────────────────────────────
function InlinePriceCell({ product, onSave }: { product: ProductOut; onSave: (p: number) => void }) {
    const [editing, setEditing] = useState(false);
    const [val, setVal] = useState(String(product.design_price_ht));
    const commit = () => {
        const n = parseFloat(val);
        if (!isNaN(n) && n >= 0) onSave(n);
        setEditing(false);
    };
    const cancel = () => {
        setVal(String(product.design_price_ht));
        setEditing(false);
    };
    if (editing) return (
        <Input type="number" step="0.01" min="0" value={val} autoFocus
            className="h-7 w-24 text-xs"
            style={{ background: "var(--admin-card)", border: "1px solid var(--admin-accent)", color: "white" }}
            onChange={(e) => setVal(e.target.value)}
            onBlur={cancel}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); commit(); } if (e.key === "Escape") cancel(); }} />
    );
    return (
        <span className="cursor-pointer hover:text-[var(--admin-accent)] transition-colors"
            title="Cliquer pour éditer le prix design HT" onClick={() => { setVal(String(product.design_price_ht)); setEditing(true); }}>
            {product.price.toFixed(2)} €
        </span>
    );
}

// ── Étape 1 — Infos ─────────────────────────────────────────────────────────
function StepInfos({ form, setForm }: { form: FormData; setForm: (f: FormData) => void }) {
    return (
        <div className="space-y-4">
            {[
                { key: "name", label: "Nom du produit *", placeholder: "Ex: T-Shirt Premium Unisexe" },
                { key: "price", label: "Prix design HT (€) *", placeholder: "5.00", type: "number" },
            ].map(({ key, label, placeholder, type }) => (
                <div key={key}>
                    <label className="text-xs text-[var(--admin-muted-2)] mb-1 block">{label}</label>
                    <Input type={type ?? "text"} value={form[key as keyof FormData] as string}
                        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                        placeholder={placeholder}
                        style={{ background: "var(--admin-card)", border: "1px solid var(--admin-border)", color: "white" }} />
                </div>
            ))}
            <div>
                <label className="text-xs text-[var(--admin-muted-2)] mb-1 block">Catégorie</label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v ?? "" })}>
                    <SelectTrigger style={{ background: "var(--admin-card)", border: "1px solid var(--admin-border)", color: "white" }}>
                        <SelectValue placeholder="Choisir…" />
                    </SelectTrigger>
                    <SelectContent style={{ background: "var(--admin-sidebar)", border: "1px solid var(--admin-border)" }}>
                        {CATEGORIES.map((c) => <SelectItem key={c} value={c} className="text-white text-sm">{c}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
        </div>
    );
}

// ── Étape 2 — Image ─────────────────────────────────────────────────────────
function StepImage({ form, setForm }: { form: FormData; setForm: (f: FormData) => void }) {
    const { data: shopDesigns, isLoading: shopDesignsLoading } = useListShopDesignsQuery();

    const pickFromDesign = (item: ShopDesignOut) => {
        setForm({ ...form, image_url: assetUrl(item.url), dpi: item.dpi, print_ready: item.print_ready });
    };

    return (
        <div className="space-y-3">
            <div className="space-y-3">
                {shopDesignsLoading && <p className="text-xs text-[var(--admin-muted-2)] animate-pulse">Chargement des designs…</p>}
                {!shopDesignsLoading && (!shopDesigns || shopDesigns.length === 0) && (
                    <p className="text-xs text-[var(--admin-muted-2)]">Aucun design dans le Design Shop. Uploadez-en depuis la page Design Shop.</p>
                )}
                {shopDesigns && shopDesigns.length > 0 && (
                    <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto pr-1">
                        {shopDesigns.map((item) => (
                            <button
                                key={item.id}
                                onClick={() => pickFromDesign(item)}
                                className="relative rounded overflow-hidden border-2 transition-all"
                                style={{
                                    borderColor: form.image_url === assetUrl(item.url) ? "var(--admin-accent)" : "var(--admin-border)",
                                    background: "var(--admin-bg-2)",
                                }}>
                                <img src={assetUrl(item.url)} alt={item.filename} className="w-full h-24 object-contain p-1" />
                                <p className="text-[10px] text-center pb-1 px-1 truncate" style={{ color: "var(--admin-muted-2)" }}>
                                    {item.filename}
                                </p>
                                {item.print_ready && (
                                    <div className="absolute top-1 left-1 bg-green-500 rounded-full w-2 h-2" title="Print ready" />
                                )}
                                {form.image_url === assetUrl(item.url) && (
                                    <div className="absolute top-1 right-1">
                                        <CheckCircle size={14} className="text-green-400" />
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>
                )}
                {form.image_url && (
                    <div className="flex items-center gap-2 text-xs px-3 py-2 rounded"
                        style={{ background: "#22C55E18", border: "1px solid #22C55E" }}>
                        <CheckCircle size={14} className="text-green-400" />
                        <span style={{ color: "#22C55E" }}>Design sélectionné — déjà traité, prêt pour impression</span>
                    </div>
                )}
            </div>
        </div>
    );
}

// ── Étape 3 — Mockup Printful ────────────────────────────────────────────────
interface MPos { placement: string; scalePct: number; xOffsetPct: number; yOffsetPct: number; }
// Labels lisibles pour les placements Printful (fallback = valeur brute)
const PLACEMENT_LABELS: Record<string, string> = {
    front: "Devant",
    back: "Dos",
    sleeve_left: "Manche gauche",
    sleeve_right: "Manche droite",
    label: "Étiquette",
    inside: "Intérieur",
    embroidery_front: "Broderie devant",
    embroidery_back: "Broderie dos",
};

function StepMockup({ form, setForm }: { form: FormData; setForm: (f: FormData) => void }) {
    const { data: products } = useListProductsQuery();
    const [generateMockup, { isLoading: isGenerating }] = useGenerateMockupMutation();
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [pos, setPos] = useState<MPos>({ placement: "front", scalePct: 80, xOffsetPct: 50, yOffsetPct: 38 });
    const [mockupPreview, setMockupPreview] = useState<string | null>(form.mockup_url ?? null);
    const [genError, setGenError] = useState<string | null>(null);
    // Ratio naturel du design (h/w) pour éviter déformation dans Printful
    const [imgRatio, setImgRatio] = useState<number | null>(null);

    useEffect(() => {
        if (!form.image_url) { setImgRatio(null); return; }
        const img = new window.Image();
        img.onload = () => { if (img.naturalWidth > 0) setImgRatio(img.naturalHeight / img.naturalWidth); };
        img.onerror = () => setImgRatio(1);
        img.src = form.image_url;
    }, [form.image_url]);

    // Ratio effectif (fallback 1 si image pas encore chargée — n'arrive pas en pratique
    // car le bouton Generate est disabled tant que imgRatio est null)
    const effectiveRatio = imgRatio ?? 1;

    const selectedProduct = products?.find((p) => p.id === selectedId);
    const catalogProductId = selectedProduct?.printful_catalog_product_id ?? null;

    // Templates Printful pour le produit sélectionné
    const { data: tplData, isLoading: tplLoading, isError: tplError } = useGetMockupTemplatesQuery(catalogProductId!, {
        skip: catalogProductId == null,
    });
    // En attente = produit sélectionné mais templates pas encore arrivés
    // Bloqué = templates chargés mais vides (parser ou produit sans mockup generator)
    const tplPending = catalogProductId != null && tplLoading;
    const tplReady = !!tplData && !tplLoading;
    const noTemplates = tplReady && (!tplData?.templates?.length);

    // Placements disponibles pour ce produit — source primaire: available_placements du backend (/printfiles)
    const availablePlacements = useMemo(() => {
        if (!tplData) return [];
        // Priorité : available_placements retourné par le backend (source de vérité Printful)
        const avail = tplData.available_placements;
        if (avail && Object.keys(avail).length > 0) {
            return Object.entries(avail).map(([value, label]) => ({
                value,
                label: PLACEMENT_LABELS[value] ?? (label as string),
            }));
        }
        // Fallback : déduire depuis les templates (cas inattendu)
        if (!tplData.templates?.length) return [];
        const seen = new Set<string>();
        return tplData.templates
            .filter((t) => { if (seen.has(t.placement)) return false; seen.add(t.placement); return true; })
            .map((t) => ({ value: t.placement, label: PLACEMENT_LABELS[t.placement] ?? t.placement }));
    }, [tplData]);

    // Placement effectif : pos.placement SI disponible, sinon premier valide du produit
    // Calculé en useMemo pour être stable immédiatement quand tplData arrive (pas besoin d'un useEffect)
    const effectivePlacement = useMemo(() => {
        if (!availablePlacements.length) return pos.placement;
        return availablePlacements.find((p) => p.value === pos.placement)
            ? pos.placement
            : availablePlacements[0].value;
    }, [availablePlacements, pos.placement]);

    // Sync pos.placement avec effectivePlacement (UI dropdown)
    useEffect(() => {
        if (effectivePlacement !== pos.placement) {
            setPos((prev) => ({ ...prev, placement: effectivePlacement }));
        }
    }, [effectivePlacement]);

    // Template actif basé sur effectivePlacement (toujours valide)
    const activeTpl: PrintfulTemplate | undefined = useMemo(() => {
        if (!tplData?.templates?.length) return undefined;
        return (
            tplData.templates.find((t) => t.placement === effectivePlacement) ??
            tplData.templates.find((t) => t.is_default) ??
            tplData.templates[0]
        );
    }, [tplData, effectivePlacement]);

    // Dimensions canvas: largeur fixe 240, hauteur basée sur le template
    const CANVAS_W = 240;

    // Dimensions réelles pour Printful (print_area_width/height ou fallback)
    const AREA_W = activeTpl?.print_area_width ?? 1800;
    const AREA_H = activeTpl?.print_area_height ?? 2400;

    // Zone d'impression en coordonnées canvas
    // paLeft/paTop : depuis les coordonnées template de Printful
    const paLeft = activeTpl ? activeTpl.print_area_left / activeTpl.template_width * CANVAS_W : 12;
    const templateH_canvas = activeTpl
        ? Math.round(CANVAS_W * activeTpl.template_height / activeTpl.template_width)
        : 310;
    const paTop = activeTpl ? activeTpl.print_area_top / activeTpl.template_height * templateH_canvas : 12;
    // paW symétrique depuis la marge gauche
    const paW = CANVAS_W - paLeft * 2;
    // paH CALÉ SUR LE RATIO RÉEL AREA_W:AREA_H — c'est la clé de la calibration
    // Garantit que scalePct=X% produit exactement la même taille relative en canvas et chez Printful
    const paH = AREA_W > 0 ? paW * AREA_H / AREA_W : paW * 4 / 3;
    // Canvas height = max(template proportionnel, zone impression + marges haut/bas)
    const CANVAS_H = Math.max(templateH_canvas, Math.round(paTop + paH + paTop));

    // 100% = design tient entièrement dans la zone (contrainte par la plus petite dimension)
    // Portrait (ratio > W/H) → contraint en hauteur ; Paysage → contraint en largeur
    const areaAspect = AREA_H > 0 ? AREA_W / AREA_H : 1;
    const maxDW_area = effectiveRatio > areaAspect
        ? Math.floor(AREA_H / effectiveRatio)   // portrait : hauteur est la contrainte
        : AREA_W;                                // paysage : largeur est la contrainte

    // Canvas preview : maxDW_canvas = maxDW_area ramené à l'échelle du canvas
    // Puisque paW/paH = AREA_W/AREA_H (même ratio), la proportion est exactement la même
    const maxDW_canvas = maxDW_area * (paW / AREA_W);

    // Design overlay dans le canvas
    const dW_canvas = pos.scalePct / 100 * maxDW_canvas;
    const dH_canvas = dW_canvas * effectiveRatio;
    const dLeft = paLeft + pos.xOffsetPct / 100 * paW - dW_canvas / 2;
    const dTop = paTop + pos.yOffsetPct / 100 * paH - dH_canvas / 2;

    const handleGenerate = async () => {
        if (!selectedProduct?.printful_catalog_product_id || !form.image_url || imgRatio === null || tplPending) return;
        // effectivePlacement est toujours un placement valide pour ce produit (calculé en useMemo)
        setGenError(null);
        // dW/dH contraints dans l'area (ne débordent jamais)
        const dW = Math.min(AREA_W, Math.round(pos.scalePct / 100 * maxDW_area));
        const dH = Math.min(AREA_H, Math.round(dW * effectiveRatio));
        // Position : centrée sur xOffset/yOffset, clampe pour ne pas sortir de l'area
        const posLeft = Math.max(0, Math.min(AREA_W - dW, Math.round(pos.xOffsetPct / 100 * AREA_W - dW / 2)));
        const posTop = Math.max(0, Math.min(AREA_H - dH, Math.round(pos.yOffsetPct / 100 * AREA_H - dH / 2)));
        try {
            const res = await generateMockup({
                printful_catalog_product_id: selectedProduct.printful_catalog_product_id,
                variant_id: parseInt(selectedProduct.variants[0]?.printful_variant_id ?? "0"),
                design_url: form.image_url,
                placement: effectivePlacement,
                area_width: AREA_W, area_height: AREA_H,
                design_width: dW, design_height: dH,
                position_top: posTop, position_left: posLeft,
            }).unwrap();
            setMockupPreview(res.mockup_url);
            setForm({
                ...form,
                mockup_url: res.mockup_url,
                placement_json: JSON.stringify(res.placement_json),
                design_url: form.image_url,
                printful_catalog_product_id: selectedProduct.printful_catalog_product_id,
                image_url: res.mockup_url,  // utilise le mockup comme thumbnail produit
            });
        } catch (e: unknown) {
            setGenError((e as { data?: { detail?: string } })?.data?.detail ?? "Erreur génération mockup.");
        }
    };

    // Produits avec catalog_product_id seulement (importés depuis catalogue Printful)
    const pickableProducts = (products ?? []).filter((p) => p.printful_catalog_product_id != null);

    return (
        <div className="space-y-4">
            <div>
                <label className="text-xs text-[var(--admin-muted-2)] mb-1 block">Produit Printful de base</label>
                {pickableProducts.length === 0 ? (
                    <p className="text-xs px-3 py-2 rounded" style={{ background: "#F59E0B18", border: "1px solid #F59E0B40", color: "#F59E0B" }}>
                        Aucun produit avec catalogue Printful. Importez d'abord depuis "Catalogue Printful".
                    </p>
                ) : (
                    <Select value={selectedId != null ? String(selectedId) : ""} onValueChange={(v) => { if (v) setSelectedId(parseInt(v)); }}>
                        <SelectTrigger style={{ background: "var(--admin-card)", border: "1px solid var(--admin-border)", color: "white" }}>
                            <SelectValue placeholder="Choisir un produit…" />
                        </SelectTrigger>
                        <SelectContent style={{ background: "var(--admin-sidebar)", border: "1px solid var(--admin-border)" }}>
                            {pickableProducts.map((p) => (
                                <SelectItem key={p.id} value={String(p.id)} className="text-white text-xs">
                                    {p.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}
            </div>

            <div className="flex gap-4">
                {/* Canvas de positionnement */}
                <div className="relative flex-shrink-0 rounded overflow-hidden"
                    style={{ width: CANVAS_W, height: CANVAS_H, background: "var(--admin-card)", border: "1px solid var(--admin-border)" }}>
                    {/* Template Printful comme fond (background_url = produit vierge) */}
                    {activeTpl?.background_url ? (
                        <img src={activeTpl.background_url} alt="" className="w-full h-full object-contain" />
                    ) : selectedProduct?.image_url ? (
                        <img src={selectedProduct.image_url} alt="" className="w-full h-full object-contain" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-center px-2" style={{ color: "var(--admin-muted-2)" }}>
                            Choisir un produit pour voir l'aperçu
                        </div>
                    )}
                    {/* Design de l'utilisateur */}
                    {form.image_url && (
                        <img src={form.image_url} alt="design" className="absolute pointer-events-none"
                            style={{ width: dW_canvas, height: dH_canvas, left: dLeft, top: dTop, objectFit: "contain", opacity: 0.85 }} />
                    )}
                    {/* Zone d'impression */}
                    <div className="absolute pointer-events-none border-2 border-dashed"
                        style={{
                            left: paLeft, top: paTop, width: paW, height: paH,
                            borderColor: activeTpl ? "rgba(255,107,0,0.4)" : "rgba(255,107,0,0.2)",
                        }} />
                    {/* Badge dimensions réelles */}
                    {activeTpl && (
                        <div className="absolute bottom-1 right-1 text-[9px] px-1 rounded"
                            style={{ background: "rgba(0,0,0,0.6)", color: "var(--admin-accent)" }}>
                            {AREA_W}×{AREA_H}px
                        </div>
                    )}
                </div>

                {/* Contrôles */}
                <div className="flex-1 space-y-3 min-w-0">
                    <div>
                        <label className="text-xs text-[var(--admin-muted-2)] mb-1 block">Emplacement</label>
                        <Select value={pos.placement} onValueChange={(v) => { if (v) setPos({ ...pos, placement: v }); }}>
                            <SelectTrigger className="text-xs h-8" style={{ background: "var(--admin-card)", border: "1px solid var(--admin-border)", color: "white" }}>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent style={{ background: "var(--admin-sidebar)", border: "1px solid var(--admin-border)" }}>
                                {(availablePlacements.length > 0 ? availablePlacements : [{ value: pos.placement, label: PLACEMENT_LABELS[pos.placement] ?? pos.placement }])
                                    .map((p) => <SelectItem key={p.value} value={p.value} className="text-white text-xs">{p.label}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    {[
                        { label: `Taille : ${pos.scalePct}%`, key: "scalePct" as const, min: 10, max: 100 },
                        { label: `Position X : ${pos.xOffsetPct}%`, key: "xOffsetPct" as const, min: 0, max: 100 },
                        { label: `Position Y : ${pos.yOffsetPct}%`, key: "yOffsetPct" as const, min: 0, max: 100 },
                    ].map(({ label, key, min, max }) => (
                        <div key={key}>
                            <label className="text-xs text-[var(--admin-muted-2)] mb-1 block">{label}</label>
                            <input type="range" min={min} max={max} value={pos[key]}
                                onChange={(e) => setPos({ ...pos, [key]: parseInt(e.target.value) })}
                                className="w-full h-1 rounded appearance-none"
                                style={{ accentColor: "var(--admin-accent)" }} />
                        </div>
                    ))}
                </div>
            </div>

            <div className="space-y-2">
                <Button
                    disabled={!selectedProduct?.printful_catalog_product_id || !form.image_url || isGenerating || imgRatio === null || tplPending || noTemplates || tplError}
                    onClick={handleGenerate}
                    size="sm"
                    style={{ background: isGenerating || tplPending || noTemplates || imgRatio === null ? "var(--admin-border)" : "var(--admin-accent)", color: "white" }}>
                    {isGenerating ? "Génération en cours…" : tplPending ? "Chargement template…" : imgRatio === null ? "Chargement image…" : "Générer l'aperçu Printful ↗"}
                </Button>
                {(noTemplates || tplError) && (
                    <p className="text-xs text-red-400">
                        Aucun template trouvé pour ce produit — vérifiez les logs backend (product_id / placements).
                    </p>
                )}
                {genError && <p className="text-xs text-red-400">{genError}</p>}
                {!selectedProduct?.printful_catalog_product_id && selectedId && (
                    <p className="text-xs text-yellow-400">Ce produit n'a pas de catalogue Printful ID. Re-importez-le depuis "Catalogue Printful".</p>
                )}
                {mockupPreview && (
                    <div className="flex items-start gap-3 pt-1">
                        <img src={mockupPreview} alt="mockup" className="h-24 rounded object-contain"
                            style={{ border: "1px solid #22C55E40" }} />
                        <p className="text-xs text-green-400 pt-1">✓ Mockup généré — il sera utilisé comme image produit et comme base de commande Printful.</p>
                    </div>
                )}
                {!form.image_url && (
                    <p className="text-xs text-[var(--admin-muted-2)]">⟵ Uploadez d'abord votre design (étape 2) avant de générer le mockup.</p>
                )}
            </div>
        </div>
    );
}

// ── Étape 4 — Validation ────────────────────────────────────────────────────
function StepValidation({ form }: { form: FormData }) {
    const rows = [
        { label: "Nom", value: form.name },
        { label: "Catégorie", value: form.category || "—" },
        { label: "Design HT", value: `${parseFloat(form.price || "0").toFixed(2)} €` },
        { label: "DPI", value: form.dpi ? `${form.dpi} DPI` : "—" },
        {
            label: "Prêt pour impression", value: form.dpi ? (form.print_ready ? "✓ Oui" : "✗ Non (< 300 DPI)") : "—",
            color: form.print_ready ? "#22C55E" : form.dpi !== null ? "#EF4444" : undefined
        },
        { label: "Mockup généré", value: form.mockup_url ? "✓ Oui" : "Non", color: form.mockup_url ? "#22C55E" : undefined },
        {
            label: "Emplacement",
            value: form.placement_json
                ? (() => { try { return (JSON.parse(form.placement_json) as { placement?: string }).placement ?? "—"; } catch { return "—"; } })()
                : "—"
        },
    ];
    return (
        <div className="space-y-3">
            <p className="text-sm text-[var(--admin-muted-2)]">Vérifiez les informations avant de créer le produit.</p>
            <div className="rounded-lg overflow-hidden" style={{ border: "1px solid var(--admin-border)" }}>
                {rows.map(({ label, value, color }) => (
                    <div key={label} className="flex justify-between px-4 py-2 text-sm border-b last:border-0"
                        style={{ borderColor: "var(--admin-border)" }}>
                        <span className="text-[var(--admin-muted-2)]">{label}</span>
                        <span style={{ color: color ?? "white" }}>{value}</span>
                    </div>
                ))}
            </div>
            {(form.mockup_url || form.image_url) && (
                <div className="flex gap-3 items-start pt-2">
                    {form.mockup_url && (
                        <div className="flex flex-col items-center gap-1">
                            <img src={form.mockup_url} alt="mockup" className="h-28 object-contain rounded"
                                style={{ border: "1px solid #22C55E40" }} />
                            <span className="text-[10px] text-green-400">Mockup Printful</span>
                        </div>
                    )}
                    {form.design_url && form.design_url !== form.mockup_url && (
                        <div className="flex flex-col items-center gap-1">
                            <img src={form.design_url} alt="design" className="h-28 object-contain rounded"
                                style={{ border: "1px solid var(--admin-border)" }} />
                            <span className="text-[10px] text-[var(--admin-muted-2)]">Design brut</span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ── Modal ────────────────────────────────────────────────────────────────────
function ProductFormModal({ open, initial, onClose }: { open: boolean; initial: ProductOut | null; onClose: () => void }) {
    const isEdit = !!initial;
    const [step, setStep] = useState<Step>(1);
    const [form, setForm] = useState<FormData>({
        name: initial?.name ?? "",
        category: initial?.category ?? "",
        price: initial ? String(initial.design_price_ht) : "",
        image_url: initial?.image_url ?? null,
        dpi: null, print_ready: false,
        printful_catalog_product_id: initial?.printful_catalog_product_id ?? null,
        design_url: initial?.design_url ?? null,
        mockup_url: initial?.mockup_url ?? null,
        placement_json: initial?.placement_json ?? null,
    });
    const [createProduct, { isLoading: creating }] = useCreateProductMutation();
    const [updateProduct, { isLoading: updating }] = useUpdateProductMutation();

    const step1Valid = form.name.trim().length > 0 && parseFloat(form.price) > 0;

    const handleSubmit = async () => {
        try {
            if (isEdit && initial) {
                await updateProduct({
                    id: initial.id, name: form.name, category: form.category || null,
                    design_price_ht: parseFloat(form.price) || 0,
                    image_url: form.image_url,
                    design_url: form.design_url,
                    mockup_url: form.mockup_url,
                    placement_json: form.placement_json,
                    printful_catalog_product_id: form.printful_catalog_product_id,
                }).unwrap();
            } else {
                await createProduct({
                    name: form.name, category: form.category || null,
                    design_price_ht: parseFloat(form.price) || 0,
                    shop_margin_rate: 0.30, tva_rate: 0.20,
                    price: 0,
                    image_url: form.image_url,
                    design_url: form.design_url,
                    mockup_url: form.mockup_url,
                    placement_json: form.placement_json,
                    printful_catalog_product_id: form.printful_catalog_product_id,
                    variants: [],
                }).unwrap();
            }
            onClose();
        } catch { /* ignore */ }
    };

    const stepLabels = ["Informations", "Image", "Mockup", "Validation"];

    return (
        <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
            <DialogContent className={step === 3 ? "max-w-2xl" : "max-w-lg"}
                style={{ background: "var(--admin-sidebar)", border: "1px solid var(--admin-border)" }}>
                <DialogHeader>
                    <DialogTitle className="text-white">{isEdit ? "Modifier le produit" : "Nouveau produit"}</DialogTitle>
                </DialogHeader>
                {/* Indicateur d'étapes */}
                <div className="flex items-center gap-1 mb-4 overflow-x-auto">
                    {stepLabels.map((label, i) => {
                        const n = (i + 1) as Step;
                        const active = n === step, done = n < step;
                        return (
                            <div key={n} className="flex items-center gap-1 flex-shrink-0">
                                <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                                    style={{
                                        background: active ? "var(--admin-accent)" : done ? "#22C55E" : "var(--admin-border)",
                                        color: (active || done) ? "white" : "var(--admin-muted-2)"
                                    }}>
                                    {done ? "✓" : n}
                                </div>
                                <span className="text-xs" style={{ color: active ? "white" : "var(--admin-muted-2)" }}>{label}</span>
                                {i < 3 && <div className="h-px w-4 flex-shrink-0" style={{ background: "var(--admin-border)" }} />}
                            </div>
                        );
                    })}
                </div>
                <div className="min-h-[280px]">
                    {step === 1 && <StepInfos form={form} setForm={setForm} />}
                    {step === 2 && <StepImage form={form} setForm={setForm} />}
                    {step === 3 && <StepMockup form={form} setForm={setForm} />}
                    {step === 4 && <StepValidation form={form} />}
                </div>
                <DialogFooter className="flex justify-between gap-2 mt-4">
                    <Button variant="ghost" size="sm"
                        onClick={() => step > 1 ? setStep((s) => (s - 1) as Step) : onClose()}
                        style={{ color: "var(--admin-muted-2)" }}>
                        {step > 1 ? "← Retour" : "Annuler"}
                    </Button>
                    <div className="flex gap-2">
                        {step === 3 && (
                            <Button size="sm" variant="ghost"
                                onClick={() => setStep(4)}
                                style={{ color: "var(--admin-muted-2)", border: "1px solid var(--admin-border)" }}>
                                Passer →
                            </Button>
                        )}
                        {step < 4 ? (
                            <Button size="sm" disabled={step === 1 && !step1Valid}
                                onClick={() => setStep((s) => (s + 1) as Step)}
                                style={{ background: "var(--admin-accent)", color: "white" }}>
                                Suivant →
                            </Button>
                        ) : (
                            <Button size="sm" disabled={creating || updating} onClick={handleSubmit}
                                style={{ background: "var(--admin-accent)", color: "white" }}>
                                {creating || updating ? "Enregistrement…" : isEdit ? "Sauvegarder" : "Créer le produit"}
                            </Button>
                        )}
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// ── Page principale ──────────────────────────────────────────────────────────
export default function AdminProductsPage() {
    const { data: products, isLoading } = useListProductsQuery();
    const [updateProduct] = useUpdateProductMutation();
    const [deleteProduct] = useDeleteProductMutation();
    const [syncPrintful, { isLoading: isSyncing }] = useSyncPrintfulProductsMutation();
    const [publishProduct, { isLoading: isPublishing }] = usePublishProductMutation();
    const [publishingId, setPublishingId] = useState<number | null>(null);
    const [expandedId, setExpandedId] = useState<number | null>(null);
    const [syncResult, setSyncResult] = useState<{ synced: number; updated: number; variants_added: number } | null>(null);
    const [search, setSearch] = useState("");
    const [modalOpen, setModalOpen] = useState(false);
    const [catalogOpen, setCatalogOpen] = useState(false);
    const [editTarget, setEditTarget] = useState<ProductOut | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<ProductOut | null>(null);

    const handleSync = async () => {
        setSyncResult(null);
        try {
            const r = await syncPrintful().unwrap();
            setSyncResult(r);
        } catch { /* ignore */ }
    };

    const filtered = useMemo(() => {
        const q = search.toLowerCase();
        return (products ?? []).filter((p) =>
            !q || p.name.toLowerCase().includes(q) ||
            p.variants.some((v) => (v.color ?? "").toLowerCase().includes(q) || (v.size ?? "").toLowerCase().includes(q)) ||
            (p.category ?? "").toLowerCase().includes(q)
        );
    }, [products, search]);

    const openCreate = () => { setEditTarget(null); setModalOpen(true); };
    const openEdit = (p: ProductOut) => { setEditTarget(p); setModalOpen(true); };
    const closeModal = () => { setModalOpen(false); setEditTarget(null); };

    return (
        <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex items-center justify-between gap-3">
                <Input placeholder="Rechercher par nom, variante, catégorie…"
                    value={search} onChange={(e) => setSearch(e.target.value)}
                    className="max-w-72 text-sm"
                    style={{ background: "var(--admin-card)", border: "1px solid var(--admin-border)", color: "white" }} />
                <div className="flex items-center gap-2">
                    {syncResult && (
                        <span className="text-xs" style={{ color: "var(--admin-muted-2)" }}>
                            ✓ {syncResult.synced} créés, {syncResult.updated} mis à jour, {syncResult.variants_added} variantes
                        </span>
                    )}
                    <Button size="sm" variant="outline" onClick={handleSync} disabled={isSyncing}
                        style={{ borderColor: "var(--admin-border)", color: "var(--admin-muted-2)" }}>
                        <RefreshCw size={14} className={`mr-1${isSyncing ? " animate-spin" : ""}`} />
                        {isSyncing ? "Sync…" : "Sync Printful"}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setCatalogOpen(true)}
                        style={{ borderColor: "var(--admin-border)", color: "var(--admin-muted-2)" }}>
                        <BookOpen size={14} className="mr-1" /> Catalogue Printful
                    </Button>
                    <Button size="sm" onClick={openCreate}
                        style={{ background: "var(--admin-accent)", color: "white" }}>
                        <Plus size={14} className="mr-1" /> Nouveau produit
                    </Button>
                </div>
            </div>

            {/* Table */}
            <div className="rounded-lg overflow-hidden"
                style={{ border: "1px solid var(--admin-border)", background: "var(--admin-card)" }}>
                <Table>
                    <TableHeader>
                        <TableRow style={{ borderColor: "var(--admin-border)" }}>
                            {[["expand", ""], ["id", "ID"], ["img", "Image"], ["name", "Nom"], ["cat", "Catégorie"], ["vars", "Variantes"], ["price", "Prix min TTC"], ["margin", "Marge"], ["actions", ""]].map(([key, h]) => (
                                <TableHead key={key} className={`text-[var(--admin-muted-2)] text-xs${h === "" ? " text-right w-4" : ""}`}>{h}</TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <TableRow key={i} style={{ borderColor: "var(--admin-border)" }}>
                                    {Array.from({ length: 9 }).map((__, j) => (
                                        <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : filtered.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={9} className="text-center py-10 text-[var(--admin-muted-2)] text-sm">
                                    {search ? "Aucun produit ne correspond à la recherche." : "Aucun produit."}
                                </TableCell>
                            </TableRow>
                        ) : filtered.map((p) => (
                            <React.Fragment key={p.id}>
                                <TableRow key={p.id} style={{ borderColor: "var(--admin-border)" }} className="hover:bg-white/5">
                                    {/* Expand toggle */}
                                    <TableCell className="w-6 px-2">
                                        {p.variants.length > 0 && (
                                            <button
                                                onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}
                                                className="text-[var(--admin-muted-2)] hover:text-white transition-colors">
                                                {expandedId === p.id ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                            </button>
                                        )}
                                    </TableCell>
                                    <TableCell className="font-mono text-[var(--admin-muted-2)] text-xs">#{p.id}</TableCell>
                                    <TableCell>
                                        {p.image_url ? (
                                            <img src={p.image_url} alt="" className="w-10 h-10 object-contain rounded"
                                                style={{ border: "1px solid var(--admin-border)" }} />
                                        ) : (
                                            <div className="w-10 h-10 rounded flex items-center justify-center"
                                                style={{ background: "var(--admin-border)" }}>
                                                <ImageIcon size={14} className="text-[var(--admin-muted-2)]" />
                                            </div>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-white text-sm font-medium">{p.name}</TableCell>
                                    <TableCell className="text-[var(--admin-muted-2)] text-xs">{p.category ?? "—"}</TableCell>
                                    <TableCell>
                                        <span className="px-2 py-0.5 rounded text-xs font-mono"
                                            style={{ background: "var(--admin-card)", border: "1px solid var(--admin-border)", color: p.variants.length > 0 ? "#22C55E" : "var(--admin-muted-2)" }}>
                                            {p.variants.length} variante{p.variants.length !== 1 ? "s" : ""}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-white text-sm">
                                        <InlinePriceCell product={p} onSave={(val) => updateProduct({ id: p.id, design_price_ht: val })} />
                                    </TableCell>
                                    <TableCell className="text-sm">
                                        <span className="px-2 py-0.5 rounded text-xs font-mono"
                                            style={{ background: "var(--admin-card)", border: "1px solid var(--admin-border)", color: "#22C55E" }}>
                                            {(p.shop_margin_rate * 100).toFixed(0)} %
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            <button
                                                disabled={publishingId === p.id || !p.mockup_url}
                                                onClick={async () => {
                                                    if (!p.mockup_url) return;
                                                    setPublishingId(p.id);
                                                    try { await publishProduct(p.id).unwrap(); } catch { /* ignore */ } finally { setPublishingId(null); }
                                                }}
                                                className="p-1.5 rounded hover:bg-emerald-500/20 text-[var(--admin-muted-2)] hover:text-emerald-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                                title={p.mockup_url ? "Publier dans le catalogue" : "Générez d'abord un mockup"}>
                                                <Send size={13} className={publishingId === p.id ? "animate-pulse" : ""} />
                                            </button>
                                            <button onClick={() => openEdit(p)}
                                                className="p-1.5 rounded hover:bg-white/10 text-[var(--admin-muted-2)] hover:text-white transition-colors"
                                                title="Modifier"><Edit size={14} /></button>
                                            <button onClick={() => setDeleteTarget(p)}
                                                className="p-1.5 rounded hover:bg-red-500/20 text-[var(--admin-muted-2)] hover:text-red-400 transition-colors"
                                                title="Supprimer"><Trash2 size={14} /></button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                                {/* Variantes expansibles */}
                                {expandedId === p.id && p.variants.map((v) => (
                                    <TableRow key={`v-${v.id}`} style={{ borderColor: "var(--admin-border)", background: "rgba(255,255,255,0.02)" }}>
                                        <TableCell />
                                        <TableCell colSpan={2} className="font-mono text-[10px] text-[var(--admin-muted-2)] pl-6">
                                            ID var: {v.printful_variant_id}
                                        </TableCell>
                                        <TableCell colSpan={2}>
                                            <div className="flex items-center gap-2">
                                                {v.color && (
                                                    <span className="text-xs px-2 py-0.5 rounded"
                                                        style={{ background: "var(--admin-border)", color: "white" }}>
                                                        {v.color}
                                                    </span>
                                                )}
                                                {v.size && (
                                                    <span className="text-xs px-2 py-0.5 rounded"
                                                        style={{ background: "var(--admin-border)", color: "var(--admin-muted-2)" }}>
                                                        {v.size}
                                                    </span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-[var(--admin-muted-2)] text-xs">
                                            Coût HT: {v.printful_cost_ht.toFixed(2)} €
                                        </TableCell>
                                        <TableCell className="text-white text-xs">
                                            {v.price.toFixed(2)} €
                                        </TableCell>
                                        <TableCell colSpan={2} />
                                    </TableRow>
                                ))}
                            </React.Fragment>
                        ))}
                    </TableBody>
                </Table>
            </div>

            {!isLoading && (
                <p className="text-xs text-[var(--admin-muted-2)]">
                    {filtered.length} produit{filtered.length !== 1 ? "s" : ""}{search && ` sur ${(products ?? []).length}`}
                </p>
            )}

            {modalOpen && <ProductFormModal open={modalOpen} initial={editTarget} onClose={closeModal} />}

            <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
                <AlertDialogContent style={{ background: "var(--admin-sidebar)", border: "1px solid var(--admin-border)" }}>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-white">Supprimer le produit ?</AlertDialogTitle>
                        <AlertDialogDescription className="text-[var(--admin-muted-2)]">
                            <strong className="text-white">{deleteTarget?.name}</strong> sera définitivement supprimé.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel style={{ background: "var(--admin-card)", border: "1px solid var(--admin-border)", color: "var(--admin-muted-2)" }}>
                            Annuler
                        </AlertDialogCancel>
                        <AlertDialogAction style={{ background: "#EF4444", color: "white" }}
                            onClick={() => { if (deleteTarget) deleteProduct(deleteTarget.id); setDeleteTarget(null); }}>
                            Supprimer
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <PrintfulCatalogModal open={catalogOpen} onClose={() => setCatalogOpen(false)} />
        </div>
    );
}
