"use client";
import { useState, useMemo, useRef } from "react";
import {
    useListProductsQuery,
    useCreateProductMutation,
    useUpdateProductMutation,
    useDeleteProductMutation,
    useUploadCatalogueImageMutation,
    useProcessCatalogueImageMutation,
    type ProductOut,
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
import { Edit, Trash2, Plus, Upload, CheckCircle, AlertCircle, ImageIcon } from "lucide-react";

type Step = 1 | 2 | 3;

interface FormData {
    name: string;
    category: string;
    printful_variant_id: string;
    price: string;
    image_url: string | null;
    dpi: number | null;
    print_ready: boolean;
}

const EMPTY_FORM: FormData = {
    name: "", category: "", printful_variant_id: "", price: "",
    image_url: null, dpi: null, print_ready: false,
};

const CATEGORIES = ["T-Shirt", "Hoodie", "Mug", "Poster", "Sticker", "Pad", "Autre"];

// ── Inline prix ─────────────────────────────────────────────────────────────
function InlinePriceCell({ product, onSave }: { product: ProductOut; onSave: (p: number) => void }) {
    const [editing, setEditing] = useState(false);
    const [val, setVal] = useState(String(product.price));
    const commit = () => {
        const n = parseFloat(val);
        if (!isNaN(n) && n > 0) onSave(n);
        setEditing(false);
    };
    if (editing) return (
        <Input type="number" step="0.01" min="0" value={val} autoFocus
            className="h-7 w-24 text-xs"
            style={{ background: "var(--admin-card)", border: "1px solid var(--admin-accent)", color: "white" }}
            onChange={(e) => setVal(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") setEditing(false); }} />
    );
    return (
        <span className="cursor-pointer hover:text-[var(--admin-accent)] transition-colors"
            title="Cliquer pour éditer" onClick={() => setEditing(true)}>
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
    const [uploadImage] = useUploadCatalogueImageMutation();
    const [processImage] = useProcessCatalogueImageMutation();
    const [processing, setProcessing] = useState<string | null>(null);
    const [processResult, setProcessResult] = useState<ImageProcessResult | null>(null);

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

    return (
        <div className="space-y-4">
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
                    style={{ background: form.print_ready ? "#22C55E18" : "#EF444418", border: `1px solid ${form.print_ready ? "#22C55E" : "#EF4444"}` }}>
                    {form.print_ready ? <CheckCircle size={14} className="text-green-400" /> : <AlertCircle size={14} className="text-red-400" />}
                    <span style={{ color: form.print_ready ? "#22C55E" : "#EF4444" }}>
                        {form.dpi} DPI — {form.print_ready ? "Prêt pour impression" : "Résolution insuffisante (min 300 DPI)"}
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
    );
}

// ── Étape 3 — Validation ────────────────────────────────────────────────────
function StepValidation({ form }: { form: FormData }) {
    const rows = [
        { label: "Nom", value: form.name },
        { label: "Catégorie", value: form.category || "—" },
        { label: "Printful Variant ID", value: form.printful_variant_id },
        { label: "Prix", value: `${parseFloat(form.price || "0").toFixed(2)} €` },
        { label: "Image", value: form.image_url ? "Uploadée" : "Non renseignée" },
        { label: "DPI", value: form.dpi ? `${form.dpi} DPI` : "—" },
        {
            label: "Prêt pour impression", value: form.dpi ? (form.print_ready ? "✓ Oui" : "✗ Non (< 300 DPI)") : "—",
            color: form.print_ready ? "#22C55E" : form.dpi !== null ? "#EF4444" : undefined
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
            {form.image_url && (
                <div className="flex justify-center pt-2">
                    <img src={form.image_url} alt="" className="h-24 object-contain rounded"
                        style={{ border: "1px solid var(--admin-border)" }} />
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
    });
    const [createProduct, { isLoading: creating }] = useCreateProductMutation();
    const [updateProduct, { isLoading: updating }] = useUpdateProductMutation();

    const step1Valid = form.name.trim().length > 0 && form.printful_variant_id.trim().length > 0 && parseFloat(form.price) > 0;

    const handleSubmit = async () => {
        try {
            if (isEdit && initial) {
                await updateProduct({
                    id: initial.id, name: form.name, category: form.category || null,
                    price: parseFloat(form.price), image_url: form.image_url
                }).unwrap();
            } else {
                await createProduct({
                    name: form.name, category: form.category || null,
                    printful_variant_id: form.printful_variant_id, price: parseFloat(form.price),
                    image_url: form.image_url
                }).unwrap();
            }
            onClose();
        } catch { /* ignore */ }
    };

    const stepLabels = ["Informations", "Image", "Validation"];

    return (
        <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
            <DialogContent className="max-w-lg"
                style={{ background: "var(--admin-sidebar)", border: "1px solid var(--admin-border)" }}>
                <DialogHeader>
                    <DialogTitle className="text-white">{isEdit ? "Modifier le produit" : "Nouveau produit"}</DialogTitle>
                </DialogHeader>
                {/* Indicateur d'étapes */}
                <div className="flex items-center gap-2 mb-4">
                    {stepLabels.map((label, i) => {
                        const n = (i + 1) as Step;
                        const active = n === step, done = n < step;
                        return (
                            <div key={n} className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                                    style={{
                                        background: active ? "var(--admin-accent)" : done ? "#22C55E" : "var(--admin-border)",
                                        color: (active || done) ? "white" : "var(--admin-muted-2)"
                                    }}>
                                    {done ? "✓" : n}
                                </div>
                                <span className="text-xs" style={{ color: active ? "white" : "var(--admin-muted-2)" }}>{label}</span>
                                {i < 2 && <div className="flex-1 h-px w-6" style={{ background: "var(--admin-border)" }} />}
                            </div>
                        );
                    })}
                </div>
                <div className="min-h-[280px]">
                    {step === 1 && <StepInfos form={form} setForm={setForm} />}
                    {step === 2 && <StepImage form={form} setForm={setForm} />}
                    {step === 3 && <StepValidation form={form} />}
                </div>
                <DialogFooter className="flex justify-between gap-2 mt-4">
                    <Button variant="ghost" size="sm"
                        onClick={() => step > 1 ? setStep((s) => (s - 1) as Step) : onClose()}
                        style={{ color: "var(--admin-muted-2)" }}>
                        {step > 1 ? "← Retour" : "Annuler"}
                    </Button>
                    {step < 3 ? (
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
    const [search, setSearch] = useState("");
    const [modalOpen, setModalOpen] = useState(false);
    const [editTarget, setEditTarget] = useState<ProductOut | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<ProductOut | null>(null);

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
                <Button size="sm" onClick={openCreate}
                    style={{ background: "var(--admin-accent)", color: "white" }}>
                    <Plus size={14} className="mr-1" /> Nouveau produit
                </Button>
            </div>

            {/* Table */}
            <div className="rounded-lg overflow-hidden"
                style={{ border: "1px solid var(--admin-border)", background: "var(--admin-card)" }}>
                <Table>
                    <TableHeader>
                        <TableRow style={{ borderColor: "var(--admin-border)" }}>
                            {["ID", "Image", "Nom", "Catégorie", "Variant ID", "Prix", ""].map((h) => (
                                <TableHead key={h} className={`text-[var(--admin-muted-2)] text-xs${h === "" ? " text-right" : ""}`}>{h}</TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <TableRow key={i} style={{ borderColor: "var(--admin-border)" }}>
                                    {Array.from({ length: 7 }).map((__, j) => (
                                        <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : filtered.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-10 text-[var(--admin-muted-2)] text-sm">
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
                                    <InlinePriceCell product={p} onSave={(price) => updateProduct({ id: p.id, price })} />
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
        </div>
    );
}
