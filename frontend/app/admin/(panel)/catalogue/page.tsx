"use client";
import { useRef, useState } from "react";
import {
    useListCatalogueQuery,
    useCreateCatalogueItemMutation,
    useUpdateCatalogueItemMutation,
    useDeleteCatalogueItemMutation,
    useUploadCatalogueImageMutation,
    useProcessCatalogueImageMutation,
    useListTagsQuery,
    type CatalogueItemOut,
    type CatalogueStatus,
    type ImageUploadResult,
    type ImageProcessResult,
    type TagOut,
} from "@/lib/adminEndpoints";

function TagPillSelector({ value, onChange }: { value: string; onChange: (v: string) => void }) {
    const { data: tags } = useListTagsQuery();
    if (!tags || tags.length === 0) return null;
    const selected = value ? value.split(",").map((s) => s.trim()).filter(Boolean) : [];
    function toggle(slug: string) {
        const next = selected.includes(slug) ? selected.filter((s) => s !== slug) : [...selected, slug];
        onChange(next.join(","));
    }
    return (
        <div>
            <label className="block text-xs text-[var(--admin-muted-2)] mb-2">Tags</label>
            <div className="flex flex-wrap gap-1.5">
                {tags.map((tag: TagOut) => {
                    const active = selected.includes(tag.slug);
                    return (
                        <button key={tag.id} type="button" onClick={() => toggle(tag.slug)}
                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold transition-all"
                            style={{
                                background: active ? tag.color + "40" : tag.color + "15",
                                color: tag.color,
                                border: `1px solid ${tag.color}${active ? "90" : "40"}`,
                                opacity: active ? 1 : 0.6,
                            }}>
                            {tag.name}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Pencil, Trash2, Plus, Upload, ImageIcon, Wand2, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
import { assetUrl } from "@/lib/utils";

const STATUS_LABEL: Record<CatalogueStatus, string> = {
    draft: "Brouillon",
    active: "En vente",
    archived: "Archivé",
};

const STATUS_COLOR: Record<CatalogueStatus, string> = {
    draft: "#6B7280",
    active: "#10B981",
    archived: "#F59E0B",
};

type FormData = {
    title: string;
    description: string;
    price: string;
    category: string;
    status: CatalogueStatus;
    printful_variant_id: string;
    tags: string;
    image_url: string;
};

const EMPTY: FormData = {
    title: "",
    description: "",
    price: "",
    category: "",
    status: "draft",
    printful_variant_id: "",
    tags: "",
    image_url: "",
};

export default function AdminCataloguePage() {
    const { data: items, isLoading } = useListCatalogueQuery({});
    const [createItem] = useCreateCatalogueItemMutation();
    const [updateItem] = useUpdateCatalogueItemMutation();
    const [deleteItem] = useDeleteCatalogueItemMutation();
    const [uploadImage] = useUploadCatalogueImageMutation();
    const [processImage] = useProcessCatalogueImageMutation();

    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<CatalogueItemOut | null>(null);
    const [form, setForm] = useState<FormData>(EMPTY);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [imgMeta, setImgMeta] = useState<ImageUploadResult | ImageProcessResult | null>(null);
    const [removeBg, setRemoveBg] = useState(false);
    const [upscale, setUpscale] = useState(true);
    const [vectorize, setVectorize] = useState(false);
    const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
    const fileRef = useRef<HTMLInputElement>(null);

    function openCreate() {
        setEditing(null);
        setForm(EMPTY);
        setImgMeta(null);
        setRemoveBg(false);
        setUpscale(true);
        setVectorize(false);
        setOpen(true);
    }

    function openEdit(item: CatalogueItemOut) {
        setEditing(item);
        setForm({
            title: item.title,
            description: item.description ?? "",
            price: String(item.price),
            category: item.category ?? "",
            status: item.status,
            printful_variant_id: item.printful_variant_id ?? "",
            tags: item.tags ?? "",
            image_url: item.image_url ?? "",
        });
        setImgMeta(null);
        setOpen(true);
    }

    async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        // Reset input pour permettre re-upload du meme fichier
        e.target.value = "";
        setUploading(true);
        setImgMeta(null);
        try {
            const fd = new FormData();
            fd.append("file", file);
            if (removeBg || upscale || vectorize) {
                fd.append("remove_bg", String(removeBg));
                fd.append("upscale", String(upscale));
                fd.append("vectorize", String(vectorize));
                const res = await processImage(fd).unwrap();
                setForm((f) => ({ ...f, image_url: res.url }));
                setImgMeta(res);
            } else {
                const res = await uploadImage(fd).unwrap();
                setForm((f) => ({ ...f, image_url: res.url }));
                setImgMeta(res);
            }
        } catch (err: unknown) {
            const msg = (err as { data?: { detail?: string } })?.data?.detail ?? "Erreur upload";
            alert(msg);
        } finally {
            setUploading(false);
        }
    }

    async function handleSave() {
        if (!form.title || !form.price) return;
        setSaving(true);
        try {
            const payload = {
                title: form.title,
                description: form.description || null,
                image_url: form.image_url || null,
                price: parseFloat(form.price),
                category: form.category || null,
                status: form.status,
                printful_variant_id: form.printful_variant_id || null,
                tags: form.tags || null,
            };
            if (editing) {
                await updateItem({ id: editing.id, ...payload }).unwrap();
            } else {
                await createItem(payload).unwrap();
            }
            setOpen(false);
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete(item: CatalogueItemOut) {
        if (confirm(`Supprimer "${item.title}" du catalogue ?`)) {
            await deleteItem(item.id);
        }
    }

    const field = (key: keyof FormData) => ({
        value: form[key],
        onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
            setForm((f) => ({ ...f, [key]: e.target.value })),
    });

    return (
        <>
            <div
                style={{
                    background: "var(--admin-card)",
                    border: "1px solid var(--admin-border)",
                }}
                className="rounded-xl overflow-hidden"
            >
                {/* Header */}
                <div
                    style={{ borderBottom: "1px solid var(--admin-border)" }}
                    className="px-6 py-4 flex items-center justify-between"
                >
                    <div>
                        <h2 className="text-white font-semibold">
                            Catalogue boutique{" "}
                            {items && (
                                <span className="text-[var(--admin-muted-2)] font-normal text-sm">
                                    ({items.length})
                                </span>
                            )}
                        </h2>
                        <p className="text-[var(--admin-muted-2)] text-xs mt-0.5">
                            Créations mises en vente sur la boutique publique
                        </p>
                    </div>
                    <button
                        onClick={openCreate}
                        style={{ background: "var(--admin-accent)" }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-black hover:opacity-90 transition"
                    >
                        <Plus size={13} /> Nouvelle création
                    </button>
                </div>

                {/* Table */}
                <Table>
                    <TableHeader>
                        <TableRow style={{ borderColor: "var(--admin-border)" }}>
                            <TableHead className="text-[var(--admin-muted-2)] w-12">
                                Visuel
                            </TableHead>
                            <TableHead className="text-[var(--admin-muted-2)]">Titre</TableHead>
                            <TableHead className="text-[var(--admin-muted-2)]">Catégorie</TableHead>
                            <TableHead className="text-[var(--admin-muted-2)]">Prix</TableHead>
                            <TableHead className="text-[var(--admin-muted-2)]">Statut</TableHead>
                            <TableHead className="text-[var(--admin-muted-2)]">Tags</TableHead>
                            <TableHead className="text-[var(--admin-muted-2)]" />
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading
                            ? Array.from({ length: 3 }).map((_, i) => (
                                <TableRow
                                    key={i}
                                    style={{ borderColor: "var(--admin-border)" }}
                                >
                                    {Array.from({ length: 7 }).map((_, j) => (
                                        <TableCell key={j}>
                                            <Skeleton className="h-4 w-full" />
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                            : (items ?? []).length === 0
                                ? (
                                    <TableRow style={{ borderColor: "var(--admin-border)" }}>
                                        <TableCell
                                            colSpan={7}
                                            className="text-center py-16 text-[var(--admin-muted-2)] text-sm"
                                        >
                                            Aucune création dans le catalogue.{" "}
                                            <button
                                                onClick={openCreate}
                                                className="underline text-[var(--admin-accent)] hover:opacity-80"
                                            >
                                                Ajouter la première
                                            </button>
                                        </TableCell>
                                    </TableRow>
                                )
                                : items?.map((item: CatalogueItemOut) => (
                                    <TableRow
                                        key={item.id}
                                        style={{ borderColor: "var(--admin-border)" }}
                                        className="hover:bg-white/5 transition-colors"
                                    >
                                        {/* Visuel */}
                                        <TableCell>
                                            {item.image_url ? (
                                                <button
                                                    type="button"
                                                    className="w-10 h-10 rounded overflow-hidden block hover:ring-2 hover:ring-[var(--admin-accent)] transition"
                                                    onClick={() => setLightboxUrl(assetUrl(item.image_url))}
                                                    title="Voir en grand"
                                                >
                                                    <img
                                                        src={assetUrl(item.image_url)}
                                                        alt={item.title}
                                                        className="w-full h-full object-cover"
                                                    />
                                                </button>
                                            ) : (
                                                <div
                                                    style={{ border: "1px solid var(--admin-border)" }}
                                                    className="w-10 h-10 rounded flex items-center justify-center"
                                                >
                                                    <ImageIcon
                                                        size={14}
                                                        className="text-[var(--admin-muted)]"
                                                    />
                                                </div>
                                            )}
                                        </TableCell>
                                        {/* Titre */}
                                        <TableCell className="text-white text-sm font-medium">
                                            {item.title}
                                            {item.description && (
                                                <p className="text-[var(--admin-muted-2)] text-xs font-normal truncate max-w-48 mt-0.5">
                                                    {item.description}
                                                </p>
                                            )}
                                        </TableCell>
                                        {/* Catégorie */}
                                        <TableCell className="text-[var(--admin-muted-2)] text-sm">
                                            {item.category ?? "—"}
                                        </TableCell>
                                        {/* Prix */}
                                        <TableCell className="text-white text-sm font-mono">
                                            {item.price.toFixed(2)} €
                                        </TableCell>
                                        {/* Statut */}
                                        <TableCell>
                                            <span
                                                style={{
                                                    color: STATUS_COLOR[item.status],
                                                    background: STATUS_COLOR[item.status] + "20",
                                                    borderColor: STATUS_COLOR[item.status] + "40",
                                                }}
                                                className="inline-block text-xs font-mono px-2 py-0.5 rounded border"
                                            >
                                                {STATUS_LABEL[item.status]}
                                            </span>
                                        </TableCell>
                                        {/* Tags */}
                                        <TableCell className="text-[var(--admin-muted-2)] text-xs font-mono">
                                            {item.tags ?? "—"}
                                        </TableCell>
                                        {/* Actions */}
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => openEdit(item)}
                                                    className="text-[var(--admin-muted)] hover:text-white transition-colors"
                                                    title="Modifier"
                                                >
                                                    <Pencil size={13} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(item)}
                                                    className="text-[var(--admin-muted)] hover:text-red-400 transition-colors"
                                                    title="Supprimer"
                                                >
                                                    <Trash2 size={13} />
                                                </button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                    </TableBody>
                </Table>
            </div>

            {/* Dialog création / édition */}
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent
                    style={{
                        background: "var(--admin-card)",
                        border: "1px solid var(--admin-border)",
                        maxHeight: "90vh",
                        overflowY: "auto",
                    }}
                    className="text-white max-w-lg"
                >
                    <DialogHeader>
                        <DialogTitle className="text-white">
                            {editing ? "Modifier la création" : "Nouvelle création"}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 mt-2">
                        {/* Upload image + pipeline */}
                        <div
                            style={{ border: "1px solid var(--admin-border)", background: "var(--admin-sidebar)" }}
                            className="rounded-lg p-3 space-y-3"
                        >
                            <p className="text-xs font-mono uppercase tracking-widest text-[var(--admin-muted-2)]">
                                Image du design
                            </p>

                            {/* Prévisualisation */}
                            <div className="flex items-start gap-3">
                                <div className="shrink-0">
                                    {form.image_url ? (
                                        <div className="w-24 h-24 rounded overflow-hidden"
                                            style={{ background: "repeating-conic-gradient(#b0b0b0 0% 25%, #e8e8e8 0% 50%) 0 0 / 12px 12px" }}>
                                            <img
                                                src={assetUrl(form.image_url)}
                                                alt="Aperçu"
                                                className="w-full h-full object-contain"
                                                onError={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = "0.3"; }}
                                            />
                                        </div>
                                    ) : (
                                        <div
                                            style={{ border: "2px dashed var(--admin-border)" }}
                                            className="w-24 h-24 rounded flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-[var(--admin-accent)] transition-colors"
                                            onClick={() => fileRef.current?.click()}
                                        >
                                            <Upload size={18} className="text-[var(--admin-muted)]" />
                                            <span className="text-[9px] text-[var(--admin-muted)] uppercase tracking-wide text-center">
                                                Clic pour<br />importer
                                            </span>
                                        </div>
                                    )}
                                </div>

                                <div className="flex-1 space-y-2">
                                    {/* Métadonnées après upload */}
                                    {imgMeta && (
                                        <div
                                            style={{ border: `1px solid ${imgMeta.print_ready ? "#10B98140" : "#F59E0B40"}`, background: `${imgMeta.print_ready ? "#10B981" : "#F59E0B"}10` }}
                                            className="rounded p-2 space-y-0.5"
                                        >
                                            <div className="flex items-center gap-1.5">
                                                {imgMeta.print_ready
                                                    ? <CheckCircle2 size={12} className="text-emerald-400 shrink-0" />
                                                    : <AlertCircle size={12} className="text-amber-400 shrink-0" />
                                                }
                                                <span className={`text-xs font-mono font-semibold ${imgMeta.print_ready ? "text-emerald-400" : "text-amber-400"}`}>
                                                    {imgMeta.print_ready ? "PRINT READY" : "DPI INSUFFISANT"}
                                                </span>
                                            </div>
                                            <p className="text-[11px] text-[var(--admin-muted-2)] font-mono">
                                                {imgMeta.width}×{imgMeta.height}px · {imgMeta.dpi} DPI
                                                {"upscaled" in imgMeta && imgMeta.upscaled && " · UPSCALÉ"}
                                                {"bg_removed" in imgMeta && imgMeta.bg_removed && " · FOND SUPPRIMÉ"}
                                                {"vectorized" in imgMeta && imgMeta.vectorized && " · SVG"}
                                            </p>
                                        </div>
                                    )}

                                    {/* Options pipeline */}
                                    <div className="space-y-1.5">
                                        <label className="flex items-center gap-2 cursor-pointer group">
                                            <input
                                                type="checkbox"
                                                checked={upscale}
                                                onChange={(e) => setUpscale(e.target.checked)}
                                                className="w-3.5 h-3.5 accent-[var(--admin-accent)]"
                                            />
                                            <span className="text-xs text-[var(--admin-muted-2)] group-hover:text-white transition-colors">
                                                Correction taille / DPI → 300 dpi
                                            </span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer group">
                                            <input
                                                type="checkbox"
                                                checked={removeBg}
                                                onChange={(e) => setRemoveBg(e.target.checked)}
                                                className="w-3.5 h-3.5 accent-[var(--admin-accent)]"
                                            />
                                            <span className="text-xs text-[var(--admin-muted-2)] group-hover:text-white transition-colors">
                                                Suppression arrière-plan
                                                <span className="ml-1 text-[10px] text-[var(--admin-muted)] font-mono">(rembg)</span>
                                            </span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer group">
                                            <input
                                                type="checkbox"
                                                checked={vectorize}
                                                onChange={(e) => setVectorize(e.target.checked)}
                                                className="w-3.5 h-3.5 accent-[var(--admin-accent)]"
                                            />
                                            <span className="text-xs text-[var(--admin-muted-2)] group-hover:text-white transition-colors">
                                                Vectorisation SVG
                                                <span className="ml-1 text-[10px] text-[var(--admin-muted)] font-mono">(vtracer)</span>
                                            </span>
                                        </label>
                                    </div>

                                    {/* Boutons */}
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <button
                                            type="button"
                                            onClick={() => fileRef.current?.click()}
                                            disabled={uploading}
                                            style={{ background: "var(--admin-accent)" }}
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold text-black hover:opacity-90 transition disabled:opacity-50"
                                        >
                                            {uploading
                                                ? <><Loader2 size={11} className="animate-spin" /> Traitement…</>
                                                : <><Wand2 size={11} /> {form.image_url ? "Remplacer" : "Importer et traiter"}</>
                                            }
                                        </button>
                                        {form.image_url && (
                                            <button
                                                type="button"
                                                onClick={() => { setForm((f) => ({ ...f, image_url: "" })); setImgMeta(null); }}
                                                className="text-xs text-[var(--admin-muted)] hover:text-red-400 transition"
                                            >
                                                Retirer
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <input
                                ref={fileRef}
                                type="file"
                                accept="image/jpeg,image/png,image/webp,image/gif"
                                className="hidden"
                                onChange={handleImageUpload}
                            />
                        </div>

                        {/* Titre */}
                        <div>
                            <label className="block text-xs text-[var(--admin-muted-2)] mb-1">
                                Titre <span className="text-red-400">*</span>
                            </label>
                            <input
                                type="text"
                                {...field("title")}
                                placeholder="Neural Glitch Tee v1"
                                style={{
                                    background: "var(--admin-sidebar)",
                                    border: "1px solid var(--admin-border)",
                                    color: "white",
                                }}
                                className="w-full px-3 py-2 rounded-md text-sm outline-none focus:ring-2 focus:ring-[var(--admin-accent)]"
                            />
                        </div>

                        {/* Description */}
                        <div>
                            <label className="block text-xs text-[var(--admin-muted-2)] mb-1">
                                Description
                            </label>
                            <textarea
                                {...field("description")}
                                rows={3}
                                placeholder="Un design qui juge ton architecture..."
                                style={{
                                    background: "var(--admin-sidebar)",
                                    border: "1px solid var(--admin-border)",
                                    color: "white",
                                    resize: "vertical",
                                }}
                                className="w-full px-3 py-2 rounded-md text-sm outline-none focus:ring-2 focus:ring-[var(--admin-accent)]"
                            />
                        </div>

                        {/* Prix + Catégorie */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs text-[var(--admin-muted-2)] mb-1">
                                    Prix (€) <span className="text-red-400">*</span>
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    {...field("price")}
                                    placeholder="29.90"
                                    style={{
                                        background: "var(--admin-sidebar)",
                                        border: "1px solid var(--admin-border)",
                                        color: "white",
                                    }}
                                    className="w-full px-3 py-2 rounded-md text-sm outline-none focus:ring-2 focus:ring-[var(--admin-accent)]"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-[var(--admin-muted-2)] mb-1">
                                    Catégorie
                                </label>
                                <input
                                    type="text"
                                    {...field("category")}
                                    placeholder="t-shirt"
                                    style={{
                                        background: "var(--admin-sidebar)",
                                        border: "1px solid var(--admin-border)",
                                        color: "white",
                                    }}
                                    className="w-full px-3 py-2 rounded-md text-sm outline-none focus:ring-2 focus:ring-[var(--admin-accent)]"
                                />
                            </div>
                        </div>

                        {/* Statut */}
                        <div>
                            <label className="block text-xs text-[var(--admin-muted-2)] mb-1">
                                Statut
                            </label>
                            <Select
                                value={form.status}
                                onValueChange={(v) =>
                                    setForm((f) => ({ ...f, status: v as CatalogueStatus }))
                                }
                            >
                                <SelectTrigger
                                    style={{
                                        background: "var(--admin-sidebar)",
                                        border: "1px solid var(--admin-border)",
                                        color: "white",
                                    }}
                                    className="w-full"
                                >
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent
                                    style={{
                                        background: "var(--admin-card)",
                                        border: "1px solid var(--admin-border)",
                                    }}
                                >
                                    <SelectItem value="draft">Brouillon</SelectItem>
                                    <SelectItem value="active">En vente</SelectItem>
                                    <SelectItem value="archived">Archivé</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Tags — sélecteur pills */}
                        <TagPillSelector
                            value={form.tags}
                            onChange={(v) => setForm((f) => ({ ...f, tags: v }))}
                        />

                        {/* Printful Variant ID */}
                        <div>
                            <label className="block text-xs text-[var(--admin-muted-2)] mb-1">
                                Printful Variant ID{" "}
                                <span className="text-[var(--admin-muted)] font-normal">
                                    (optionnel)
                                </span>
                            </label>
                            <input
                                type="text"
                                {...field("printful_variant_id")}
                                placeholder="12345"
                                style={{
                                    background: "var(--admin-sidebar)",
                                    border: "1px solid var(--admin-border)",
                                    color: "white",
                                }}
                                className="w-full px-3 py-2 rounded-md text-sm outline-none focus:ring-2 focus:ring-[var(--admin-accent)]"
                            />
                        </div>

                        <button
                            onClick={handleSave}
                            disabled={saving || !form.title || !form.price}
                            style={{ background: "var(--admin-accent)" }}
                            className="w-full py-2 rounded-md text-sm font-semibold text-black hover:opacity-90 disabled:opacity-50 transition mt-1"
                        >
                            {saving ? "Enregistrement…" : editing ? "Mettre à jour" : "Ajouter au catalogue"}
                        </button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Lightbox */}
            {lightboxUrl && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center"
                    style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(6px)" }}
                    onClick={() => setLightboxUrl(null)}
                >
                    <div
                        className="relative max-w-[90vw] max-h-[90vh] rounded-lg overflow-hidden"
                        style={{ background: "repeating-conic-gradient(#555 0% 25%, #333 0% 50%) 0 0 / 16px 16px" }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <img
                            src={lightboxUrl}
                            alt="Aperçu grand format"
                            className="block max-w-[90vw] max-h-[90vh] object-contain"
                        />
                        <button
                            type="button"
                            onClick={() => setLightboxUrl(null)}
                            className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center text-white hover:bg-white/20 transition font-mono text-sm"
                            style={{ background: "rgba(0,0,0,0.6)" }}
                        >
                            ✕
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}
