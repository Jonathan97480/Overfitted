"use client";
import { useState, useMemo, useRef } from "react";
import {
    useListProductsQuery,
    useCreateProductMutation,
    useUpdateProductMutation,
    useDeleteProductMutation,
    useSyncPrintfulProductsMutation,
    useUploadCatalogueImageMutation,
    useProcessCatalogueImageMutation,
    useGenerateMockupMutation,
    useListCatalogueQuery,
    type ProductOut,
    type CatalogueItemOut,
    type ImageProcessResult,
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
import { Edit, Trash2, Plus, Upload, CheckCircle, AlertCircle, ImageIcon, RefreshCw, BookOpen } from "lucide-react";
import { PrintfulCatalogModal } from "./PrintfulCatalogModal";
import { assetUrl } from "@/lib/utils";

type Step = 1 | 2 | 3 | 4;

interface FormData {
    name: string;
    category: string;
    printful_variant_id: string;
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
    name: "", category: "", printful_variant_id: "", price: "",
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
                { key: "printful_variant_id", label: "Printful Variant ID *", placeholder: "Ex: 4011" },
                { key: "price", label: "Prix (€) *", placeholder: "29.99", type: "number" },
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
    const fileRef = useRef<HTMLInputElement>(null);
    const [tab, setTab] = useState<"catalogue" | "upload">("catalogue");
    const [uploadImage] = useUploadCatalogueImageMutation();
    const [processImage] = useProcessCatalogueImageMutation();
    const [processing, setProcessing] = useState<string | null>(null);
    const [processResult, setProcessResult] = useState<ImageProcessResult | null>(null);
    const { data: catalogueItems, isLoading: catalogueLoading } = useListCatalogueQuery({ limit: 100 });

    const handleFile = async (file: File) => {
        setProcessing("Chargement…");
        const fd = new FormData();
        fd.append("file", file);
        try {
            const r = await uploadImage(fd).unwrap();
            setForm({ ...form, image_url: r.url, dpi: r.dpi, print_ready: r.print_ready });
        } catch { /* ignore */ } finally { setProcessing(null); }
    };

    const handleProcess = async (removeBg: boolean) => {
        if (!fileRef.current?.files?.[0]) return;
        setProcessing(removeBg ? "Suppression fond…" : "Upscale 300 DPI…");
        const fd = new FormData();
        fd.append("file", fileRef.current.files[0]);
        if (removeBg) fd.append("remove_bg", "true");
        fd.append("upscale", "true");
        try {
            const r = await processImage(fd).unwrap();
            setProcessResult(r);
            setForm({ ...form, image_url: r.url, dpi: r.dpi, print_ready: r.print_ready });
        } catch { /* ignore */ } finally { setProcessing(null); }
    };

    const pickFromCatalogue = (item: CatalogueItemOut) => {
        setForm({ ...form, image_url: assetUrl(item.image_url), dpi: 300, print_ready: true });
    };

    return (
        <div className="space-y-3">
            {/* Onglets */}
            <div className="flex gap-1 p-1 rounded" style={{ background: "var(--admin-bg-2)" }}>
                <button
                    onClick={() => setTab("catalogue")}
                    className="flex-1 text-xs py-1.5 rounded transition-colors"
                    style={{
                        background: tab === "catalogue" ? "var(--admin-accent)" : "transparent",
                        color: tab === "catalogue" ? "#000" : "var(--admin-muted-2)",
                        fontWeight: tab === "catalogue" ? 600 : 400,
                    }}>
                    Catalogue du site
                </button>
                <button
                    onClick={() => setTab("upload")}
                    className="flex-1 text-xs py-1.5 rounded transition-colors"
                    style={{
                        background: tab === "upload" ? "var(--admin-accent)" : "transparent",
                        color: tab === "upload" ? "#000" : "var(--admin-muted-2)",
                        fontWeight: tab === "upload" ? 600 : 400,
                    }}>
                    Uploader un fichier
                </button>
            </div>

            {tab === "catalogue" && (
                <div className="space-y-3">
                    {catalogueLoading && <p className="text-xs text-[var(--admin-muted-2)] animate-pulse">Chargement du catalogue…</p>}
                    {!catalogueLoading && (!catalogueItems || catalogueItems.length === 0) && (
                        <p className="text-xs text-[var(--admin-muted-2)]">Aucun design dans le catalogue.</p>
                    )}
                    {catalogueItems && catalogueItems.length > 0 && (
                        <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto pr-1">
                            {catalogueItems.filter(i => i.image_url).map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => pickFromCatalogue(item)}
                                    className="relative rounded overflow-hidden border-2 transition-all"
                                    style={{
                                        borderColor: form.image_url === assetUrl(item.image_url) ? "var(--admin-accent)" : "var(--admin-border)",
                                        background: "var(--admin-bg-2)",
                                    }}>
                                    <img src={assetUrl(item.image_url)} alt={item.title} className="w-full h-24 object-contain p-1" />
                                    <p className="text-[10px] text-center pb-1 px-1 truncate" style={{ color: "var(--admin-muted-2)" }}>
                                        {item.title}
                                    </p>
                                    {form.image_url === item.image_url && (
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
            )}

            {tab === "upload" && (
                <div className="space-y-3">
                    <div className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-[var(--admin-accent)] transition-colors"
                        style={{ borderColor: "var(--admin-border)" }}
                        onClick={() => fileRef.current?.click()}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                            e.preventDefault();
                            const file = e.dataTransfer.files[0];
                            if (file) {
                                if (fileRef.current) { const dt = new DataTransfer(); dt.items.add(file); fileRef.current.files = dt.files; }
                                handleFile(file);
                            }
                        }}>
                        <input ref={fileRef} type="file" accept="image/*" className="hidden"
                            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
                        {form.image_url ? (
                            <div className="flex flex-col items-center gap-2">
                                <img src={form.image_url} alt="" className="h-32 object-contain rounded" />
                                <p className="text-xs text-[var(--admin-muted-2)]">Cliquer pour changer</p>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center gap-2 text-[var(--admin-muted-2)]">
                                <ImageIcon size={32} />
                                <p className="text-sm">Glisser-déposer ou cliquer</p>
                                <p className="text-xs">JPG, PNG, WEBP — max 10 Mo</p>
                            </div>
                        )}
                    </div>
                    {form.image_url && (
                        <div className="flex gap-2 flex-wrap">
                            <Button variant="outline" size="sm" disabled={!!processing} onClick={() => handleProcess(false)}
                                style={{ borderColor: "var(--admin-border)", color: "var(--admin-muted-2)" }}>
                                <Upload size={14} className="mr-1" /> Upscale 300 DPI
                            </Button>
                            <Button variant="outline" size="sm" disabled={!!processing} onClick={() => handleProcess(true)}
                                style={{ borderColor: "var(--admin-border)", color: "var(--admin-muted-2)" }}>
                                <Upload size={14} className="mr-1" /> Supprimer fond
                            </Button>
                        </div>
                    )}
                    {processing && <p className="text-xs text-[var(--admin-accent)] animate-pulse">{processing}</p>}
                    {form.dpi !== null && (
                        <div className="flex items-center gap-2 text-xs px-3 py-2 rounded"
                            style={{
                                background: form.print_ready ? "#22C55E18" : "#F59E0B18",
                                border: `1px solid ${form.print_ready ? "#22C55E" : "#F59E0B40"}`,
                            }}>
                            {form.print_ready
                                ? <CheckCircle size={14} className="text-green-400" />
                                : <AlertCircle size={14} style={{ color: "#F59E0B" }} />}
                            <span style={{ color: form.print_ready ? "#22C55E" : "#F59E0B" }}>
                                {form.dpi} DPI —{" "}
                                {form.print_ready
                                    ? "Prêt pour impression"
                                    : "Résolution faible — utilisez « Upscale 300 DPI » ci-dessus"}
                            </span>
                            {processResult && (
                                <span className="ml-2 text-[var(--admin-muted-2)]">
                                    {processResult.bg_removed && "• fond supprimé "}
                                    {processResult.upscaled && "• upscalé"}
                                </span>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ── Étape 3 — Mockup Printful ────────────────────────────────────────────────
interface MPos { placement: string; scalePct: number; xOffsetPct: number; yOffsetPct: number; }
const PLACEMENTS = [
    { value: "front", label: "Devant" },
    { value: "back", label: "Dos" },
    { value: "sleeve_left", label: "Manche gauche" },
    { value: "sleeve_right", label: "Manche droite" },
];

function StepMockup({ form, setForm }: { form: FormData; setForm: (f: FormData) => void }) {
    const { data: products } = useListProductsQuery();
    const [generateMockup, { isLoading: isGenerating }] = useGenerateMockupMutation();
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [pos, setPos] = useState<MPos>({ placement: "front", scalePct: 80, xOffsetPct: 50, yOffsetPct: 38 });
    const [mockupPreview, setMockupPreview] = useState<string | null>(form.mockup_url ?? null);
    const [genError, setGenError] = useState<string | null>(null);

    const selectedProduct = products?.find((p) => p.id === selectedId);
    const CANVAS_W = 220, CANVAS_H = 300;
    const dSize = pos.scalePct / 100 * CANVAS_W;
    const dLeft = pos.xOffsetPct / 100 * CANVAS_W - dSize / 2;
    const dTop = pos.yOffsetPct / 100 * CANVAS_H - dSize / 2;

    const handleGenerate = async () => {
        if (!selectedProduct?.printful_catalog_product_id || !form.image_url) return;
        setGenError(null);
        const AREA_W = 1800, AREA_H = 2400;
        const dW = Math.round(pos.scalePct / 100 * AREA_W);
        const dH = dW;
        const posLeft = Math.max(0, Math.round(pos.xOffsetPct / 100 * AREA_W - dW / 2));
        const posTop = Math.max(0, Math.round(pos.yOffsetPct / 100 * AREA_H - dH / 2));
        try {
            const res = await generateMockup({
                printful_catalog_product_id: selectedProduct.printful_catalog_product_id,
                variant_id: parseInt(selectedProduct.printful_variant_id),
                design_url: form.image_url,
                placement: pos.placement,
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
                printful_variant_id: selectedProduct.printful_variant_id,
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
                    {selectedProduct?.image_url && (
                        <img src={selectedProduct.image_url} alt="" className="w-full h-full object-contain" />
                    )}
                    {!selectedProduct && (
                        <div className="w-full h-full flex items-center justify-center text-xs text-center px-2" style={{ color: "var(--admin-muted-2)" }}>
                            Choisir un produit pour voir l'aperçu
                        </div>
                    )}
                    {form.image_url && (
                        <img src={form.image_url} alt="design" className="absolute pointer-events-none"
                            style={{ width: dSize, height: dSize, left: dLeft, top: dTop, objectFit: "contain", opacity: 0.85 }} />
                    )}
                    {/* Indicateur de zone impression */}
                    <div className="absolute inset-0 border-2 border-dashed pointer-events-none"
                        style={{ borderColor: "rgba(255,107,0,0.25)", margin: "12px" }} />
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
                                {PLACEMENTS.map((p) => <SelectItem key={p.value} value={p.value} className="text-white text-xs">{p.label}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    {[
                        { label: `Taille : ${pos.scalePct}%`, key: "scalePct" as const, min: 10, max: 150 },
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
                    disabled={!selectedProduct?.printful_catalog_product_id || !form.image_url || isGenerating}
                    onClick={handleGenerate}
                    size="sm"
                    style={{ background: isGenerating ? "var(--admin-border)" : "var(--admin-accent)", color: "white" }}>
                    {isGenerating ? "Génération en cours…" : "Générer l'aperçu Printful ↗"}
                </Button>
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
        { label: "Printful Variant ID", value: form.printful_variant_id },
        { label: "Prix", value: `${parseFloat(form.price || "0").toFixed(2)} €` },
        { label: "DPI", value: form.dpi ? `${form.dpi} DPI` : "—" },
        {
            label: "Prêt pour impression", value: form.dpi ? (form.print_ready ? "✓ Oui" : "✗ Non (< 300 DPI)") : "—",
            color: form.print_ready ? "#22C55E" : form.dpi !== null ? "#EF4444" : undefined
        },
        { label: "Mockup généré", value: form.mockup_url ? "✓ Oui" : "Non", color: form.mockup_url ? "#22C55E" : undefined },
        { label: "Emplacement", value: form.placement_json ? (JSON.parse(form.placement_json).placement ?? "—") : "—" },
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
        printful_variant_id: initial?.printful_variant_id ?? "",
        price: initial ? String(initial.price) : "",
        image_url: initial?.image_url ?? null,
        dpi: null, print_ready: false,
        printful_catalog_product_id: initial?.printful_catalog_product_id ?? null,
        design_url: initial?.design_url ?? null,
        mockup_url: initial?.mockup_url ?? null,
        placement_json: initial?.placement_json ?? null,
    });
    const [createProduct, { isLoading: creating }] = useCreateProductMutation();
    const [updateProduct, { isLoading: updating }] = useUpdateProductMutation();

    const step1Valid = form.name.trim().length > 0 && form.printful_variant_id.trim().length > 0 && parseFloat(form.price) > 0;

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
                    printful_variant_id: form.printful_variant_id,
                    design_price_ht: parseFloat(form.price) || 0,
                    printful_cost_ht: 0, shop_margin_rate: 0.30, tva_rate: 0.20,
                    image_url: form.image_url,
                    design_url: form.design_url,
                    mockup_url: form.mockup_url,
                    placement_json: form.placement_json,
                    printful_catalog_product_id: form.printful_catalog_product_id,
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
    const [syncResult, setSyncResult] = useState<{ synced: number; updated: number } | null>(null);
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
            p.printful_variant_id.toLowerCase().includes(q) ||
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
                            ✓ {syncResult.synced} créés, {syncResult.updated} mis à jour
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
                            {["ID", "Image", "Nom", "Catégorie", "Variant ID", "Prix vente TTC", "Coût Printful HT", "Marge", ""].map((h) => (
                                <TableHead key={h} className={`text-[var(--admin-muted-2)] text-xs${h === "" ? " text-right" : ""}`}>{h}</TableHead>
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
                            <TableRow key={p.id} style={{ borderColor: "var(--admin-border)" }} className="hover:bg-white/5">
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
                                <TableCell className="font-mono text-[var(--admin-muted-2)] text-xs">{p.printful_variant_id}</TableCell>
                                <TableCell className="text-white text-sm">
                                    <InlinePriceCell product={p} onSave={(val) => updateProduct({ id: p.id, design_price_ht: val })} />
                                </TableCell>
                                <TableCell className="text-[var(--admin-muted-2)] text-sm">
                                    {p.printful_cost_ht.toFixed(2)} €
                                </TableCell>
                                <TableCell className="text-sm">
                                    <span className="px-2 py-0.5 rounded text-xs font-mono"
                                        style={{ background: "var(--admin-card)", border: "1px solid var(--admin-border)", color: "#22C55E" }}>
                                        {(p.shop_margin_rate * 100).toFixed(0)} %
                                    </span>
                                </TableCell>
                                <TableCell className="text-right">
                                    <div className="flex items-center justify-end gap-1">
                                        <button onClick={() => openEdit(p)}
                                            className="p-1.5 rounded hover:bg-white/10 text-[var(--admin-muted-2)] hover:text-white transition-colors"
                                            title="Modifier"><Edit size={14} /></button>
                                        <button onClick={() => setDeleteTarget(p)}
                                            className="p-1.5 rounded hover:bg-red-500/20 text-[var(--admin-muted-2)] hover:text-red-400 transition-colors"
                                            title="Supprimer"><Trash2 size={14} /></button>
                                    </div>
                                </TableCell>
                            </TableRow>
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
